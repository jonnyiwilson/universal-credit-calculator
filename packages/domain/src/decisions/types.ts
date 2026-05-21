import type { EntityId } from "../../../shared/src"
import type { Assumption } from "../assumptions/types"

export interface DecisionReason {
  code: string
  message: string
  severity: "info" | "warning" | "blocking"
}

export interface DerivedDecision<T> {
  decisionId: EntityId
  status: "determined" | "not_eligible" | "unknown" | "unsupported"
  value?: T
  reasons: DecisionReason[]
  assumptions: Assumption[]
  evidenceRefs: EntityId[]
  traceRefs: EntityId[]
}
