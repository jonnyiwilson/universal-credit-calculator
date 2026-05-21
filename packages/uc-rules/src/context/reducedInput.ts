import type { UniversalCreditCase, ReducedAssessmentPeriodState } from "../../../domain/src"

export function getReducedState(input: UniversalCreditCase | ReducedAssessmentPeriodState): ReducedAssessmentPeriodState {
  if ("reductionHash" in input) return input
  return {
    caseId: input.caseId,
    assessmentPeriodId: "",
    household: input.household,
    adults: input.household.adults,
    children: input.household.children,
    nonDependants: input.household.nonDependants,
    housing: input.household.housing,
    incomeEvents: input.incomeEvents,
    apEarningsEvents: input.incomeEvents.filter((event) => event.source === "employment_rti" || event.source === "employment_manual" || event.source === "self_employment"),
    rtiEvents: input.incomeEvents.filter((event) => event.source === "employment_rti"),
    manualIncomeEvents: input.incomeEvents.filter((event) => event.source === "employment_manual"),
    surplusEarningsCarryForward: 0,
    payrollShiftFlags: input.incomeEvents.filter((event) => event.payrollDateMovedReason).map((event) => ({ incomeEventId: event.incomeEventId, reason: event.payrollDateMovedReason ?? "unknown" })),
    capitalAssets: input.capitalAssets,
    capitalAtApEnd: input.capitalAssets,
    evidence: input.evidence,
    housingStateAtAp: input.household.housing,
    healthCohortState: input.household.adults.map((adult) => ({ adultId: adult.adultId, status: adult.workCapability?.status ?? "not_declared", cohort: adult.workCapability?.lcwraCohort ?? "unknown" })),
    carerState: input.household.adults.flatMap((adult) => adult.caringResponsibilities.map((care) => ({ adultId: adult.adultId, qualifies: care.qualifyingBenefitVerified && care.hoursPerWeek >= 35, hoursPerWeek: care.hoursPerWeek }))),
    sanctionState: [],
    deductionState: [],
    effectiveEventIds: input.timeline.map((event) => event.eventId),
    supersededEventIds: [],
    revisionReasons: [],
    reductionHash: ""
  }
}
