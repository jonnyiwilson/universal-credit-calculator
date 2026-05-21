import type { AssessmentInput, AssessmentPeriod } from "./assessment"
import type { Money } from "./money"

export type CalculationStage =
  | "eligibility"
  | "entitlement"
  | "earnings"
  | "self_employment"
  | "capital"
  | "housing"
  | "childcare"
  | "deductions"
  | "sanctions"
  | "transitional_protection"
  | "final_award"

export interface LegislationReference {
  id: string
  title: string
  url: string
  note?: string
}

export type LegislationReferenceIndex = Record<string, LegislationReference>

export interface AssessmentWarning {
  code: string
  message: string
  severity: "info" | "warning" | "blocking"
}

export interface CalculationTraceEntry {
  ruleId: string
  stage: CalculationStage
  label: string
  formula?: string
  inputs: Record<string, unknown>
  output: unknown
  legislationRefs: LegislationReference[]
}

export interface CalculationStageResult<T> {
  value: T
  trace: CalculationTraceEntry[]
  warnings: AssessmentWarning[]
}

export interface EligibilityResult {
  eligible: boolean
  reasons: string[]
}

export type EntitlementElementType =
  | "standard_allowance"
  | "child_element"
  | "disabled_child_element"
  | "housing_element"
  | "childcare_element"
  | "lcwra_element"
  | "carer_element"
  | "transitional_protection"

export interface EntitlementElement {
  type: EntitlementElementType
  label: string
  amount: Money
  traceRuleIds: string[]
}

export type AwardDeductionType =
  | "earnings"
  | "capital_tariff_income"
  | "sanction"
  | "advance_repayment"
  | "overpayment"
  | "third_party"
  | "child_maintenance"
  | "fraud_penalty"

export interface AwardDeduction {
  type: AwardDeductionType
  label: string
  amount: Money
  traceRuleIds: string[]
}

export interface CalculationResult {
  maximumEntitlement: Money
  elements: EntitlementElement[]
  deductions: AwardDeduction[]
  earningsDeduction: Money
  capitalDeduction: Money
  otherDeductions: Money
  finalAward: Money
  eligibility: EligibilityResult
  warnings: AssessmentWarning[]
}

export interface CalculationContext {
  input: AssessmentInput
  ratePack: UcRatePack
  legislation: LegislationReferenceIndex
  assessmentPeriod: AssessmentPeriod
}

export interface StandardAllowanceRates {
  singleUnder25: Money
  single25Plus: Money
  coupleBothUnder25: Money
  coupleOneOrBoth25Plus: Money
}

export interface ChildElementRates {
  childElement: Money
  firstChildBornBeforeApril2017: Money
  disabledChildLower: Money
  disabledChildHigher: Money
}

export interface HousingRates {
  defaultLhaCapMonthly: Money
}

export interface ChildcareRates {
  reimbursementPercentage: number
  oneChildCap: Money
  twoOrMoreChildrenCap: Money
}

export interface EarningsRates {
  taperRate: number
  workAllowanceHigher: Money
  workAllowanceLower: Money
}

export interface CapitalRates {
  lowerThreshold: Money
  upperThreshold: Money
  bandSizePence: number
  tariffIncomePerBand: Money
}

export interface DeductionRates {
  minimumAwardPence: number
}

export interface UcRatePack {
  version: string
  effectiveFrom: string
  effectiveTo?: string
  sourceRefs: LegislationReference[]
  standardAllowances: StandardAllowanceRates
  childElements: ChildElementRates
  housing: HousingRates
  childcare: ChildcareRates
  earnings: EarningsRates
  capital: CapitalRates
  deductions: DeductionRates
  metadata: {
    checksum: string
    preparedBy: string
    reviewedBy?: string
    notes: string
  }
}
