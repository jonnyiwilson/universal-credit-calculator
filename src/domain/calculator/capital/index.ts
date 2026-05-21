import { traceEntry } from "../trace"
import { addMoney, gbp, zeroGbp } from "../../types/money"
import type { AwardDeduction, CalculationContext, CalculationStageResult } from "../../types/calculation"

export function calculateCapitalDeduction(context: CalculationContext): CalculationStageResult<AwardDeduction | null> {
  const totalCapital = addMoney(
    context.input.capital.cashSavings,
    context.input.capital.investments,
    context.input.capital.propertyCapital,
    context.input.capital.notionalCapital
  )
  const lower = context.ratePack.capital.lowerThreshold.amountPence
  const upper = context.ratePack.capital.upperThreshold.amountPence
  const amountAboveLower = Math.max(0, Math.min(totalCapital.amountPence, upper) - lower)
  const bands = Math.ceil(amountAboveLower / context.ratePack.capital.bandSizePence)
  const deduction = amountAboveLower > 0 ? gbp(bands * context.ratePack.capital.tariffIncomePerBand.amountPence) : zeroGbp()

  const trace = traceEntry({
    ruleId: "CAP-001",
    stage: "capital",
    label: "Capital tariff income",
    formula: "ceil((capital - lowerThreshold) / bandSize) * tariffIncomePerBand",
    inputs: { totalCapital, lowerThreshold: context.ratePack.capital.lowerThreshold, bandSizePence: context.ratePack.capital.bandSizePence, bands },
    output: deduction,
    legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE, context.legislation.UC_REGULATIONS_2013]
  })

  return {
    value:
      deduction.amountPence > 0
        ? { type: "capital_tariff_income", label: "Capital tariff income", amount: deduction, traceRuleIds: [trace.ruleId] }
        : null,
    trace: [trace],
    warnings: []
  }
}
