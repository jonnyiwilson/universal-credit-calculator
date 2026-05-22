import type { AssessmentInput } from "../../domain/types/assessment"
import { gbp, type Money } from "../../domain/types/money"

export type AdultRole = "claimant" | "partner"
export type HousingTenureInterview = "none" | "private_rent" | "social_rent" | "owner" | "temporary_accommodation" | "specified_supported" | "refuge"

export interface AdultDraft {
  draftId: string
  role: AdultRole
  firstName?: string
  dateOfBirth: string
  immigrationStatus: "eligible" | "ineligible" | "unknown"
  habitualResidenceStatus: "passes_habitual_residence" | "fails_habitual_residence" | "unknown"
  studentStatus: "not_student" | "student_eligible" | "student_ineligible" | "unknown"
  prisonStatus: "not_in_prison" | "in_prison" | "unknown"
}

export interface ChildDraft {
  draftId: string
  firstName?: string
  dateOfBirth: string
  disabilityStatus: "none" | "lower" | "higher"
  educationStatus: "not_applicable" | "eligible_education" | "not_eligible" | "unknown"
  fosterChild: boolean
  bornBeforeApril2017: boolean
  twoChildLimitException: boolean
}

export interface NonDependantDraft {
  draftId: string
  dateOfBirth: string
  relationshipToClaimant: string
  exemptFromDeduction: boolean
  benefitsReceived: string
  housingContributionMayApply: boolean
}

export interface EmploymentIncomeDraft {
  draftId: string
  adultRole: AdultRole
  employerName?: string
  source: "employment_manual" | "employment_rti"
  receivedDate: string
  netAmount: Money
  pensionContribution: Money
  payrollFrequency?: "weekly" | "fortnightly" | "four_weekly" | "monthly"
  payrollDateMovedReason?: "weekend" | "bank_holiday" | "employer_change" | "unknown"
}

export interface SelfEmploymentDraft {
  applies: boolean
  adultRole: AdultRole
  businessIncome: Money
  allowableExpenses: Money
  gainfullySelfEmployed: boolean
  startupPeriodApplies: boolean
  director: boolean
  lossCarriedForward: Money
}

export interface HousingDraft {
  tenure: HousingTenureInterview
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
  bedroomsOccupied?: number
}

export interface DeductionDraft {
  draftId: string
  type: "advance_repayment" | "overpayment" | "third_party" | "rent_arrears" | "hardship_repayment" | "child_maintenance" | "fraud_penalty"
  amountMonthly: Money
  startDate?: string
  endDate?: string
  source?: string
  notes?: string
}

export interface SanctionDraft {
  applies: boolean
  level: "low" | "medium" | "high"
  amountMonthly: Money
  startDate?: string
  endDate?: string
}

export interface ClaimantInterviewDraft {
  draftId: string
  currentStep: string
  caseId?: string
  assessmentPeriod: { startDate: string; endDate: string }
  adults: AdultDraft[]
  children: ChildDraft[]
  nonDependants: NonDependantDraft[]
  hasEmploymentIncome: boolean
  employmentIncomes: EmploymentIncomeDraft[]
  selfEmployment: SelfEmploymentDraft
  housing: HousingDraft
  hasChildcareCosts: boolean
  childcare: { monthlyCosts: Money; approvedProvider: boolean; childCountForCap: 0 | 1 | 2 }
  capital: { cashSavings: Money; investments: Money; propertyCapital: Money; notionalCapital: Money; deprivationOfCapital: boolean }
  health: { lcw: boolean; lcwra: boolean }
  hasDeductions: boolean
  deductions: DeductionDraft[]
  sanction: SanctionDraft
  transitionalProtection: { managedMigration: boolean; transitionalElementMonthly: Money }
  lastArtifactId?: string
}

export interface CaseEventDraft {
  draftId: string
  sequence: number
  eventType: string
  occurredAt: string
  effectiveFrom?: string
  payload: unknown
}

