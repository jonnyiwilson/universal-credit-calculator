import { addMoney, createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { Assumption, ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { HousingDeterminationArtifact } from "../artifacts/types"

export const housingDeterminationRule: PolicyRule<ReducedAssessmentPeriodState, HousingDeterminationArtifact> = {
  ruleId: "HOUSING-DETERMINE-001",
  ruleVersion: "2026.1.0",
  title: "Determine Universal Credit housing route and element",
  stage: "housing",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_HOUSING_2026],
  outputSchemaVersion: "housing-determination.v1",
  evaluate: (input, context) => {
    const housing = input.housing
    const unsupportedCases: UnsupportedCase[] = []
    const assumptions: Assumption[] = []
    if (!housing || housing.tenure === "no_housing_costs") {
      const artifact: HousingDeterminationArtifact = {
        status: "not_applicable",
        route: "none",
        eligibleRent: zeroGbp(),
        eligibleServiceCharges: zeroGbp(),
        nonDependantDeductions: zeroGbp(),
        housingElement: zeroGbp(),
        assumptions: []
      }
      return response(input, artifact, assumptions, unsupportedCases)
    }

    if (housing.tenure === "temporary_accommodation" || housing.tenure === "specified_supported" || housing.tenure === "refuge") {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "HOUSING_ROUTE_REQUIRES_SEPARATE_ASSESSMENT",
        severity: "blocking",
        reason: "Housing route may not be payable through the Universal Credit housing element.",
        affectedStages: ["housing", "award_composition"],
        userMessage: "This accommodation type requires a separate housing route check before an award can be estimated.",
        internalNotes: `tenure=${housing.tenure}`
      })
    }

    if (housing.tenure === "owner_occupier") {
      const artifact: HousingDeterminationArtifact = {
        status: "partial",
        route: "smi_route",
        eligibleRent: zeroGbp(),
        eligibleServiceCharges: zeroGbp(),
        nonDependantDeductions: zeroGbp(),
        housingElement: zeroGbp(),
        assumptions: []
      }
      return response(input, artifact, assumptions, unsupportedCases)
    }

    if (housing.tenure === "private_rent" && !housing.brmaCode) {
      assumptions.push({
        assumptionId: createEntityId("assumption"),
        severity: "blocking",
        code: "BRMA_OR_LHA_MISSING",
        message: "Private rent needs BRMA/LHA details before the housing element can be safely estimated.",
        affectedRuleIds: ["HOUSING-DETERMINE-001"],
        canUserResolve: true,
        resolutionPrompt: "Enter the applicable BRMA/LHA category or confirm that housing should be excluded."
      })
    }

    if (housing.tenure === "social_rent" && (housing.bedroomEntitlement === undefined || housing.bedroomsOccupied === undefined)) {
      assumptions.push({
        assumptionId: createEntityId("assumption"),
        severity: "blocking",
        code: "SOCIAL_RENT_BEDROOM_DATA_MISSING",
        message: "Social rent needs bedroom entitlement and occupied bedroom count before under-occupancy can be assessed.",
        affectedRuleIds: ["HOUSING-DETERMINE-001"],
        canUserResolve: true,
        resolutionPrompt: "Enter bedroom entitlement and bedrooms occupied."
      })
    }
    if (housing.nonDependants.some((person) => !person.exemptFromDeduction && !person.incomeBand)) {
      assumptions.push({
        assumptionId: createEntityId("assumption"),
        severity: "blocking",
        code: "NON_DEPENDANT_STATUS_MISSING",
        message: "Non-dependant deduction status is incomplete.",
        affectedRuleIds: ["HOUSING-DETERMINE-001"],
        canUserResolve: true,
        resolutionPrompt: "Confirm each non-dependant's exemption or income band."
      })
    }

    const lhaCap = context.ratePack.rates.housing?.defaultLhaCapMonthly
    const cap = housing.tenure === "private_rent" && lhaCap && typeof lhaCap === "object" ? lhaCap : addMoney(housing.eligibleRent, housing.eligibleServiceCharges)
    const eligibleCosts = addMoney(housing.eligibleRent, housing.eligibleServiceCharges)
    const underOccupiedBedrooms = housing.tenure === "social_rent" ? Math.max(0, (housing.bedroomsOccupied ?? 0) - (housing.bedroomEntitlement ?? 0)) : 0
    const underOccupancyRate = underOccupiedBedrooms >= 2
      ? Number(context.ratePack.rates.housing.socialRentUnderOccupancyTwoPlusBedroomRate ?? 0.25)
      : underOccupiedBedrooms === 1
        ? Number(context.ratePack.rates.housing.socialRentUnderOccupancyOneBedroomRate ?? 0.14)
        : 0
    const socialRentReduction = gbp(eligibleCosts.amountPence * underOccupancyRate)
    const nonDependantRate = context.ratePack.rates.housing.defaultNonDependantDeduction
    const defaultNonDependantDeduction = nonDependantRate && typeof nonDependantRate === "object" ? nonDependantRate.amountPence : 0
    const nonDependantDeductions = gbp(housing.nonDependants.filter((person) => !person.exemptFromDeduction).length * defaultNonDependantDeduction)
    const cappedCosts = Math.min(eligibleCosts.amountPence, cap.amountPence)
    const housingElement = gbp(Math.max(0, cappedCosts - socialRentReduction.amountPence - nonDependantDeductions.amountPence))
    const artifact: HousingDeterminationArtifact = {
      status: unsupportedCases.length ? "unsupported" : assumptions.some((item) => item.severity === "blocking") ? "partial" : "determined",
      route: unsupportedCases.length ? "unsupported" : "uc_housing_costs",
      eligibleRent: housing.eligibleRent,
      eligibleServiceCharges: housing.eligibleServiceCharges,
      lhaCap: cap,
      bedroomEntitlement: housing.bedroomEntitlement,
      socialRentReduction,
      nonDependantDeductions,
      housingElement,
      assumptions: assumptions.map((assumption) => assumption.assumptionId)
    }
    return response(input, artifact, assumptions, unsupportedCases)

    function response(
      state: ReducedAssessmentPeriodState,
      artifact: HousingDeterminationArtifact,
      ruleAssumptions: Assumption[],
      ruleUnsupportedCases: UnsupportedCase[]
    ) {
      return {
        ruleId: "HOUSING-DETERMINE-001",
        ruleVersion: "2026.1.0",
        status: ruleUnsupportedCases.length ? "unsupported" as const : ruleAssumptions.some((item) => item.severity === "blocking") ? "unknown" as const : "passed" as const,
        value: artifact,
        trace: [{
          traceId: createEntityId("trace"),
          sequenceNumber: 1,
          ruleId: "HOUSING-DETERMINE-001",
          ruleVersion: "2026.1.0",
          stage: "housing",
          legalBasis: [universalCreditReferences.GOV_UK_UC_HOUSING_2026],
          inputsHash: stableHash(state.housing ?? {}),
          inputExcerpt: { tenure: state.housing?.tenure },
          output: artifact,
          evidenceRefs: state.housing?.evidenceRefs ?? [],
          assumptionRefs: artifact.assumptions,
          derivedArtifactRefs: []
        }],
        assumptions: ruleAssumptions,
        warnings: [],
        unsupportedCases: ruleUnsupportedCases,
        derivedArtifacts: [{ artifactType: "housing_determination", schemaVersion: "housing-determination.v1", value: artifact }]
      }
    }
  }
}
