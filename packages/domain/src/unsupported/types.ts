import type { EntityId } from "../../../shared/src"

export type CalculationConfidence = "determined" | "partial" | "unsupported"

export interface UnsupportedCase {
  unsupportedCaseId: EntityId
  code: string
  severity: "blocking" | "non_blocking"
  reason: string
  affectedStages: string[]
  userMessage: string
  internalNotes: string
}

export function confidenceFromUnsupportedCases(cases: UnsupportedCase[]): CalculationConfidence {
  if (cases.some((item) => item.severity === "blocking")) return "unsupported"
  if (cases.length > 0) return "partial"
  return "determined"
}