export function createDefaultInterviewDraft(): ClaimantInterviewDraft {
  const today = new Date().toISOString().slice(0, 10)
  const claimantBirthYear = new Date().getFullYear() - 30
  return {
    draftId: crypto.randomUUID(),
    currentStep: "household",
    assessmentPeriod: currentAssessmentPeriod(),
    adults: [{
      draftId: "claimant",
      role: "claimant",
      firstName: "",
      dateOfBirth: `${claimantBirthYear}-01-01`,
      immigrationStatus: "eligible",
      habitualResidenceStatus: "passes_habitual_residence",
      studentStatus: "not_student",
      prisonStatus: "not_in_prison"
    }],
    children: [],
    nonDependants: [],
    hasEmploymentIncome: false,
    employmentIncomes: [],
    selfEmployment: {
      applies: false,
      adultRole: "claimant",
      businessIncome: gbp(0),
      allowableExpenses: gbp(0),
      gainfullySelfEmployed: false,
      startupPeriodApplies: false,
      director: false,
      lossCarriedForward: gbp(0)
    },
    housing: {
      tenure: "none",
      eligibleRentMonthly: gbp(0),
      eligibleServiceChargesMonthly: gbp(0)
    },
    hasChildcareCosts: false,
    childcare: { monthlyCosts: gbp(0), approvedProvider: false, childCountForCap: 0 },
    capital: { cashSavings: gbp(0), investments: gbp(0), propertyCapital: gbp(0), notionalCapital: gbp(0), deprivationOfCapital: false },
    health: { lcw: false, lcwra: false },
    hasDeductions: false,
    deductions: [],
    sanction: { applies: false, level: "low", amountMonthly: gbp(0) },
    transitionalProtection: { managedMigration: false, transitionalElementMonthly: gbp(0) },
    lastArtifactId: undefined
  }
}

export function buildCaseEventDrafts(draft: ClaimantInterviewDraft): CaseEventDraft[] {
  const events: CaseEventDraft[] = []
  const occurredAt = draft.assessmentPeriod.startDate
  const add = (eventType: string, payload: unknown, effectiveFrom = occurredAt) => {
    events.push({ draftId: crypto.randomUUID(), sequence: events.length + 1, eventType, occurredAt, effectiveFrom, payload })
  }

  for (const child of draft.children) {
    add("child_added", {
      childId: child.draftId,
      dateOfBirth: child.dateOfBirth,
      livesWithHousehold: true,
      responsibilityStatus: child.fosterChild ? "unknown" : "responsible",
      educationStatus: { status: child.educationStatus },
      disabilityAwards: child.disabilityStatus === "none" ? [] : [{ type: "dla_child", rate: child.disabilityStatus === "higher" ? "higher" : "lower", evidenceRefs: [] }],
      twoChildLimitException: child.twoChildLimitException ? { type: "other", evidenceRefs: [] } : undefined,
      fosterChild: child.fosterChild
    })
  }

  if (draft.housing.tenure !== "none") {
    add("housing_declared", {
      tenure: toBackendTenure(draft.housing.tenure),
      postcode: draft.housing.postcode,
      localAuthorityCode: draft.housing.localAuthorityCode,
      localAuthorityName: draft.housing.localAuthorityName,
      brmaCode: draft.housing.brmaCode,
      brmaName: draft.housing.brmaName,
      lhaBedroomCategory: draft.housing.lhaBedroomCategory,
      lhaMonthlyRate: draft.housing.lhaMonthlyRate,
      lhaWeeklyRate: draft.housing.lhaWeeklyRate,
      lhaDatasetVersion: draft.housing.lhaDatasetVersion,
      lhaDatasetChecksum: draft.housing.lhaDatasetChecksum,
      eligibleRent: draft.housing.eligibleRentMonthly,
      eligibleServiceCharges: draft.housing.eligibleServiceChargesMonthly,
      bedroomsOccupied: draft.housing.bedroomsOccupied,
      rentFrequency: "monthly",
      liabilityVerified: true,
      landlordVerified: false,
      nonDependants: draft.nonDependants.map((person) => ({
        personId: person.draftId,
        dateOfBirth: person.dateOfBirth,
        relationshipToClaimant: person.relationshipToClaimant,
        exemptFromDeduction: person.exemptFromDeduction,
        benefitsReceived: person.benefitsReceived ? [{ benefitType: person.benefitsReceived, verified: false, evidenceRefs: [] }] : [],
        housingContributionMayApply: person.housingContributionMayApply
      }))
    })
  }

  if (draft.hasEmploymentIncome) {
    for (const income of draft.employmentIncomes) {
      add("income_reported", {
        incomeEventId: income.draftId,
        adultRole: income.adultRole,
        source: income.source,
        employerName: income.employerName,
        receivedDate: income.receivedDate,
        netAmount: income.netAmount,
        pensionContribution: income.pensionContribution,
        payrollFrequency: income.payrollFrequency,
        payrollDateMovedReason: income.payrollDateMovedReason
      }, income.receivedDate)
    }
  }

  if (draft.selfEmployment.applies) {
    add("income_reported", {
      source: "self_employment",
      adultRole: draft.selfEmployment.adultRole,
      receivedDate: occurredAt,
      netAmount: gbp(Math.max(0, draft.selfEmployment.businessIncome.amountPence - draft.selfEmployment.allowableExpenses.amountPence)),
      businessIncome: draft.selfEmployment.businessIncome,
      allowableExpenses: draft.selfEmployment.allowableExpenses,
      gainfullySelfEmployed: draft.selfEmployment.gainfullySelfEmployed,
      startupPeriodApplies: draft.selfEmployment.startupPeriodApplies,
      director: draft.selfEmployment.director,
      lossCarriedForward: draft.selfEmployment.lossCarriedForward,
      gatewayStatus: draft.selfEmployment.gainfullySelfEmployed ? "gainfully_self_employed" : "gateway_pending"
    })
  }

  for (const asset of [
    { type: "cash", value: draft.capital.cashSavings },
    { type: "investment", value: draft.capital.investments },
    { type: "property_other", value: draft.capital.propertyCapital },
    { type: "notional_capital", value: draft.capital.notionalCapital, deprivationFlag: draft.capital.deprivationOfCapital }
  ]) {
    if (asset.value.amountPence > 0) add("capital_declared", { ...asset, valuationDate: occurredAt, valuationConfidence: "declared" })
  }

  if (draft.health.lcw || draft.health.lcwra) {
    add("health_declared", { status: draft.health.lcwra ? "lcwra" : "lcw", lcwraCohort: draft.health.lcwra ? "unknown" : undefined })
  }

  if (draft.hasChildcareCosts && draft.childcare.monthlyCosts.amountPence > 0) {
    add("evidence_added", {
      evidenceType: "childcare_invoice",
      status: draft.childcare.approvedProvider ? "verified" : "provided",
      monthlyCosts: draft.childcare.monthlyCosts,
      approvedProvider: draft.childcare.approvedProvider,
      childCountForCap: draft.childcare.childCountForCap
    })
  }

  if (draft.transitionalProtection.managedMigration) {
    add("migration_notice_reported", {
      status: draft.transitionalProtection.transitionalElementMonthly.amountPence > 0 ? "active" : "baseline_pending",
      baselineAmount: draft.transitionalProtection.transitionalElementMonthly,
      currentAmount: draft.transitionalProtection.transitionalElementMonthly
    })
  }

  if (draft.sanction.applies) {
    add("sanction_reported", {
      status: "active",
      level: draft.sanction.level,
      amount: draft.sanction.amountMonthly,
      startDate: draft.sanction.startDate,
      endDate: draft.sanction.endDate
    })
  }

  if (draft.hasDeductions && draft.deductions.length > 0) {
    add("assessment_revised", {
      reason: "Declared deductions",
      deductions: draft.deductions.map((deduction, index) => ({
        type: deduction.type,
        amount: deduction.amountMonthly,
        startDate: deduction.startDate,
        endDate: deduction.endDate,
        source: deduction.source,
        notes: deduction.notes,
        priority: index + 1
      }))
    })
  }

  return events.sort((left, right) => left.sequence - right.sequence)
}

