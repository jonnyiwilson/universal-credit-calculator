import { gbp } from "../../domain/types/money"
import type { AssessmentInput } from "../../domain/types/assessment"

export function createDefaultAssessmentInput(): AssessmentInput {
  return {
    household: {
      claimType: "single",
      claimantAge: 30,
      hasCaringResponsibilities: false,
      caringHoursPerWeek: 0
    },
    children: [],
    earnings: {
      employmentNetMonthly: gbp(0),
      pensionContributionsMonthly: gbp(0),
      otherIncomeMonthly: gbp(0)
    },
    selfEmployment: {
      enabled: false,
      incomeMonthly: gbp(0),
      allowableExpensesMonthly: gbp(0),
      gainfullySelfEmployed: false,
      startupPeriodApplies: false
    },
    housing: {
      tenure: "none",
      eligibleRentMonthly: gbp(0),
      eligibleServiceChargesMonthly: gbp(0),
      nonDependantDeductionsMonthly: gbp(0),
      bedroomTaxReductionMonthly: gbp(0)
    },
    childcare: {
      monthlyCosts: gbp(0),
      approvedProvider: false,
      childCountForCap: 0
    },
    capital: {
      cashSavings: gbp(0),
      investments: gbp(0),
      propertyCapital: gbp(0),
      notionalCapital: gbp(0),
      deprivationOfCapital: false
    },
    health: {
      lcw: false,
      lcwra: false
    },
    deductions: [],
    sanction: {
      level: "none",
      amountMonthly: gbp(0)
    },
    transitionalProtection: {
      managedMigration: false,
      transitionalElementMonthly: gbp(0)
    }
  }
}
