import { traceEntry } from "../trace"
import { addMoney, gbp, maxMoney, minMoney, zeroGbp } from "../../types/money"
import type { CalculationContext, CalculationStageResult, EntitlementElement } from "../../types/calculation"

export function calculateHousingElement(context: CalculationContext): CalculationStageResult<EntitlementElement | null> {
  const housing = context.input.housing
  if (housing.tenure === "none" || housing.tenure === "owner") {
    return { value: null, trace: [], warnings: [] }
  }

  const eligibleCosts = addMoney(housing.eligibleRentMonthly, housing.eligibleServiceChargesMonthly)
  const lhaCap = housing.localHousingAllowanceMonthly ?? context.ratePack.housing.defaultLhaCapMonthly
  const cappedCosts = minMoney(eligibleCosts, lhaCap)
  const afterDeductions = maxMoney(
    gbp(cappedCosts.amountPence - housing.nonDependantDeductionsMonthly.amountPence - housing.bedroomTaxReductionMonthly.amountPence),
    zeroGbp()
  )

  const trace = traceEntry({
    ruleId: "HOUSING-001",
    stage: "housing",
    label: "Housing element",
    formula: "max(0, min(eligibleRent + serviceCharges, LHA) - nonDependantDeductions - bedroomTaxReduction)",
    inputs: { housing, eligibleCosts, lhaCap },
    output: afterDeductions,
    legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE]
  })

  return {
    value: {
      type: "housing_element",
      label: "Housing element",
      amount: afterDeductions,
      traceRuleIds: [trace.ruleId]
    },
    trace: [trace],
    warnings: []
  }
}
