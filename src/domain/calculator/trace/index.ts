import type { CalculationStage, CalculationTraceEntry, LegislationReference } from "../../types/calculation"

export function traceEntry(input: {
  ruleId: string
  stage: CalculationStage
  label: string
  formula?: string
  inputs: Record<string, unknown>
  output: unknown
  legislationRefs: LegislationReference[]
}): CalculationTraceEntry {
  return input
}
