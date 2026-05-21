import { describe, expect, it } from "vitest"
import { runUniversalCreditCalculation } from "../../../src/domain/calculator"
import { gbp } from "../../../src/domain/types/money"
import { createDefaultAssessmentInput } from "../../../src/tests/fixtures/defaultAssessment"

const period = { startDate: "2026-05-01", endDate: "2026-05-31" }

describe("earnings rules", () => {
  it("applies no work allowance when there are no children or health qualifiers", () => {
    const input = createDefaultAssessmentInput()
    input.earnings.employmentNetMonthly = gbp(100000)

    const output = runUniversalCreditCalculation({ input, assessmentPeriod: period })

    expect(output.result.earningsDeduction.amountPence).toBe(55000)
  })

  it("applies a work allowance before taper where children are present", () => {
    const input = createDefaultAssessmentInput()
    input.children.push({ dateOfBirth: "2020-01-01", bornBeforeApril2017: false, disabled: false, severelyDisabled: false, twoChildLimitException: false })
    input.earnings.employmentNetMonthly = gbp(100000)

    const output = runUniversalCreditCalculation({ input, assessmentPeriod: period })

    expect(output.result.earningsDeduction.amountPence).toBe(17380)
  })
})
