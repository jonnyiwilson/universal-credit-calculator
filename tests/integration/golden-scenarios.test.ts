import { describe, expect, it } from "vitest"
import { runUniversalCreditCalculation } from "../../src/domain/calculator"
import { gbp } from "../../src/domain/types/money"
import { createDefaultAssessmentInput } from "../../src/tests/fixtures/defaultAssessment"

const period = { startDate: "2026-05-01", endDate: "2026-05-31" }

describe("golden assessment scenarios", () => {
  it("calculates a single claimant baseline with full trace", () => {
    const input = createDefaultAssessmentInput()
    const output = runUniversalCreditCalculation({ input, assessmentPeriod: period })

    expect(output.result.maximumEntitlement.amountPence).toBe(40014)
    expect(output.result.finalAward.amountPence).toBe(40014)
    expect(output.trace.map((entry) => entry.ruleId)).toContain("FINAL-001")
  })

  it("calculates housing, childcare, earnings, capital and deductions together", () => {
    const input = createDefaultAssessmentInput()
    input.children.push({ dateOfBirth: "2021-01-01", bornBeforeApril2017: false, disabled: false, severelyDisabled: false, twoChildLimitException: false })
    input.housing.tenure = "private_rent"
    input.housing.eligibleRentMonthly = gbp(80000)
    input.housing.localHousingAllowanceMonthly = gbp(75000)
    input.childcare.approvedProvider = true
    input.childcare.childCountForCap = 1
    input.childcare.monthlyCosts = gbp(40000)
    input.earnings.employmentNetMonthly = gbp(120000)
    input.capital.cashSavings = gbp(700000)
    input.deductions = [{ type: "advance_repayment", amountMonthly: gbp(2500) }]

    const output = runUniversalCreditCalculation({ input, assessmentPeriod: period })

    expect(output.result.elements.some((element) => element.type === "housing_element")).toBe(true)
    expect(output.result.elements.some((element) => element.type === "childcare_element")).toBe(true)
    expect(output.result.deductions.some((deduction) => deduction.type === "capital_tariff_income")).toBe(true)
    expect(output.result.finalAward.amountPence).toBeGreaterThan(0)
  })
})
