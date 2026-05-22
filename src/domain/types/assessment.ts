import type { Money } from "./money"

export type ClaimType = "single" | "couple"
export type HousingTenure = "none" | "private_rent" | "social_rent" | "owner"
export type SanctionLevel = "none" | "low" | "medium" | "high"

export interface AssessmentPeriod {
  startDate: string
  endDate: string
}

export interface HouseholdInput {
  claimType: ClaimType
  claimantAge: number
  partnerAge?: number
  hasCaringResponsibilities: boolean
  caringHoursPerWeek?: number
}

export interface ChildInput {
  dateOfBirth: string
  bornBeforeApril2017: boolean
  disabled: boolean
  severelyDisabled: boolean
  twoChildLimitException: boolean
}

export interface EarningsInput {
  employmentNetMonthly: Money
  pensionContributionsMonthly: Money
  otherIncomeMonthly: Money
}

export interface SelfEmploymentInput {
  enabled: boolean
  incomeMonthly: Money
  allowableExpensesMonthly: Money
  gainfullySelfEmployed: boolean
  startupPeriodApplies: boolean
}

export interface HousingInput {
  tenure: HousingTenure
  postcode?: string
  localAuthorityCode?: string
  localAuthorityName?: string
  brmaCode?: string
  brmaName?: string
  lhaBedroomCategory?: "shared_accommodation" | "one_bedroom" | "two_bedroom" | "three_bedroom" | "four_bedroom"
  lhaMonthlyRate?: Money
  lhaWeeklyRate?: Money
  lhaDatasetVersion?: string
  lhaDatasetChecksum?: string
  eligibleRentMonthly: Money
  eligibleServiceChargesMonthly: Money
  localHousingAllowanceMonthly?: Money
  nonDependantDeductionsMonthly: Money
  bedroomTaxReductionMonthly: Money
}

export interface ChildcareInput {
  monthlyCosts: Money
  approvedProvider: boolean
  childCountForCap: 0 | 1 | 2
}

export interface CapitalInput {
  cashSavings: Money
  investments: Money
  propertyCapital: Money
  notionalCapital: Money
  deprivationOfCapital: boolean
}

export interface HealthInput {
  lcw: boolean
  lcwra: boolean
}

export interface DeductionInput {
  type: "advance_repayment" | "overpayment" | "third_party" | "child_maintenance" | "fraud_penalty"
  amountMonthly: Money
}

export interface SanctionInput {
  level: SanctionLevel
  amountMonthly: Money
}

export interface TransitionalProtectionInput {
  managedMigration: boolean
  transitionalElementMonthly: Money
}

export interface AssessmentInput {
  household: HouseholdInput
  children: ChildInput[]
  earnings: EarningsInput
  selfEmployment: SelfEmploymentInput
  housing: HousingInput
  childcare: ChildcareInput
  capital: CapitalInput
  health: HealthInput
  deductions: DeductionInput[]
  sanction: SanctionInput
  transitionalProtection: TransitionalProtectionInput
}
