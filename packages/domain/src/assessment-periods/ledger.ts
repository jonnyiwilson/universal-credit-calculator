import { canonicalJson, createEntityId, stableHash } from "../../../shared/src"
import type { UniversalCreditCase } from "../entities/types"
import type { ReducedAssessmentPeriodState } from "../reducers/types"
import type { AssessmentPeriod, AssessmentPeriodSnapshot } from "./types"

export function createAssessmentPeriod(input: {
  caseId: string
  sequenceNumber: number
  startDate: string
  endDate: string
  sourceEvents?: string[]
}): AssessmentPeriod {
  if (new Date(input.endDate).getTime() < new Date(input.startDate).getTime()) {
    throw new Error("Assessment period end date cannot be before start date.")
  }

  return {
    assessmentPeriodId: createEntityId("ap"),
    caseId: input.caseId,
    sequenceNumber: input.sequenceNumber,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "open",
    sourceEvents: input.sourceEvents ?? [],
    calculationArtifacts: []
  }
}

export function createSnapshotFromReducedState(input: {
  reducedState: ReducedAssessmentPeriodState
  assessmentPeriod: AssessmentPeriod
  snapshotVersion: number
  reason: AssessmentPeriodSnapshot["reason"]
  rulePackVersion: string
  ratePackVersion: string
  createdAt: string
}): AssessmentPeriodSnapshot {
  const normalizedCaseJson = canonicalJson(input.reducedState)
  return {
    snapshotId: createEntityId("aps"),
    assessmentPeriodId: input.assessmentPeriod.assessmentPeriodId,
    snapshotVersion: input.snapshotVersion,
    createdAt: input.createdAt,
    reason: input.reason,
    normalizedCaseJson,
    sourceEventIds: input.reducedState.effectiveEventIds,
    inputHash: stableHash(normalizedCaseJson),
    rulePackVersion: input.rulePackVersion,
    ratePackVersion: input.ratePackVersion
  }
}

export function createAssessmentPeriodSnapshot(input: {
  universalCreditCase: UniversalCreditCase
  assessmentPeriod: AssessmentPeriod
  snapshotVersion: number
  reason: AssessmentPeriodSnapshot["reason"]
  rulePackVersion: string
  ratePackVersion: string
  createdAt: string
}): AssessmentPeriodSnapshot {
  const sourceEvents = input.universalCreditCase.timeline
    .filter((event) => {
      const effective = event.effectiveFrom ?? event.occurredAt
      return effective <= input.assessmentPeriod.endDate
    })
    .map((event) => event.eventId)

  const normalizedCaseJson = canonicalJson({
    caseId: input.universalCreditCase.caseId,
    household: input.universalCreditCase.household,
    incomeEvents: input.universalCreditCase.incomeEvents,
    capitalAssets: input.universalCreditCase.capitalAssets,
    sourceEvents
  })

  return {
    snapshotId: createEntityId("aps"),
    assessmentPeriodId: input.assessmentPeriod.assessmentPeriodId,
    snapshotVersion: input.snapshotVersion,
    createdAt: input.createdAt,
    reason: input.reason,
    normalizedCaseJson,
    sourceEventIds: sourceEvents,
    inputHash: stableHash(normalizedCaseJson),
    rulePackVersion: input.rulePackVersion,
    ratePackVersion: input.ratePackVersion
  }
}
