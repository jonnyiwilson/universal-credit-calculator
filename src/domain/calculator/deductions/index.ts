import { traceEntry } from "../trace"
import { addMoney } from "../../types/money"
import type { AwardDeduction, CalculationContext, CalculationStageResult } from "../../types/calculation"

export function calculateOtherDeductions(context: CalculationContext): CalculationStageResult<AwardDeduction[]> {
  const deductions: AwardDeduction[] = context.input.deductions
    .filter((deduction) => deduction.amountMonthly.amountPence > 0)
    .map((deduction) => ({
      type: deduction.type,
      label: deduction.type.replaceAll("_", " "),
      amount: deduction.amountMonthly,
      traceRuleIds: ["DED-001"]
    }))

  const sanction = context.input.sanction
  if (sanction.level !== "none" && sanction.amountMonthly.amountPence > 0) {
    deductions.push({
      type: "sanction",
      label: `${sanction.level} sanction`,
      amount: sanction.amountMonthly,
      traceRuleIds: ["SANCTION-001"]
    })
  }

  return {
    value: deductions,
    trace: [
      traceEntry({
        ruleId: "DED-001",
        stage: "deductions",
        label: "Other deductions",
        formula: "sum(entered deduction amounts)",
        inputs: { deductions: context.input.deductions },
        output: addMoney(...deductions.filter((item) => item.type !== "sanction").map((item) => item.amount)),
        legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE]
      }),
      traceEntry({
        ruleId: "SANCTION-001",
        stage: "sanctions",
        label: "Sanctions",
        inputs: { sanction },
        output: sanction.amountMonthly,
        legislationRefs: [context.legislation.ADM_STAFF_GUIDE, context.legislation.UC_REGULATIONS_2013]
      })
    ],
    warnings: []
  }
}