export function legacyAssessmentInputToEventDrafts(input: AssessmentInput): CaseEventDraft[] {
  const draft = createDefaultInterviewDraft()
  draft.children = input.children.map((child) => ({
    draftId: crypto.randomUUID(),
    dateOfBirth: child.dateOfBirth,
    disabilityStatus: child.severelyDisabled ? "higher" : child.disabled ? "lower" : "none",
    educationStatus: "not_applicable",
    fosterChild: false,
    bornBeforeApril2017: child.bornBeforeApril2017,
    twoChildLimitException: child.twoChildLimitException
  }))
  draft.hasEmploymentIncome = input.earnings.employmentNetMonthly.amountPence > 0
  draft.employmentIncomes = draft.hasEmploymentIncome ? [{
    draftId: crypto.randomUUID(),
    adultRole: "claimant",
    source: "employment_manual",
    receivedDate: draft.assessmentPeriod.startDate,
    netAmount: input.earnings.employmentNetMonthly,
    pensionContribution: input.earnings.pensionContributionsMonthly,
    payrollFrequency: "monthly"
  }] : []
  return buildCaseEventDrafts(draft)
}

function currentAssessmentPeriod() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
}

function toBackendTenure(tenure: HousingTenureInterview) {
  if (tenure === "none") return "no_housing_costs"
  if (tenure === "owner") return "owner_occupier"
  return tenure
}
