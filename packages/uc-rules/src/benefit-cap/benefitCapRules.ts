import { addMoney, createEntityId, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { BenefitCapArtifact, HealthCarerArtifact, IncomeAggregationArtifact } from "../artifacts/types"

export const benefitCapRule: PolicyRule<ReducedAssessmentPeriodState, BenefitCapArtifact> = {
  ruleId: "BENEFIT-CAP-001",
  ruleVersion: "2026.2.0",
  title: "Detect and apply benefit cap",
  stage: "benefit_cap",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "INCOME-AGGREGATE-001" }, { ruleId: "HEALTH-CARER-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_BENEFIT_CAP_2026],
  outputSchemaVersion: "benefit-cap-artifact.v1",
  evaluate: (input, context) => {
    const income = findDerived<IncomeAggregationArtifact>(context, "income_aggregation")
    const healthCarer = findDerived<HealthCarerArtifact>(context, "health_carer_determination")
    const benefitCapState = (input as unknown as { benefitCapState?: { geography?: "london" | "outside_london"; exempt?: boolean } }).benefitCapState
    const earningsThreshold = context.ratePack.rates.benefitCap.earningsExemptionThreshold
    const exemptByEarnings = income && typeof earningsThreshold === "object" && income.earnedIncome.amountPence >= earningsThreshold.amountPence
    const exemptByDisabilityOrCarer = Boolean(healthCarer && (healthCarer.lcwraElement.amountPence > 0 || healthCarer.carerQualified))
    const exempt = benefitCapState?.exempt === true || exemptByEarnings || exemptByDisabilityOrCarer
    const capRates = context.ratePack.rates.benefitCap
    const hasChildren = input.children.length > 0
    const hasPartner = input.adults.some((adult) => adult.role === "partner")
    const london = benefitCapState?.geography === "london"
    const cap = london
      ? hasChildren || hasPartner ? capRates.monthlyLondonCoupleOrParent : capRates.monthlyLondonSingleNoChildren
      : hasChildren || hasPartner ? capRates.monthlyOutsideLondonCoupleOrParent : capRates.monthlyOutsideLondonSingleNoChildren
    const capAmount = typeof cap === "object" ? cap : undefined
    const unsupportedCases: UnsupportedCase[] = []
    const standardRates = context.ratePack.rates.standardAllowances
    const claimant = input.adults.find((adult) => adult.role === "claimant")
    const partner = input.adults.find((adult) => adult.role === "partner")
    const claimantAge = claimant ? ageAt(claimant.dateOfBirth, context.assessmentPeriod.startDate) : 25
    const partnerAge = partner ? ageAt(partner.dateOfBirth, context.assessmentPeriod.startDate) : undefined
    const standardAllowance = partner
      ? claimantAge < 25 && (partnerAge ?? 25) < 25 ? standardRates.coupleBothUnder25 : standardRates.coupleOneOrBoth25Plus
      : claimantAge < 25 ? standardRates.singleUnder25 : standardRates.single25Plus
    const possibleEntitlement = addMoney(
      standardAllowance && typeof standardAllowance === "object" ? standardAllowance : zeroGbp(),
      input.housing?.lhaMonthlyRate ?? zeroGbp()
    )
    const minimumRelevantCap = hasChildren || hasPartner
      ? capRates.monthlyOutsideLondonCoupleOrParent
      : capRates.monthlyOutsideLondonSingleNoChildren
    const capCouldApply = minimumRelevantCap && typeof minimumRelevantCap === "object" && possibleEntitlement.amountPence > minimumRelevantCap.amountPence
    if (!benefitCapState?.geography && !exempt && capCouldApply) {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "BENEFIT_CAP_GEOGRAPHY_UNKNOWN",
        severity: "blocking",
        reason: "Benefit cap geography is unknown and may affect the final award.",
        affectedStages: ["benefit_cap", "award_composition"],
        userMessage: "The benefit cap cannot be checked until London/outside-London status is known.",
        internalNotes: "missing benefitCapState.geography"
      })
    }
    const artifact: BenefitCapArtifact = {
      applies: !exempt,
      exempt,
      exemptionReasons: [exemptByEarnings ? "earnings" : "", exemptByDisabilityOrCarer ? "disability_or_carer" : "", benefitCapState?.exempt ? "declared_exempt" : ""].filter(Boolean),
      capAmount,
      reduction: zeroGbp()
    }
    return {
      ruleId: "BENEFIT-CAP-001",
      ruleVersion: "2026.2.0",
      status: unsupportedCases.length ? "unsupported" : "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "BENEFIT-CAP-001",
        ruleVersion: "2026.2.0",
        stage: "benefit_cap",
        legalBasis: [universalCreditReferences.GOV_UK_BENEFIT_CAP_2026],
        inputsHash: stableHash({ benefitCapState, income, healthCarer }),
        inputExcerpt: { exempt, geography: benefitCapState?.geography },
        output: artifact,
        evidenceRefs: [],
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [{ artifactType: "benefit_cap_assessment", schemaVersion: "benefit-cap-artifact.v1", value: artifact }]
    }
  }
}

function findDerived<T>(context: unknown, artifactType: string): T | undefined {
  const evaluations = (context as { evaluations?: Array<{ derivedArtifacts: Array<{ artifactType: string; value: unknown }> }> }).evaluations ?? []
  return evaluations.flatMap((evaluation) => evaluation.derivedArtifacts).find((artifact) => artifact.artifactType === artifactType)?.value as T | undefined
}

function ageAt(dateOfBirth: string, atDate: string) {
  const birth = new Date(dateOfBirth)
  const at = new Date(atDate)
  let age = at.getUTCFullYear() - birth.getUTCFullYear()
  const monthDelta = at.getUTCMonth() - birth.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}
