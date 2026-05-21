import { createStateMachine } from "./createStateMachine"

export type ClaimStateMachineState = "draft" | "submitted" | "active" | "nil_award" | "closed" | "reclaimed" | "revised" | "appealed"
export type WcaLifecycleState = "not_declared" | "health_condition_declared" | "fit_note_provided" | "referred" | "assessment_pending" | "lcw_awarded" | "lcwra_awarded" | "no_lcw" | "mandatory_reconsideration" | "appeal" | "superseded"
export type EvidenceLifecycleState = "missing" | "requested" | "provided" | "verified" | "rejected" | "expired" | "superseded"

export const claimLifecycle = createStateMachine<ClaimStateMachineState>([
  { from: "draft", to: "submitted", event: "submit" },
  { from: "submitted", to: "active", event: "activate" },
  { from: "active", to: "nil_award", event: "nil_award" },
  { from: "nil_award", to: "active", event: "award_restored" },
  { from: "nil_award", to: "closed", event: "closure" },
  { from: "closed", to: "reclaimed", event: "reclaim" },
  { from: "active", to: "revised", event: "revision" },
  { from: "revised", to: "active", event: "revision_applied" },
  { from: "active", to: "appealed", event: "appeal" },
  { from: "appealed", to: "active", event: "appeal_resolved" }
])

export const wcaLifecycle = createStateMachine<WcaLifecycleState>([
  { from: "not_declared", to: "health_condition_declared", event: "declare_health" },
  { from: "health_condition_declared", to: "fit_note_provided", event: "provide_fit_note" },
  { from: "fit_note_provided", to: "referred", event: "refer" },
  { from: "referred", to: "assessment_pending", event: "await_assessment" },
  { from: "assessment_pending", to: "lcw_awarded", event: "award_lcw" },
  { from: "assessment_pending", to: "lcwra_awarded", event: "award_lcwra" },
  { from: "assessment_pending", to: "no_lcw", event: "award_no_lcw" },
  { from: "no_lcw", to: "mandatory_reconsideration", event: "mr" },
  { from: "mandatory_reconsideration", to: "appeal", event: "appeal" },
  { from: "lcw_awarded", to: "superseded", event: "supersede" },
  { from: "lcwra_awarded", to: "superseded", event: "supersede" }
])

export const evidenceLifecycle = createStateMachine<EvidenceLifecycleState>([
  { from: "missing", to: "requested", event: "request" },
  { from: "requested", to: "provided", event: "provide" },
  { from: "provided", to: "verified", event: "verify" },
  { from: "provided", to: "rejected", event: "reject" },
  { from: "verified", to: "expired", event: "expire" },
  { from: "verified", to: "superseded", event: "supersede" }
])
