import type { EntityId, ISODate, Money } from "../../../shared/src"
import type { CaseEvent } from "../events/types"

export type ClaimLifecycleState = "draft" | "submitted" | "active" | "nil_award" | "closed" | "reclaimed" | "revised" | "appealed"

export type ImmigrationStatus = "eligible" | "ineligible" | "unknown"
export type ResidenceStatus = "passes_habitual_residence" | "fails_habitual_residence" | "unknown"
export type StudentStatus = "not_student" | "student_eligible" | "student_ineligible" | "unknown"
export type PrisonStatus = "not_in_prison" | "in_prison" | "unknown"

export interface TemporaryAbsence {
  fromDate: ISODate
  expectedReturnDate?: ISODate
  reason: "hospital" | "abroad" | "domestic_abuse" | "other"
}

export interface WorkCapabilityState {
  status: "not_declared" | "fit_note" | "referred" | "lcw" | "lcwra" | "no_lcw" | "appeal"
  effectiveFrom?: ISODate
  lcwraCohort?: "post_april_2026_lower" | "protected_severe" | "transitional_protected" | "unknown"
  evidenceRefs: EntityId[]
}

export interface CaringResponsibility {
  caredForPersonId: EntityId
  hoursPerWeek: number
  qualifyingBenefitVerified: boolean
  evidenceRefs: EntityId[]
}

export interface EmploymentStatus {
  adultId: EntityId
  status: "not_working" | "employed" | "self_employed" | "statutory_leave" | "unknown"
  effectiveFrom: ISODate
}

export interface Adult {
  adultId: EntityId
  role: "claimant" | "partner"
  dateOfBirth: ISODate
  statePensionAgeReached?: boolean
  immigrationStatus: ImmigrationStatus
  habitualResidenceStatus: ResidenceStatus
  studentStatus: StudentStatus
  prisonStatus: PrisonStatus
  temporaryAbsence?: TemporaryAbsence
  workCapability?: WorkCapabilityState
  caringResponsibilities: CaringResponsibility[]
  employmentStatuses: EmploymentStatus[]
}

export interface DisabilityAward {
  type: "dla_child" | "pip" | "adp" | "cdp" | "blind_or_severely_sight_impaired"
  rate: "lower" | "middle" | "higher" | "standard" | "enhanced"
  evidenceRefs: EntityId[]
}

export interface TwoChildLimitException {
  type: "multiple_birth" | "adoption" | "kinship_care" | "non_consensual_conception" | "other"
  evidenceRefs: EntityId[]
}

export interface ChildEducationStatus {
  status: "not_applicable" | "eligible_education" | "not_eligible" | "unknown"
  effectiveFrom?: ISODate
}

export interface Child {
  childId: EntityId
  dateOfBirth: ISODate
  livesWithHousehold: boolean
  responsibilityStatus: "responsible" | "shared" | "not_responsible" | "unknown"
  educationStatus?: ChildEducationStatus
  disabilityAwards: DisabilityAward[]
  twoChildLimitException?: TwoChildLimitException
  temporaryAbsence?: TemporaryAbsence
}

export interface BenefitReceipt {
  benefitType: string
  verified: boolean
  evidenceRefs: EntityId[]
}

export interface NonDependant {
  personId: EntityId
  dateOfBirth: ISODate
  relationshipToClaimant: string
  incomeBand?: string
  benefitsReceived: BenefitReceipt[]
  exemptFromDeduction: boolean
  evidenceRefs: EntityId[]
}

export interface IncomeEvent {
  incomeEventId: EntityId
  adultId: EntityId
  source: "employment_rti" | "employment_manual" | "self_employment" | "pension" | "benefit" | "student_income" | "other"
  receivedDate: ISODate
  assessmentPeriodId?: EntityId
  earnedPeriodStart?: ISODate
  earnedPeriodEnd?: ISODate
  payrollFrequency?: "weekly" | "fortnightly" | "four_weekly" | "monthly"
  payrollDateMovedReason?: "weekend" | "bank_holiday" | "employer_change" | "unknown"
  grossAmount?: Money
  netAmount: Money
  tax?: Money
  nationalInsurance?: Money
  pensionContribution?: Money
  disregardedAmount?: Money
  evidenceRefs: EntityId[]
}

export interface CapitalDisregard {
  type: "home_sale_proceeds" | "compensation" | "welfare_payment" | "business_asset" | "child_savings" | "temporary" | "main_home" | "other"
  effectiveFrom: ISODate
  effectiveTo?: ISODate
  evidenceRefs: EntityId[]
}

export interface CapitalAsset {
  assetId: EntityId
  ownerAdultId?: EntityId
  type: "cash" | "bank_account" | "investment" | "property_main_home" | "property_other" | "business_asset" | "compensation" | "home_sale_proceeds" | "child_savings" | "notional_capital" | "other"
  value: Money
  valuationDate: ISODate
  ownershipPercentage?: number
  valuationConfidence?: "verified" | "declared" | "estimated" | "unknown"
  deprivationFlag?: boolean
  notionalCapitalDecisionRef?: EntityId
  disregard?: CapitalDisregard
  evidenceRefs: EntityId[]
}

export interface HousingArrangement {
  housingId: EntityId
  tenure: "no_housing_costs" | "private_rent" | "social_rent" | "owner_occupier" | "temporary_accommodation" | "specified_supported" | "refuge" | "supported_without_care"
  addressRegion?: string
  brmaCode?: string
  bedroomEntitlement?: number
  bedroomsOccupied?: number
  eligibleRent: Money
  eligibleServiceCharges: Money
  rentFrequency: "weekly" | "fortnightly" | "four_weekly" | "monthly"
  liabilityVerified: boolean
  landlordVerified: boolean
  nonDependants: NonDependant[]
  evidenceRefs: EntityId[]
}

export interface EvidenceRecord {
  evidenceId: EntityId
  type: "rent_agreement" | "payslip" | "rti" | "self_employment_accounts" | "bank_statement" | "childcare_invoice" | "provider_registration" | "disability_award" | "migration_notice" | "wca_decision" | "other"
  status: "missing" | "provided" | "verified" | "rejected" | "expired" | "superseded"
  capturedAt: string
  verifiedAt?: string
  storageRef?: string
  notes?: string
}

export interface HouseholdSnapshot {
  adults: Adult[]
  children: Child[]
  nonDependants: NonDependant[]
  housing?: HousingArrangement
}

export interface CaseMetadata {
  source: "web" | "api" | "import"
  schemaVersion: string
  prototypeMigratedFromAssessmentId?: string
}

export interface UniversalCreditCase {
  caseId: EntityId
  caseVersion: number
  status: ClaimLifecycleState
  jurisdiction: "GB"
  createdAt: string
  updatedAt: string
  household: HouseholdSnapshot
  timeline: CaseEvent[]
  evidence: EvidenceRecord[]
  incomeEvents: IncomeEvent[]
  capitalAssets: CapitalAsset[]
  metadata: CaseMetadata
}
