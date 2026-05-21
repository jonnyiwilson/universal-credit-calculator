import { calculateSelfEmploymentIncome } from "../self-employment"
import { traceEntry } from "../trace"
import { addMoney, gbp, maxMoney, zeroGbp } from "../../types/money"
import type { AwardDeduction, CalculationContext, CalculationStageResult } from "../../types/calculation"

export function calculateEarningsDeduction(context: CalculationContext): CalculationStageResult<AwardDeduction | null> {
  const selfEmployment = calculateSelfEmploymentIncome(context)
  const earnings = addMoney(context.input.earnings.employmentNetMonthly, selfEmployment.value, context.input.earnings.otherIncomeMonthly)
  const hasChildrenOrHealth = context.input.children.length > 0 || context.input.health.lcw || context.input.health.lcwra
  const hasHousing = context.input.housing.tenure === "private_rent" || context.input.housing.tenure === "social_rent"
  const workAllowance = hasChildrenOrHealth ? (hasHousing ? context.ratePack.earnings.workAllowanceLower : context.ratePack.earnings.workAllowanceHigher) : zeroGbp()
  const earningsAfterAllowance = maxMoney(gbp(earnings.amountPence - workAllowance.amountPence), zeroGbp())
  const deduction = gbp(earningsAfterAllowance.amountPence * context.ratePack.earnings.taperRate)

  const trace = [
    ...selfEmployment.trace,
    traceEntry({
      ruleId: "EARN-001",
      stage: "earnings",
      label: "Earnings deduction",
      formula: "max(0, earnings - workAllowance) * taperRate",
      inputs: {
        employmentNetMonthly: context.input.earnings.employmentNetMonthly,
        selfEmploymentIncome: selfEmployment.value,
        otherIncomeMonthly: context.input.earnings.otherIncomeMonthly,
        workAllowance,
        taperRate: context.ratePack.earnings.taperRate
      },
      output: deduction,
      legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE]
    })
  ]

  return {
    value:
      deduction.amountPence > 0
        ? { type: "earnings", label: "Earnings deduction", amount: deduction, traceRuleIds: ["EARN-001"] }
        : null,
    trace,
    warnings: [...selfEmployment.warnings]
  }
}
