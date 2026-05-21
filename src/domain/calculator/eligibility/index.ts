import { traceEntry } from "../trace"
import { addMoney } from "../../types/money"
import type { CalculationContext, CalculationStageResult, EligibilityResult } from "../../types/calculation"

export function evaluateEligibility(context: CalculationContext): CalculationStageResult<EligibilityResult> {
  const totalCapital = addMoney(
    context.input.capital.cashSavings,
    context.input.capital.investments,
    context.input.capital.propertyCapital,
    context.input.capital.notionalCapital
  )
  const eligible = totalCapital.amountPence <= context.ratePack.capital.upperThreshold.amountPence
  const reasons = eligible ? [] : ["Assessable capital exceeds the Universal Credit upper capital threshold."]

  return {
    value: { eligible, reasons },
    trace: [
      traceEntry({
        ruleId: "ELIG-001",
        stage: "eligibility",
        label: "Capital eligibility threshold",
        formula: "eligible = totalCapital <= upperCapitalThreshold",
        inputs: {
          totalCapital,
          upperCapitalThreshold: context.ratePack.capital.upperThreshold
        },
        output: { eligible, reasons },
        legislationRefs: [context.legislation.UC_REGULATIONS_2013, context.legislation.ADM_STAFF_GUIDE]
      })
    ],
    warnings: context.input.capital.deprivationOfCapital
      ? [
          {
            code: "CAPITAL_DEPRIVATION_FLAGGED",
            severity: "warning",
            message: "Capital deprivation was flagged. A decision maker may treat some disposed assets as notional capital."
          }
        ]
      : []
  }
}
