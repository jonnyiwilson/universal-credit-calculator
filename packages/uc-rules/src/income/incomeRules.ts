import { createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, Assumption, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { IncomeAggregationArtifact, PayrollMovementArtifact, SurplusEarningsArtifact, WorkAllowanceArtifact } from "../artifacts/types"

export const incomeAggregationRule: PolicyRule<ReducedAssessmentPeriodState, IncomeAggregationArtifact> = {
  ruleId: "INCOME-AGGREGATE-001",
  ruleVersion: "2026.1.0",
  title: "Aggregate assessment-period income events",
  stage: "income",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "income-aggregation.v1",
  evaluate: (input, context) => {
    const assumptions: Assumption[] = []
    const unsupportedCases: UnsupportedCase[] = []
    let employmentIncome = 0
    let selfEmploymentIncome = 0
    let unearnedIncome = 0
    let pensionDeductions = 0
    let disregardedIncome = 0

    for (const event of input.incomeEvents) {
      if (event.payrollDateMovedReason === "unknown") {
        assumptions.push({
          assumptionId: createEntityId("assumption"),
          severity: "warning",
          code: "PAYROLL_DATE_MOVEMENT_UNKNOWN",
          message: "Payroll date movement was marked unknown and may affect AP income treatment.",
          affectedRuleIds: ["INCOME-AGGREGATE-001"],
          canUserResolve: true,
          resolutionPrompt: "Confirm whether the pay date moved because of a weekend, bank holiday, or employer change."
        })
      }
      const netAfterPension = Math.max(0, event.netAmount.amountPence - (event.pensionContribution?.amountPence ?? 0))
      pensionDeductions += event.pensionContribution?.amountPence ?? 0
      disregardedIncome += event.disregardedAmount?.amountPence ?? 0
      if (event.source === "employment_rti" || event.source === "employment_manual") employmentIncome += netAfterPension
      else if (event.source === "self_employment") selfEmploymentIncome += netAfterPension
      else unearnedIncome += netAfterPension
    }
    const surplusThreshold = context.ratePack.rates.earnings.surplusEarningsMonthlyThreshold
    const surplusThresholdMoney = surplusThreshold && typeof surplusThreshold === "object" ? surplusThreshold : gbp(250000)
    if (employmentIncome + selfEmploymentIncome > surplusThresholdMoney.amountPence && input.surplusEarningsCarryForward === 0) {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "SURPLUS_EARNINGS_HISTORY_REQUIRED",
        severity: "blocking",
        reason: "High earnings may create surplus earnings, but prior AP ledger history is not available.",
        affectedStages: ["income", "award_composition"],
        userMessage: "This assessment needs previous assessment-period earnings before a safe award can be calculated.",
        internalNotes: `earnedIncomePence=${employmentIncome + selfEmploymentIncome}`
      })
    }

    const artifact: IncomeAggregationArtifact = {
      earnedIncome: gbp(employmentIncome + selfEmploymentIncome),
      unearnedIncome: gbp(unearnedIncome),
      employmentIncome: gbp(employmentIncome),
      selfEmploymentIncome: gbp(selfEmploymentIncome),
      pensionDeductions: gbp(pensionDeductions),
      disregardedIncome: gbp(disregardedIncome),
      incomeEventsIncluded: input.incomeEvents.map((event) => event.incomeEventId),
      incomeEventsExcluded: [],
      assumptions: assumptions.map((assumption) => assumption.assumptionId)
    }

    return {
      ruleId: "INCOME-AGGREGATE-001",
      ruleVersion: "2026.1.0",
      status: unsupportedCases.length ? "unsupported" : "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "INCOME-AGGREGATE-001",
        ruleVersion: "2026.1.0",
        stage: "income",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
        inputsHash: stableHash(input.incomeEvents),
        inputExcerpt: { incomeEventCount: input.incomeEvents.length },
        output: artifact,
        evidenceRefs: input.incomeEvents.flatMap((event) => event.evidenceRefs),
        assumptionRefs: artifact.assumptions,
        derivedArtifactRefs: []
      }],
      assumptions,
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [
        { artifactType: "income_aggregation", schemaVersion: "income-aggregation.v1", value: artifact },
        {
          artifactType: "payroll_movement_assessment",
          schemaVersion: "payroll-movement.v1",
          value: {
            status: input.payrollShiftFlags.length ? input.payrollShiftFlags.some((flag) => flag.reason === "unknown") ? "unknown" : "detected" : "none",
            payrollShiftEventIds: input.payrollShiftFlags.map((flag) => flag.incomeEventId),
            doubleIncomeRisk: input.apEarningsEvents.length > 1
          } satisfies PayrollMovementArtifact
        },
        {
          artifactType: "surplus_earnings_assessment",
          schemaVersion: "surplus-earnings.v1",
          value: {
            status: unsupportedCases.some((item) => item.code === "SURPLUS_EARNINGS_HISTORY_REQUIRED") ? "unsupported" : input.surplusEarningsCarryForward > 0 ? "calculated" : "not_applicable",
            carriedForward: gbp(input.surplusEarningsCarryForward),
            threshold: surplusThresholdMoney,
            reason: unsupportedCases.find((item) => item.code === "SURPLUS_EARNINGS_HISTORY_REQUIRED")?.reason
          } satisfies SurplusEarningsArtifact
        }
      ]
    }
  }
}

export const workAllowanceRule: PolicyRule<ReducedAssessmentPeriodState, WorkAllowanceArtifact> = {
  ruleId: "INCOME-WORK-ALLOWANCE-001",
  ruleVersion: "2026.1.0",
  title: "Determine work allowance",
  stage: "income",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "INCOME-AGGREGATE-001" }, { ruleId: "HOUSING-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "work-allowance.v1",
  evaluate: (input, context) => {
    const hasChildren = input.children.length > 0
    const hasLcwOrLcwra = input.adults.some((adult) => adult.workCapability?.status === "lcw" || adult.workCapability?.status === "lcwra")
    const housingCostIncluded = Boolean(input.housing && input.housing.tenure !== "no_housing_costs" && input.housing.tenure !== "owner_occupier")
    const applies = hasChildren || hasLcwOrLcwra
    const earningsRates = context.ratePack.rates.earnings
    const amount = applies
      ? housingCostIncluded
        ? earningsRates.workAllowanceLower && typeof earningsRates.workAllowanceLower === "object" ? earningsRates.workAllowanceLower : zeroGbp()
        : earningsRates.workAllowanceHigher && typeof earningsRates.workAllowanceHigher === "object" ? earningsRates.workAllowanceHigher : zeroGbp()
      : zeroGbp()
    const artifact: WorkAllowanceArtifact = { applies, amount, reason: hasChildren ? "children" : hasLcwOrLcwra ? "lcw_lcwra" : "none", housingCostIncluded }

    return {
      ruleId: "INCOME-WORK-ALLOWANCE-001",
      ruleVersion: "2026.1.0",
      status: "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "INCOME-WORK-ALLOWANCE-001",
        ruleVersion: "2026.1.0",
        stage: "income",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
        inputsHash: stableHash({ hasChildren, hasLcwOrLcwra, housingCostIncluded }),
        inputExcerpt: { hasChildren, hasLcwOrLcwra, housingCostIncluded },
        output: artifact,
        evidenceRefs: [],
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases: [],
      derivedArtifacts: [{ artifactType: "work_allowance_determination", schemaVersion: "work-allowance.v1", value: artifact }]
    }
  }
}
