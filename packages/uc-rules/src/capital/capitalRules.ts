import { addMoney, createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { CapitalAssessmentArtifact, CapitalAssetDecision } from "../artifacts/types"

export const capitalAssessmentRule: PolicyRule<ReducedAssessmentPeriodState, CapitalAssessmentArtifact> = {
  ruleId: "CAPITAL-ASSESS-001",
  ruleVersion: "2026.1.0",
  title: "Assess capital and tariff income",
  stage: "capital",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_CAPITAL_2026],
  outputSchemaVersion: "capital-assessment.v1",
  evaluate: (input, context) => {
    const unsupportedCases: UnsupportedCase[] = []
    const assetBreakdown: CapitalAssetDecision[] = input.capitalAtApEnd.map((asset) => {
      const isMainHome = asset.type === "property_main_home"
      const isChildSavings = asset.type === "child_savings"
      const isBusinessAsset = asset.type === "business_asset"
      const isCompensation = asset.type === "compensation"
      const isHomeSaleProceeds = asset.type === "home_sale_proceeds"
      const disregardActive = Boolean(asset.disregard && asset.disregard.effectiveFrom <= context.assessmentPeriod.endDate && (!asset.disregard.effectiveTo || asset.disregard.effectiveTo >= context.assessmentPeriod.endDate))
      const disregardExpired = Boolean(asset.disregard?.effectiveTo && asset.disregard.effectiveTo < context.assessmentPeriod.endDate)
      if (asset.type === "other" && asset.value.amountPence > 0) {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "UNKNOWN_CAPITAL_ASSET",
          severity: "blocking",
          reason: "Capital asset type is unknown and could affect entitlement.",
          affectedStages: ["capital", "eligibility", "award_composition"],
          userMessage: "This capital asset needs to be classified before the assessment can continue.",
          internalNotes: `assetId=${asset.assetId}`
        })
      }
      if (asset.deprivationFlag && !asset.notionalCapitalDecisionRef) {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "DEPRIVATION_DECISION_REQUIRED",
          severity: "blocking",
          reason: "Possible deprivation of capital needs a notional-capital decision before calculation.",
          affectedStages: ["capital", "eligibility", "award_composition"],
          userMessage: "Capital cannot be assessed until the deprivation/notional-capital decision is known.",
          internalNotes: `assetId=${asset.assetId}`
        })
      }
      if (asset.value.amountPence > 0 && asset.valuationConfidence === "unknown") {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "CAPITAL_VALUATION_UNKNOWN",
          severity: "blocking",
          reason: "A material capital asset has unknown valuation confidence.",
          affectedStages: ["capital", "eligibility", "award_composition"],
          userMessage: "This capital value must be confirmed before a safe estimate can be produced.",
          internalNotes: `assetId=${asset.assetId}`
        })
      }
      const automaticallyDisregarded = isMainHome || isChildSavings || isBusinessAsset || isCompensation || isHomeSaleProceeds
      const disregarded = automaticallyDisregarded || disregardActive ? asset.value : zeroGbp()
      return {
        assetId: asset.assetId,
        declaredValue: asset.value,
        disregardedValue: disregarded,
        assessableValue: gbp(Math.max(0, asset.value.amountPence - disregarded.amountPence)),
        reason: disregarded.amountPence > 0 ? disregardExpired ? "disregard_expired_but_asset_category_excluded" : "disregarded" : "assessable"
      }
    })

    const totalDeclaredCapital = addMoney(...assetBreakdown.map((asset) => asset.declaredValue))
    const totalDisregardedCapital = addMoney(...assetBreakdown.map((asset) => asset.disregardedValue))
    const totalAssessableCapital = addMoney(...assetBreakdown.map((asset) => asset.assessableValue))
    const capitalRates = context.ratePack.rates.capital
    const lower = typeof capitalRates.lowerThreshold === "object" ? capitalRates.lowerThreshold.amountPence : 600000
    const upper = typeof capitalRates.upperThreshold === "object" ? capitalRates.upperThreshold.amountPence : 1600000
    const bandSize = typeof capitalRates.bandSizePence === "number" ? capitalRates.bandSizePence : 25000
    const tariffPerBand = typeof capitalRates.tariffIncomePerBand === "object" ? capitalRates.tariffIncomePerBand.amountPence : 435
    const amountAboveLower = Math.max(0, Math.min(totalAssessableCapital.amountPence, upper) - lower)
    const tariffIncome = amountAboveLower > 0 ? gbp(Math.ceil(amountAboveLower / bandSize) * tariffPerBand) : zeroGbp()

    const artifact: CapitalAssessmentArtifact = {
      totalDeclaredCapital,
      totalDisregardedCapital,
      totalAssessableCapital,
      tariffIncome,
      eligibilityStatus: totalAssessableCapital.amountPence > upper ? "ineligible" : unsupportedCases.length ? "unknown" : "eligible",
      assetBreakdown,
      expiringDisregards: input.capitalAssets.filter((asset) => asset.disregard?.effectiveTo).map((asset) => asset.assetId)
    }

    return {
      ruleId: "CAPITAL-ASSESS-001",
      ruleVersion: "2026.1.0",
      status: unsupportedCases.length ? "unsupported" : artifact.eligibilityStatus === "ineligible" ? "failed" : "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "CAPITAL-ASSESS-001",
        ruleVersion: "2026.1.0",
        stage: "capital",
        legalBasis: [universalCreditReferences.GOV_UK_UC_CAPITAL_2026],
        inputsHash: stableHash(input.capitalAssets),
        inputExcerpt: { assetCount: input.capitalAssets.length },
        output: artifact,
        evidenceRefs: input.capitalAssets.flatMap((asset) => asset.evidenceRefs),
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [{ artifactType: "capital_assessment", schemaVersion: "capital-assessment.v1", value: artifact }]
    }
  }
}
