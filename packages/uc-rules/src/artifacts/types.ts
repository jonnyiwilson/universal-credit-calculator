import type { EntityId, Money } from "../../../shared/src"
import type { DecisionReason, UnsupportedCase } from "../../../domain/src"

export interface EligibilityArtifact {
  status: "eligible" | "ineligible" | "unknown" | "unsupported"
  reasons: DecisionReason[]
  blockingUnsupportedCases: UnsupportedCase[]
  evidenceRequirements?: Array<{ evidenceType: string; reason: string }>
  evidenceRefs: EntityId[]
}

export interface IncomeAggregationArtifact {
  earnedIncome: Money
  unearnedIncome: Money
  employmentIncome: Money
  selfEmploymentIncome: Money
  pensionDeductions: Money
  disregardedIncome: Money
  incomeEventsIncluded: EntityId[]
  incomeEventsExcluded: EntityId[]
  assumptions: EntityId[]
}

export interface PayrollMovementArtifact {
  status: "none" | "detected" | "unknown"
  payrollShiftEventIds: EntityId[]
  doubleIncomeRisk: boolean
}

export interface SurplusEarningsArtifact {
  status: "not_applicable" | "calculated" | "unsupported"
  carriedForward: Money
  threshold: Money
  reason?: string
}

export interface WorkAllowanceArtifact {
  applies: boolean
  amount: Money
  reason: "children" | "lcw_lcwra" | "none"
  housingCostIncluded: boolean
}

export interface SelfEmploymentArtifact {
  status: "not_applicable" | "actual_profit" | "mif_applied" | "unknown" | "unsupported"
  actualProfit: Money
  allowableExpenses: Money
  lossCarriedForward: Money
  minimumIncomeFloor?: Money
  usedIncome: Money
  gatewayStatus: string
  startupPeriodApplies: boolean
  evidenceRefs: EntityId[]
}

export interface CapitalAssetDecision {
  assetId: EntityId
  declaredValue: Money
  disregardedValue: Money
  assessableValue: Money
  reason: string
}

export interface CapitalAssessmentArtifact {
  totalDeclaredCapital: Money
  totalDisregardedCapital: Money
  totalAssessableCapital: Money
  tariffIncome: Money
  eligibilityStatus: "eligible" | "ineligible" | "unknown"
  assetBreakdown: CapitalAssetDecision[]
  expiringDisregards: EntityId[]
}

export interface HousingDeterminationArtifact {
  status: "determined" | "partial" | "unsupported" | "not_applicable"
  route: "uc_housing_costs" | "housing_benefit_route" | "smi_route" | "none" | "unsupported"
  eligibleRent: Money
  eligibleServiceCharges: Money
  lhaCap?: Money
  bedroomEntitlement?: number
  socialRentReduction?: Money
  nonDependantDeductions: Money
  housingElement: Money
  assumptions: EntityId[]
  bedroomReason?: string
  lhaLookupStatus?: "not_required" | "matched" | "missing" | "unsupported"
}

export interface HealthCarerArtifact {
  lcwraElement: Money
  lcwraCohort: "none" | "post_april_2026_lower" | "protected_severe" | "transitional_protected" | "unknown"
  carerElement: Money
  carerQualified: boolean
  conflictApplied: boolean
  assumptions: EntityId[]
}

export interface ChildcareArtifact {
  status: "determined" | "not_applicable" | "unsupported"
  eligibleCosts: Money
  reimbursedAmount: Money
  capApplied: Money
  assumptions: EntityId[]
}

export interface BenefitCapArtifact {
  applies: boolean
  exempt: boolean
  exemptionReasons: string[]
  capAmount?: Money
  reduction: Money
}

export interface TransitionalProtectionArtifact {
  status: "not_applicable" | "baseline_pending" | "active" | "eroding" | "ceased" | "unsupported"
  amount: Money
  erosion: Money
  reason?: string
  baselineAmount?: Money
  nilAwardHandling?: "not_applicable" | "paused" | "reinstatable" | "ceased"
}

export interface SanctionsDeductionsArtifact {
  status: "determined" | "unsupported"
  sanctionDeduction: Money
  otherDeductions: Money
  recoveryCapApplied: boolean
  blockingReasons: string[]
  sanctionDaysApplied?: number
  deductionPriority?: Array<{ type: string; amount: Money; priority: number }>
  recoveryCap?: Money
}

export interface SupportedSliceArtifact {
  sliceId: "rev8-single-private-rent-employed"
  status: "supported" | "unsupported"
  blockingReasons: string[]
  claimantMessage: string
}

export interface AwardElement {
  type: string
  label: string
  amount: Money
}

export interface AwardCompositionArtifact {
  status: "determined" | "partial" | "unsupported"
  maximumEntitlement: Money
  standardAllowance: Money
  elements: AwardElement[]
  earnedIncomeDeduction: Money
  unearnedIncomeDeduction: Money
  capitalTariffDeduction: Money
  otherDeductions: Money
  benefitCapReduction?: Money
  finalAward?: Money
  omittedElements: string[]
  reductions?: AwardReduction[]
  blockingReasons?: string[]
}

export interface AwardReduction {
  type: string
  label: string
  amount: Money
}
