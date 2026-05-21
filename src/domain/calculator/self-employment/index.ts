import { traceEntry } from "../trace"
import { gbp, maxMoney, zeroGbp } from "../../types/money"
import type { Money } from "../../types/money"
import type { CalculationContext, CalculationStageResult } from "../../types/calculation"

export function calculateSelfEmploymentIncome(context: CalculationContext): CalculationStageResult<Money> {
  const selfEmployment = context.input.selfEmployment
  if (!selfEmployment.enabled) {
    return { value: zeroGbp(), trace: [], warnings: [] }
  }

  const actualProfit = maxMoney(
    gbp(selfEmployment.incomeMonthly.amountPence - selfEmployment.allowableExpensesMonthly.amountPence),
    zeroGbp()
  )
  const minimumIncomeFloor = selfEmployment.gainfullySelfEmployed && !selfEmployment.startupPeriodApplies ? context.ratePack.earnings.workAllowanceHigher : zeroGbp()
  const usedIncome = maxMoney(actualProfit, minimumIncomeFloor)

  return {
    value: usedIncome,
    trace: [
      traceEntry({
        ruleId: "SE-001",
        stage: "self_employment",
        label: "Self-employment income",
        formula: "usedIncome = max(actualProfit, minimumIncomeFloor where applicable)",
        inputs: { selfEmployment, actualProfit, minimumIncomeFloor },
        output: usedIncome,
        legislationRefs: [context.legislation.ADM_STAFF_GUIDE, context.legislation.UC_REGULATIONS_2013]
      })
    ],
    warnings: []
  }
}
