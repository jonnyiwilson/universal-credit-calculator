import { traceEntry } from "../trace"
import { gbp, minMoney, zeroGbp } from "../../types/money"
import type { CalculationContext, CalculationStageResult, EntitlementElement } from "../../types/calculation"

export function calculateChildcareElement(context: CalculationContext): CalculationStageResult<EntitlementElement | null> {
  const childcare = context.input.childcare
  if (!childcare.approvedProvider || childcare.childCountForCap === 0 || childcare.monthlyCosts.amountPence === 0) {
    return {
      value: null,
      trace: [],
      warnings:
        childcare.monthlyCosts.amountPence > 0 && !childcare.approvedProvider
          ? [
              {
                code: "CHILDCARE_PROVIDER_NOT_APPROVED",
                severity: "warning",
                message: "Childcare costs were entered but the provider was not marked as approved."
              }
            ]
          : []
    }
  }

  const cap = childcare.childCountForCap === 1 ? context.ratePack.childcare.oneChildCap : context.ratePack.childcare.twoOrMoreChildrenCap
  const reimbursable = gbp(childcare.monthlyCosts.amountPence * context.ratePack.childcare.reimbursementPercentage)
  const amount = minMoney(reimbursable, cap)
  const trace = traceEntry({
    ruleId: "CHILDCARE-001",
    stage: "childcare",
    label: "Childcare element",
    formula: "min(childcareCosts * reimbursementPercentage, childcareCap)",
    inputs: { childcare, reimbursementPercentage: context.ratePack.childcare.reimbursementPercentage, cap },
    output: amount,
    legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE]
  })

  return {
    value: { type: "childcare_element", label: "Childcare element", amount: amount ?? zeroGbp(), traceRuleIds: [trace.ruleId] },
    trace: [trace],
    warnings: []
  }
}
