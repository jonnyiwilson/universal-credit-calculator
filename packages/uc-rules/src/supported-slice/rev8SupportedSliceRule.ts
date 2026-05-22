import { createEntityId, stableHash } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { CapitalAssessmentArtifact, EligibilityArtifact, HousingDeterminationArtifact, IncomeAggregationArtifact, SupportedSliceArtifact } from "../artifacts/types"

export const rev8SupportedSliceRule: PolicyRule<ReducedAssessmentPeriodState, SupportedSliceArtifact> = {
  ruleId: "SUPPORTED-SLICE-REV8-001",
  ruleVersion: "2026.1.0",
  title: "Gate the verified REV8 single claimant private-rent employment journey",
  stage: "supported_slice",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [
    { ruleId: "ELIG-DETERMINE-001" },
    { ruleId: "HOUSING-DETERMINE-001" },
    { ruleId: "INCOME-AGGREGATE-001" },
    { ruleId: "CAPITAL-ASSESS-001" },
    { ruleId: "SELF-EMPLOYMENT-ASSESS-001" },
    { ruleId: "CHILDCARE-DETERMINE-001" },
    { ruleId: "TP-ASSESS-001" },
    { ruleId: "DEDUCTIONS-SANCTIONS-001" },
    { ruleId: "BENEFIT-CAP-001" }
  ],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026, universalCreditReferences.GOV_UK_UC_HOUSING_2026],
  outputSchemaVersion: "supported-slice-rev8.v1",
  evaluate: (input, context) => {
    const blockingReasons: string[] = []
    const unsupportedCases: UnsupportedCase[] = []
    const eligibility = findDerived<EligibilityArtifact>(context, "eligibility_decision")
    const housing = findDerived<HousingDeterminationArtifact>(context, "housing_determination")
    const income = findDerived<IncomeAggregationArtifact>(context, "income_aggregation")
    const capital = findDerived<CapitalAssessmentArtifact>(context, "capital_assessment")

    if (input.adults.length !== 1 || input.adults[0]?.role !== "claimant") blockingReasons.push("REV8 supports exactly one claimant and no partner.")
    if (input.children.length > 0) blockingReasons.push("REV8 does not yet verify child elements.")
    if (!input.housing || input.housing.tenure !== "private_rent") blockingReasons.push("REV8 supports private rent only.")
    if (!input.housing?.brmaCode || !input.housing.lhaBedroomCategory || !input.housing.lhaMonthlyRate || !input.housing.lhaDatasetVersion || !input.housing.lhaDatasetChecksum) {
      blockingReasons.push("REV8 private rent needs manual BRMA, LHA category, rate, dataset version, and checksum.")
    }
    if (!input.incomeEvents.length) blockingReasons.push("REV8 needs at least one manual employment payment.")
    if (input.incomeEvents.some((event) => event.source !== "employment_manual")) blockingReasons.push("REV8 supports manual employment income only.")
    if (input.selfEmploymentState?.enabled) blockingReasons.push("REV8 does not yet verify self-employment or MIF.")
    if (input.childcareState && input.childcareState.monthlyCostsPence > 0) blockingReasons.push("REV8 does not yet verify childcare costs.")
    if (input.tpState) blockingReasons.push("REV8 does not yet verify transitional protection.")
    if (input.sanctionState.length > 0) blockingReasons.push("REV8 does not yet verify sanctions.")
    if (input.deductionState.length > 0) blockingReasons.push("REV8 does not yet verify deductions.")
    if (eligibility?.status !== "eligible") blockingReasons.push("REV8 needs eligibility to be determined as eligible.")
    if (housing?.status !== "determined") blockingReasons.push("REV8 needs a determined private-rent housing artifact.")
    if (!income || income.incomeEventsIncluded.length < 1) blockingReasons.push("REV8 needs income aggregation to include at least one payment.")
    if (!capital || capital.totalAssessableCapital.amountPence >= 600000 || capital.eligibilityStatus !== "eligible") {
      blockingReasons.push("REV8 allows only simple assessable capital below GBP 6,000.")
    }
    const previousUnsupported = (context.evaluations ?? []).flatMap((evaluation) => evaluation.unsupportedCases).filter((item) => item.severity === "blocking")
    if (previousUnsupported.length > 0) blockingReasons.push("A required policy rule already returned a blocking unsupported case.")
    const previousBlockingAssumptions = (context.evaluations ?? []).flatMap((evaluation) => evaluation.assumptions).filter((item) => item.severity === "blocking")
    if (previousBlockingAssumptions.length > 0) blockingReasons.push("A required policy rule already returned a blocking assumption.")

    for (const reason of blockingReasons) {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "REV8_SLICE_UNSUPPORTED",
        severity: "blocking",
        reason,
        affectedStages: ["supported_slice", "award_composition"],
        userMessage: reason,
        internalNotes: "rev8-single-private-rent-employed"
      })
    }

    const artifact: SupportedSliceArtifact = {
      sliceId: "rev8-single-private-rent-employed",
      status: blockingReasons.length ? "unsupported" : "supported",
      blockingReasons,
      claimantMessage: blockingReasons.length
        ? "This case is outside the currently verified journey, so no confident award will be shown."
        : "This case matches the verified REV8 single claimant private-rent employment journey."
    }

    return {
      ruleId: "SUPPORTED-SLICE-REV8-001",
      ruleVersion: "2026.1.0",
      status: artifact.status === "supported" ? "passed" : "unsupported",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "SUPPORTED-SLICE-REV8-001",
        ruleVersion: "2026.1.0",
        stage: "supported_slice",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026, universalCreditReferences.GOV_UK_UC_HOUSING_2026],
        inputsHash: stableHash({
          adultCount: input.adults.length,
          childCount: input.children.length,
          tenure: input.housing?.tenure,
          incomeEventSources: input.incomeEvents.map((event) => event.source),
          capital: capital?.totalAssessableCapital
        }),
        inputExcerpt: { adultCount: input.adults.length, childCount: input.children.length, tenure: input.housing?.tenure, incomeEventCount: input.incomeEvents.length },
        output: artifact,
        evidenceRefs: [],
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [{ artifactType: "supported_slice_rev8", schemaVersion: "supported-slice-rev8.v1", value: artifact }]
    }
  }
}

function findDerived<T>(context: unknown, artifactType: string): T | undefined {
  const evaluations = (context as { evaluations?: Array<{ derivedArtifacts: Array<{ artifactType: string; value: unknown }> }> }).evaluations ?? []
  return evaluations.flatMap((evaluation) => evaluation.derivedArtifacts).find((artifact) => artifact.artifactType === artifactType)?.value as T | undefined
}
