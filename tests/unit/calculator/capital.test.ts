import { describe, expect, it } from "vitest"
import { runUniversalCreditCalculation } from "../../../src/domain/calculator"
import { gbp } from "../../../src/domain/types/money"
import { createDefaultAssessmentInput } from "../../../src/tests/fixtures/defaultAssessment"

const period = { startDate: "2026-05-01", endDate: "2026-05-31" }

describe("capital rules", () => {
  it("ignores capital below the lower threshold", () => {
    const input = createDefaultAssessmentInput()
    input.capital.cashSavings = gbp(500000)

    const output = runUniversalCreditCalculation({ input, assessmentPeriod: period })

    expect(output.result.capitalDeduction.amountPence).toBe(0)
    expect(output.trace.some((entry) => entry.ruleId === "CAP-001")).toBe(true)
  })

  it("makes the assessment ineligible over the upper threshold", () => {
    const input = createDefaultAssessmentInput()
    input.capital.cashSavings = gbp(1700000)

    const output = runUniversalCreditCalculation({ input, assessmentPeriod: period })

    expect(output.result.eligibility.eligible).toBe(false)
    expect(output.result.finalAward.amountPence).toBe(0)
  })
})
