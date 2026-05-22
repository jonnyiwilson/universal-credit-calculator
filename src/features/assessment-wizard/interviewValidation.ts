import type { ClaimantInterviewDraft } from "./interviewDraft"

export interface InterviewValidationIssue {
  id: string
  severity: "error" | "warning"
  path?: string
  message: string
  howToFix: string
}

export function validateInterviewDraft(draft: ClaimantInterviewDraft): InterviewValidationIssue[] {
  const issues: InterviewValidationIssue[] = []
  const add = (issue: InterviewValidationIssue) => issues.push(issue)

  if (!draft.adults[0]?.dateOfBirth) {
    add({ id: "claimant-date-of-birth-required", severity: "error", path: "adults.0.dateOfBirth", message: "Enter the claimant's date of birth.", howToFix: "Use the date of birth field in the household step." })
  }

  if (draft.hasEmploymentIncome && draft.employmentIncomes.length === 0) {
    add({ id: "employment-payment-required", severity: "error", path: "employmentIncomes", message: "Add at least one employment payment.", howToFix: "Use 'Add another payment' and enter the amount received in this assessment period." })
  }
  draft.employmentIncomes.forEach((income, index) => {
    if (draft.hasEmploymentIncome && !income.receivedDate) {
      add({ id: `employment-${index}-date-required`, severity: "error", path: `employmentIncomes.${index}.receivedDate`, message: "Enter the date this employment payment was received.", howToFix: "Use the date the money was paid to the claimant or partner." })
    }
    if (draft.hasEmploymentIncome && income.netAmount.amountPence <= 0) {
      add({ id: `employment-${index}-net-pay-required`, severity: "error", path: `employmentIncomes.${index}.netAmount.amountPence`, message: "Enter the amount paid after tax and deductions.", howToFix: "Enter the net pay for this payment, not the gross pay." })
    }
  })

  const seenPayments = new Set<string>()
  draft.employmentIncomes.forEach((income) => {
    const key = `${income.employerName?.trim().toLowerCase()}:${income.receivedDate}`
    if (draft.hasEmploymentIncome && income.employerName && income.receivedDate && seenPayments.has(key)) {
      add({ id: `duplicate-payment-${key}`, severity: "warning", path: "employmentIncomes", message: "Two payments from the same employer have the same received date.", howToFix: "Check whether this is correct. Universal Credit uses the date the payment was received." })
    }
    seenPayments.add(key)
  })

  if (!draft.selfEmployment.applies && (draft.selfEmployment.businessIncome.amountPence > 0 || draft.selfEmployment.allowableExpenses.amountPence > 0 || draft.selfEmployment.lossCarriedForward.amountPence > 0)) {
    add({ id: "self-employment-values-without-gate", severity: "warning", path: "selfEmployment.applies", message: "You said you are not self-employed, but self-employment amounts have been entered.", howToFix: "Either answer yes to self-employment or clear the self-employment amounts." })
  }

  if (draft.housing.tenure === "private_rent") {
    if (draft.housing.eligibleRentMonthly.amountPence <= 0) {
      add({ id: "private-rent-required", severity: "error", path: "housing.eligibleRentMonthly.amountPence", message: "Enter the monthly rent for the private rented home.", howToFix: "Enter the eligible rent before service charges." })
    }
    if (!draft.housing.brmaCode || !draft.housing.lhaBedroomCategory || !draft.housing.lhaMonthlyRate) {
      add({ id: "local-rent-area-required", severity: "error", path: "housing.brmaCode", message: "Select the local rent area and local housing limit.", howToFix: "Choose the local rent area that covers where the claimant lives, then choose the bedroom category." })
    }
    if (draft.housing.postcode?.trim() && !draft.housing.brmaCode) {
      add({ id: "postcode-mapping-unavailable", severity: "warning", path: "housing.postcode", message: "Postcode lookup is not available in this local build.", howToFix: "Select the local rent area manually for now." })
    }
    if (draft.housing.lhaMonthlyRate && draft.housing.eligibleRentMonthly.amountPence > draft.housing.lhaMonthlyRate.amountPence * 1.5) {
      add({ id: "rent-above-local-limit", severity: "warning", path: "housing.eligibleRentMonthly.amountPence", message: "The rent entered is much higher than the local housing limit.", howToFix: "Check the rent and local rent area before calculating." })
    }
  }

  if (draft.hasDeductions && draft.deductions.length === 0) {
    add({ id: "deduction-row-required", severity: "error", path: "deductions", message: "Add at least one deduction.", howToFix: "Add the type and monthly amount of the deduction, or answer no to deductions." })
  }
  draft.deductions.forEach((deduction, index) => {
    if (draft.hasDeductions && deduction.amountMonthly.amountPence <= 0) {
      add({ id: `deduction-${index}-amount-required`, severity: "error", path: `deductions.${index}.amountMonthly.amountPence`, message: "Enter the deduction amount.", howToFix: "Enter the monthly amount taken from Universal Credit." })
    }
  })
  if (!draft.hasDeductions && draft.deductions.length > 0) {
    add({ id: "deductions-without-gate", severity: "warning", path: "hasDeductions", message: "You said there are no deductions, but deduction rows have been added.", howToFix: "Either answer yes to deductions or remove the deduction rows." })
  }

  if (outsideTrustedSlice(draft)) {
    add({ id: "outside-rev8-trusted-slice", severity: "warning", path: "review", message: "This case is outside the currently verified journey.", howToFix: "You can continue, but the server may return that this situation cannot yet be calculated safely." })
  }

  return issues
}

export function blockingIssues(issues: InterviewValidationIssue[]) {
  return issues.filter((issue) => issue.severity === "error")
}

export function warningIssues(issues: InterviewValidationIssue[]) {
  return issues.filter((issue) => issue.severity === "warning")
}

function outsideTrustedSlice(draft: ClaimantInterviewDraft) {
  return (
    draft.adults.length !== 1 ||
    draft.children.length > 0 ||
    draft.housing.tenure !== "private_rent" ||
    !draft.hasEmploymentIncome ||
    draft.employmentIncomes.length === 0 ||
    draft.employmentIncomes.some((income) => income.source !== "employment_manual") ||
    draft.selfEmployment.applies ||
    draft.hasChildcareCosts ||
    draft.transitionalProtection.managedMigration ||
    draft.sanction.applies ||
    draft.hasDeductions ||
    draft.capital.cashSavings.amountPence + draft.capital.investments.amountPence + draft.capital.propertyCapital.amountPence + draft.capital.notionalCapital.amountPence >= 600000
  )
}
