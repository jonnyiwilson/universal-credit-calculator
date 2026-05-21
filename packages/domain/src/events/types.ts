import type { EntityId, ISODate } from "../../../shared/src"

export type CaseEventType =
  | "case_created"
  | "adult_added"
  | "child_added"
  | "housing_declared"
  | "income_reported"
  | "capital_declared"
  | "evidence_added"
  | "health_declared"
  | "sanction_reported"
  | "migration_notice_reported"
  | "assessment_revised"

export interface CaseEvent {
  eventId: EntityId
  caseId: EntityId
  type: CaseEventType
  occurredAt: ISODate
  reportedAt: string
  verifiedAt?: string
  effectiveFrom?: ISODate
  effectiveTo?: ISODate
  payload: unknown
  evidenceRefs: EntityId[]
}
