import type { EntityId } from "../../../shared/src"
import type { AssessmentPeriod, AssessmentPeriodSnapshot } from "../assessment-periods/types"
import type { DecisionReason } from "../decisions/types"
import type { Adult, CapitalAsset, Child, EvidenceRecord, HousingArrangement, HouseholdSnapshot, IncomeEvent, NonDependant, UniversalCreditCase } from "../entities/types"
import type { CaseEvent } from "../events/types"

export type ReductionMode = "original" | "revision" | "supersession" | "appeal" | "comparison"

export interface CaseReductionInput {
  universalCreditCase: UniversalCreditCase
  assessmentPeriod: AssessmentPeriod
  events: CaseEvent[]
  previousSnapshot?: AssessmentPeriodSnapshot
  mode: ReductionMode
  now: string
}

export interface ReducedAssessmentPeriodState {
  caseId: EntityId
  assessmentPeriodId: EntityId
  household: HouseholdSnapshot
  adults: Adult[]
  children: Child[]
  nonDependants: NonDependant[]
  housing?: HousingArrangement
  incomeEvents: IncomeEvent[]
  apEarningsEvents: IncomeEvent[]
  rtiEvents: IncomeEvent[]
  manualIncomeEvents: IncomeEvent[]
  surplusEarningsCarryForward: number
  payrollShiftFlags: Array<{ incomeEventId: EntityId; reason: string }>
  capitalAssets: CapitalAsset[]
  capitalAtApEnd: CapitalAsset[]
  evidence: EvidenceRecord[]
  housingStateAtAp?: HousingArrangement
  healthCohortState: Array<{ adultId: EntityId; status: string; cohort: string }>
  carerState: Array<{ adultId: EntityId; qualifies: boolean; hoursPerWeek: number }>
  childcareState?: { monthlyCostsPence: number; approvedProvider: boolean; childCountForCap: number }
  selfEmploymentState?: {
    enabled: boolean
    gainfullySelfEmployed?: boolean
    gatewayStatus?: string
    startupPeriodApplies?: boolean
    incomePence?: number
    expensesPence?: number
    expectedHours?: number
    hourlyRatePence?: number
    lossCarriedForwardPence?: number
    director?: boolean
    mifSuspended?: boolean
  }
  benefitCapState?: { geography?: "london" | "outside_london"; exempt?: boolean }
  tpState?: { status: string; baselineAmountPence?: number; currentAmountPence?: number }
  sanctionState: Array<{ status: string; level?: string; amountPence?: number; rateCategory?: "100" | "40"; startDate?: string; endDate?: string; sanctionedAdultId?: EntityId }>
  deductionState: Array<{ type: string; amountPence: number; priority?: number; recoveryClass?: "ordinary" | "fraud" | "third_party" | "hardship" }>
  effectiveEventIds: EntityId[]
  supersededEventIds: EntityId[]
  revisionReasons: DecisionReason[]
  reductionHash: string
}

export interface ReductionAuditRecord {
  reducerVersion: string
  reducedState: ReducedAssessmentPeriodState
}
