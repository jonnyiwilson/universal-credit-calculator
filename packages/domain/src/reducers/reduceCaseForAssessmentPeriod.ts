import { canonicalJson, createEntityId, gbp, stableHash } from "../../../shared/src"
import type { CaseEvent } from "../events/types"
import type { CaseReductionInput, ReductionAuditRecord, ReducedAssessmentPeriodState } from "./types"

export const reducerVersion = "rev4-reducer-1"

export function reduceCaseForAssessmentPeriod(input: CaseReductionInput): ReductionAuditRecord {
  const orderedEvents = [...input.events].sort(compareEvents)
  const effectiveEvents = orderedEvents.filter((event) => {
    const effectiveFrom = event.effectiveFrom ?? event.occurredAt
    return effectiveFrom <= input.assessmentPeriod.endDate && (!event.effectiveTo || event.effectiveTo >= input.assessmentPeriod.startDate)
  })

  const supersededEventIds = new Set<string>()
  const revisionReasons = []

  for (const event of effectiveEvents) {
    if (event.type === "assessment_revised" && event.payload && typeof event.payload === "object") {
      const payload = event.payload as { supersedesEventIds?: string[]; reason?: string }
      payload.supersedesEventIds?.forEach((id) => supersededEventIds.add(id))
      if (payload.reason) {
        revisionReasons.push({ code: "ASSESSMENT_REVISED", message: payload.reason, severity: "info" as const })
      }
    }
  }

  const activeEvents = effectiveEvents.filter((event) => !supersededEventIds.has(event.eventId))
  const activeEventIds = activeEvents.map((event) => event.eventId)
  const adults = [...input.universalCreditCase.household.adults]
  const children = [...input.universalCreditCase.household.children]
  let housing = input.universalCreditCase.household.housing
  const evidence = [...input.universalCreditCase.evidence]
  const incomeEventsFromTimeline = []
  const capitalAssetsFromTimeline = []
  const sanctionState: ReducedAssessmentPeriodState["sanctionState"] = []
  const deductionState: ReducedAssessmentPeriodState["deductionState"] = []
  let childcareState: ReducedAssessmentPeriodState["childcareState"]
  let selfEmploymentState: ReducedAssessmentPeriodState["selfEmploymentState"]
  let benefitCapState: ReducedAssessmentPeriodState["benefitCapState"]
  let tpState: ReducedAssessmentPeriodState["tpState"]

  for (const event of activeEvents) {
    const payload = event.payload && typeof event.payload === "object" ? event.payload as Record<string, unknown> : {}
    if (event.type === "child_added") {
      children.push({
        childId: String(payload.childId ?? createEntityId("child")),
        dateOfBirth: String(payload.dateOfBirth ?? event.occurredAt),
        livesWithHousehold: payload.livesWithHousehold !== false,
        responsibilityStatus: payload.responsibilityStatus === "unknown" ? "unknown" : "responsible",
        disabilityAwards: Array.isArray(payload.disabilityAwards) ? payload.disabilityAwards as never : [],
        twoChildLimitException: payload.twoChildLimitException as never,
        evidenceRefs: []
      } as never)
    }
    if (event.type === "housing_declared" && payload.tenure) {
      housing = {
        housingId: String(payload.housingId ?? createEntityId("housing")),
        tenure: payload.tenure as never,
        brmaCode: payload.brmaCode ? String(payload.brmaCode) : undefined,
        bedroomEntitlement: typeof payload.bedroomEntitlement === "number" ? payload.bedroomEntitlement : undefined,
        bedroomsOccupied: typeof payload.bedroomsOccupied === "number" ? payload.bedroomsOccupied : undefined,
        eligibleRent: moneyFromPayload(payload.eligibleRent),
        eligibleServiceCharges: moneyFromPayload(payload.eligibleServiceCharges),
        rentFrequency: payload.rentFrequency as never ?? "monthly",
        liabilityVerified: payload.liabilityVerified === true,
        landlordVerified: payload.landlordVerified === true,
        nonDependants: [],
        evidenceRefs: event.evidenceRefs
      }
    }
    if (event.type === "income_reported") {
      if (payload.source === "self_employment") {
        selfEmploymentState = {
          enabled: true,
          gainfullySelfEmployed: payload.gainfullySelfEmployed === true,
          gatewayStatus: payload.gatewayStatus ? String(payload.gatewayStatus) : undefined,
          startupPeriodApplies: payload.startupPeriodApplies === true,
          incomePence: moneyFromPayload(payload.businessIncome ?? payload.netAmount).amountPence,
          expensesPence: moneyFromPayload(payload.allowableExpenses).amountPence,
          expectedHours: typeof payload.expectedHours === "number" ? payload.expectedHours : undefined,
          hourlyRatePence: typeof payload.hourlyRatePence === "number" ? payload.hourlyRatePence : undefined,
          lossCarriedForwardPence: moneyFromPayload(payload.lossCarriedForward).amountPence,
          director: payload.director === true,
          mifSuspended: payload.mifSuspended === true
        }
      }
      incomeEventsFromTimeline.push({
        incomeEventId: String(payload.incomeEventId ?? event.eventId),
        adultId: String(payload.adultId ?? adults[0]?.adultId ?? "unknown"),
        source: payload.source as never ?? "employment_manual",
        receivedDate: String(payload.receivedDate ?? event.occurredAt),
        earnedPeriodStart: payload.earnedPeriodStart ? String(payload.earnedPeriodStart) : undefined,
        earnedPeriodEnd: payload.earnedPeriodEnd ? String(payload.earnedPeriodEnd) : undefined,
        payrollFrequency: payload.payrollFrequency as never,
        payrollDateMovedReason: payload.payrollDateMovedReason as never,
        netAmount: moneyFromPayload(payload.netAmount),
        pensionContribution: payload.pensionContribution ? moneyFromPayload(payload.pensionContribution) : undefined,
        disregardedAmount: payload.disregardedAmount ? moneyFromPayload(payload.disregardedAmount) : undefined,
        evidenceRefs: event.evidenceRefs
      })
    }
    if (event.type === "capital_declared") {
      capitalAssetsFromTimeline.push({
        assetId: String(payload.assetId ?? event.eventId),
        ownerAdultId: payload.ownerAdultId ? String(payload.ownerAdultId) : undefined,
        type: payload.type as never ?? "other",
        value: moneyFromPayload(payload.value),
        valuationDate: String(payload.valuationDate ?? event.occurredAt),
        ownershipPercentage: typeof payload.ownershipPercentage === "number" ? payload.ownershipPercentage : undefined,
        valuationConfidence: payload.valuationConfidence as never,
        deprivationFlag: payload.deprivationFlag === true,
        notionalCapitalDecisionRef: payload.notionalCapitalDecisionRef ? String(payload.notionalCapitalDecisionRef) : undefined,
        disregard: payload.disregard as never,
        evidenceRefs: event.evidenceRefs
      })
    }
    if (event.type === "health_declared") {
      const adult = adults.find((item) => item.adultId === payload.adultId) ?? adults[0]
      if (adult) {
        if (payload.status) {
          adult.workCapability = {
            status: payload.status as never ?? "not_declared",
            effectiveFrom: event.effectiveFrom ?? event.occurredAt,
            lcwraCohort: payload.lcwraCohort as never,
            evidenceRefs: event.evidenceRefs
          }
        }
        if (typeof payload.caringHoursPerWeek === "number") {
          adult.caringResponsibilities = [{
            caredForPersonId: String(payload.caredForPersonId ?? "declared-care"),
            hoursPerWeek: payload.caringHoursPerWeek,
            qualifyingBenefitVerified: payload.qualifyingBenefitVerified === true,
            evidenceRefs: event.evidenceRefs
          }]
        }
      }
    }
    if (event.type === "sanction_reported") {
      sanctionState.push({ status: String(payload.status ?? "active"), level: payload.level ? String(payload.level) : undefined, amountPence: moneyFromPayload(payload.amount).amountPence })
    }
    if (event.type === "migration_notice_reported") {
      tpState = {
        status: String(payload.status ?? "baseline_pending"),
        baselineAmountPence: moneyFromPayload(payload.baselineAmount).amountPence,
        currentAmountPence: moneyFromPayload(payload.currentAmount).amountPence
      }
    }
    if (event.type === "assessment_revised" && payload.benefitCapGeography) {
      benefitCapState = {
        geography: payload.benefitCapGeography as never,
        exempt: payload.benefitCapExempt === true
      }
    }
    if (event.type === "evidence_added" && payload.evidenceType === "childcare_invoice") {
      childcareState = {
        monthlyCostsPence: moneyFromPayload(payload.monthlyCosts).amountPence,
        approvedProvider: payload.approvedProvider === true,
        childCountForCap: typeof payload.childCountForCap === "number" ? payload.childCountForCap : 0
      }
    }
    if (event.type === "evidence_added") {
      evidence.push({
        evidenceId: String(payload.evidenceId ?? createEntityId("evidence")),
        type: payload.evidenceType as never ?? "other",
        status: payload.status as never ?? "provided",
        capturedAt: event.reportedAt,
        verifiedAt: event.verifiedAt,
        notes: payload.notes ? String(payload.notes) : undefined
      })
    }
  }

  const incomeEvents = [...input.universalCreditCase.incomeEvents, ...incomeEventsFromTimeline].filter(
    (event) => event.receivedDate >= input.assessmentPeriod.startDate && event.receivedDate <= input.assessmentPeriod.endDate
  )
  const capitalAssets = [...input.universalCreditCase.capitalAssets, ...capitalAssetsFromTimeline].filter((asset) => asset.valuationDate <= input.assessmentPeriod.endDate)
  const apEarningsEvents = incomeEvents.filter((event) => event.source === "employment_rti" || event.source === "employment_manual" || event.source === "self_employment")
  const rtiEvents = incomeEvents.filter((event) => event.source === "employment_rti")
  const manualIncomeEvents = incomeEvents.filter((event) => event.source === "employment_manual")
  const payrollShiftFlags = incomeEvents
    .filter((event) => event.payrollDateMovedReason)
    .map((event) => ({ incomeEventId: event.incomeEventId, reason: event.payrollDateMovedReason ?? "unknown" }))

  const reducedWithoutHash = {
    caseId: input.universalCreditCase.caseId,
    assessmentPeriodId: input.assessmentPeriod.assessmentPeriodId,
    household: { adults, children, nonDependants: input.universalCreditCase.household.nonDependants, housing },
    adults,
    children,
    nonDependants: input.universalCreditCase.household.nonDependants,
    housing,
    incomeEvents,
    apEarningsEvents,
    rtiEvents,
    manualIncomeEvents,
    surplusEarningsCarryForward: Number(input.previousSnapshot ? 0 : 0),
    payrollShiftFlags,
    capitalAssets,
    capitalAtApEnd: capitalAssets,
    evidence,
    housingStateAtAp: housing,
    healthCohortState: adults.map((adult) => ({ adultId: adult.adultId, status: adult.workCapability?.status ?? "not_declared", cohort: adult.workCapability?.lcwraCohort ?? "unknown" })),
    carerState: adults.flatMap((adult) => adult.caringResponsibilities.map((care) => ({ adultId: adult.adultId, qualifies: care.qualifyingBenefitVerified && care.hoursPerWeek >= 35, hoursPerWeek: care.hoursPerWeek }))),
    childcareState,
    selfEmploymentState,
    benefitCapState,
    tpState,
    sanctionState,
    deductionState,
    effectiveEventIds: activeEventIds,
    supersededEventIds: Array.from(supersededEventIds),
    revisionReasons
  }

  const reducedState: ReducedAssessmentPeriodState = {
    ...reducedWithoutHash,
    reductionHash: stableHash(canonicalJson(reducedWithoutHash))
  }

  return { reducerVersion, reducedState }
}

function moneyFromPayload(value: unknown) {
  if (value && typeof value === "object" && "amountPence" in value && typeof (value as { amountPence: unknown }).amountPence === "number") {
    return gbp((value as { amountPence: number }).amountPence)
  }
  if (typeof value === "number") return gbp(value)
  return gbp(0)
}

function compareEvents(left: CaseEvent, right: CaseEvent): number {
  return (
    (left.effectiveFrom ?? left.occurredAt).localeCompare(right.effectiveFrom ?? right.occurredAt) ||
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.reportedAt.localeCompare(right.reportedAt) ||
    left.eventId.localeCompare(right.eventId)
  )
}
