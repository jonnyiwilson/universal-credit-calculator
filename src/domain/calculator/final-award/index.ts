import { traceEntry } from "../trace"
import { addMoney, gbp, maxMoney, zeroGbp } from "../../types/money"
import type { AwardDeduction, CalculationContext, CalculationStageResult, CalculationResult, EligibilityResult, EntitlementElement } from "../../types/calculation"

export function calculateFinalAward(
  context: CalculationContext,
  eligibility: EligibilityResult,
  elements: EntitlementElement[],
  deductions: AwardDeduction[]
): CalculationStageResult<CalculationResult> {
  const maximumEntitlement = addMoney(...elements.map((element) => element.amount))
  const totalDeductions = addMoney(...deductions.map((deduction) => deduction.amount))
  const finalAward = eligibility.eligible ? maxMoney(gbp(maximumEntitlement.amountPence - totalDeductions.amountPence), zeroGbp()) : zeroGbp()
  const earningsDeduction = addMoney(...deductions.filter((deduction) => deduction.type === "earnings").map((deduction) => deduction.amount))
  const capitalDeduction = addMoney(...deductions.filter((deduction) => deduction.type === "capital_tariff_income").map((deduction) => deduction.amount))
  const otherDeductions = addMoney(...deductions.filter((deduction) => deduction.type !== "earnings" && deduction.type !== "capital_tariff_income").map((deduction) => deduction.amount))

  const result: CalculationResult = {
    maximumEntitlement,
    elements,
    deductions,
    earningsDeduction,
    capitalDeduction,
    otherDeductions,
    finalAward,
    eligibility,
    warnings: []
  }

  return {
    value: result,
    trace: [
      traceEntry({
        ruleId: "FINAL-001",
        stage: "final_award",
        label: "Final Universal Credit award",
        formula: "eligible ? max(0, maximumEntitlement - totalDeductions) : 0",
        inputs: { maximumEntitlement, totalDeductions, eligible: eligibility.eligible },
        output: finalAward,
        legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET]
      })
    ],
    warnings: []
  }
}
