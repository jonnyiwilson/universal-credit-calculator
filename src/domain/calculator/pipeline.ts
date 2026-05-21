import { calculateCapitalDeduction } from "./capital"
import { calculateEarningsDeduction } from "./earnings"
import { calculateEntitlement } from "./entitlement"
import { evaluateEligibility } from "./eligibility"
import { calculateFinalAward } from "./final-award"
import { calculateOtherDeductions } from "./deductions"
import { legislationReferences } from "../legislation/references"
import { getRatePack } from "../rates"
import type { AssessmentInput, AssessmentPeriod } from "../types/assessment"
import type { AwardDeduction, CalculationResult, CalculationTraceEntry } from "../types/calculation"

export const calculationEngineVersion = "0.1.0"

export interface RunCalculationInput {
  input: AssessmentInput
  rateVersion?: string
  assessmentPeriod: AssessmentPeriod
}

export interface RunCalculationOutput {
  rateVersion: string
  calculationEngineVersion: string
  result: CalculationResult
  trace: CalculationTraceEntry[]
}

export function runUniversalCreditCalculation(request: RunCalculationInput): RunCalculationOutput {
  const ratePack = getRatePack(request.rateVersion)
  const context = {
    input: request.input,
    ratePack,
    legislation: legislationReferences,
    assessmentPeriod: request.assessmentPeriod
  }

  const eligibility = evaluateEligibility(context)
  const entitlement = calculateEntitlement(context)
  const earnings = calculateEarningsDeduction(context)
  const capital = calculateCapitalDeduction(context)
  const otherDeductions = calculateOtherDeductions(context)

  const deductions: AwardDeduction[] = [
    ...(earnings.value ? [earnings.value] : []),
    ...(capital.value ? [capital.value] : []),
    ...otherDeductions.value
  ]

  const final = calculateFinalAward(context, eligibility.value, entitlement.value.elements, deductions)
  final.value.warnings = [
    ...eligibility.warnings,
    ...entitlement.warnings,
    ...earnings.warnings,
    ...capital.warnings,
    ...otherDeductions.warnings,
    ...final.warnings
  ]

  return {
    rateVersion: ratePack.version,
    calculationEngineVersion,
    result: final.value,
    trace: [
      ...eligibility.trace,
      ...entitlement.trace,
      ...earnings.trace,
      ...capital.trace,
      ...otherDeductions.trace,
      ...final.trace
    ]
  }
}
