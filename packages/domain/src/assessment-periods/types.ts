import type { EntityId, ISODate } from "../../../shared/src"

export interface AssessmentPeriod {
  assessmentPeriodId: EntityId
  caseId: EntityId
  sequenceNumber: number
  startDate: ISODate
  endDate: ISODate
  status: "open" | "awaiting_evidence" | "calculated" | "paid" | "revised" | "superseded"
  sourceEvents: EntityId[]
  calculationArtifacts: EntityId[]
}

export interface AssessmentPeriodSnapshot {
  snapshotId: EntityId
  assessmentPeriodId: EntityId
  snapshotVersion: number
  createdAt: string
  reason: "initial" | "late_change" | "appeal" | "official_error" | "policy_correction"
  normalizedCaseJson: string
  sourceEventIds: EntityId[]
  inputHash: string
  rulePackVersion: string
  ratePackVersion: string
}

export interface CalculationArtifact {
  artifactId: EntityId
  caseId: EntityId
  assessmentPeriodId: EntityId
  snapshotId: EntityId
  calculationMode: "original" | "revision" | "appeal" | "comparison"
  status: "determined" | "partial" | "unsupported" | "failed"
  finalAwardPence?: number
  ratePackVersion: string
  ratePackChecksum: string
  rulePackVersion: string
  rulePackChecksum: string
  inputHash: string
  outputHash: string
  reducerVersion?: string
  reducerHash?: string
  createdAt: string
}
