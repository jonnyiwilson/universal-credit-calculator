import { canonicalJson, createEntityId, stableHash } from "../../../../packages/shared/src"
import type { Assumption, AssessmentPeriod, AssessmentPeriodSnapshot, CalculationArtifact, ReducedAssessmentPeriodState, UniversalCreditCase, DecisionReason, CaseEvent } from "../../../../packages/domain/src"
import type { DerivedArtifact, TraceEntry } from "../../../../packages/rules-engine/src"
import { AppError } from "../../../lib/errors/AppError"
import type { Env } from "../types"

export async function getIdempotentResponse(env: Env, key: string, route: string, requestHash?: string): Promise<unknown | null> {
  const row = await env.DB.prepare("SELECT response_json, expires_at, request_hash FROM idempotency_keys_v2 WHERE key = ? AND route = ?").bind(key, route).first()
  if (row?.expires_at && String(row.expires_at) <= new Date().toISOString()) return null
  if (row && requestHash && row.request_hash && String(row.request_hash) !== requestHash) {
    throw new AppError("VALIDATION_FAILED", "Idempotency key was reused with a different request body.", 409)
  }
  return row ? JSON.parse(String(row.response_json)) : null
}

export async function validateCaseAccessToken(env: Env, caseId: string, token: string, now: string): Promise<boolean> {
  const tokenHash = stableHash(token)
  const row = await env.DB.prepare(
    `SELECT token_id, expires_at, revoked_at
     FROM access_tokens_v2
     WHERE case_id = ? AND token_hash = ?
     LIMIT 1`
  ).bind(caseId, tokenHash).first()
  if (!row) return false
  if (row.revoked_at) return false
  if (String(row.expires_at) <= now) return false
  await env.DB.prepare(
    `UPDATE access_tokens_v2
     SET last_used_at = ?, usage_count = COALESCE(usage_count, 0) + 1
     WHERE token_id = ?`
  ).bind(now, String(row.token_id)).run()
  return true
}

export async function caseIdForAssessmentPeriod(env: Env, assessmentPeriodId: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT case_id FROM assessment_periods_v2 WHERE assessment_period_id = ?").bind(assessmentPeriodId).first()
  return row ? String(row.case_id) : null
}

export async function putIdempotentResponse(env: Env, key: string, route: string, response: unknown, now: string, requestHash?: string): Promise<void> {
  const responseJson = JSON.stringify(response)
  await env.DB.prepare("INSERT OR REPLACE INTO idempotency_keys_v2 (key, route, response_json, created_at, request_hash, expires_at) VALUES (?, ?, ?, ?, COALESCE((SELECT request_hash FROM idempotency_keys_v2 WHERE key = ? AND route = ?), ?), ?)")
    .bind(key, route, responseJson, now, key, route, requestHash ?? stableHash(responseJson), new Date(Date.parse(now) + 1000 * 60 * 60 * 24).toISOString())
    .run()
}

export async function saveCaseV2(env: Env, input: {
  universalCreditCase: UniversalCreditCase
  assessmentPeriod: AssessmentPeriod
  now: string
}) {
  const caseSnapshotId = createEntityId("case_snapshot")
  const caseSnapshotJson = canonicalJson(input.universalCreditCase)
  const accessToken = crypto.randomUUID()
  const tokenId = createEntityId("token")
  const tokenHash = stableHash(accessToken)
  const tokenExpiry = new Date(Date.parse(input.now) + 1000 * 60 * 60 * 24 * 90).toISOString()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO cases_v2 (
        case_id, case_version, status, jurisdiction, latest_snapshot_id,
        created_at, updated_at, schema_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.universalCreditCase.caseId,
      input.universalCreditCase.caseVersion,
      input.universalCreditCase.status,
      input.universalCreditCase.jurisdiction,
      caseSnapshotId,
      input.now,
      input.now,
      input.universalCreditCase.metadata.schemaVersion
    ),
    env.DB.prepare(
      `INSERT INTO case_snapshots_v2 (
        snapshot_id, case_id, case_version, snapshot_json, snapshot_hash, created_at, schema_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      caseSnapshotId,
      input.universalCreditCase.caseId,
      input.universalCreditCase.caseVersion,
      caseSnapshotJson,
      stableHash(caseSnapshotJson),
      input.now,
      input.universalCreditCase.metadata.schemaVersion
    ),
    ...input.universalCreditCase.timeline.map((event, index) =>
      env.DB.prepare(
        `INSERT INTO case_events_v2 (
          event_id, case_id, event_type, occurred_at, reported_at, verified_at,
          effective_from, effective_to, payload_json, evidence_refs_json, sequence_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        event.eventId,
        event.caseId,
        event.type,
        event.occurredAt,
        event.reportedAt,
        event.verifiedAt ?? null,
        event.effectiveFrom ?? null,
        event.effectiveTo ?? null,
        JSON.stringify(event.payload),
        JSON.stringify(event.evidenceRefs),
        index + 1
      )
    ),
    env.DB.prepare(
      `INSERT INTO assessment_periods_v2 (
        assessment_period_id, case_id, sequence_no, start_date, end_date,
        status, source_events_json, calculation_artifacts_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.assessmentPeriod.assessmentPeriodId,
      input.assessmentPeriod.caseId,
      input.assessmentPeriod.sequenceNumber,
      input.assessmentPeriod.startDate,
      input.assessmentPeriod.endDate,
      input.assessmentPeriod.status,
      JSON.stringify(input.assessmentPeriod.sourceEvents),
      JSON.stringify(input.assessmentPeriod.calculationArtifacts)
    ),
    env.DB.prepare(
      `INSERT INTO access_tokens_v2 (
        token_id, case_id, token_hash, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?)`
    ).bind(tokenId, input.universalCreditCase.caseId, tokenHash, tokenExpiry, input.now)
  ])

  return {
    caseSnapshotId,
    accessToken,
    tokenExpiresAt: tokenExpiry
  }
}

export async function loadCaseForAssessmentPeriod(env: Env, assessmentPeriodId: string) {
  const ap = await env.DB.prepare("SELECT * FROM assessment_periods_v2 WHERE assessment_period_id = ?").bind(assessmentPeriodId).first()
  if (!ap) return null

  const snapshot = await env.DB.prepare(
    `SELECT snapshot_json FROM case_snapshots_v2
     WHERE case_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(String(ap.case_id)).first()

  if (!snapshot) return null

  const universalCreditCase = JSON.parse(String(snapshot.snapshot_json)) as UniversalCreditCase
  const eventRows = await env.DB.prepare(
    `SELECT event_id, case_id, event_type, occurred_at, reported_at, verified_at,
            effective_from, effective_to, payload_json, evidence_refs_json, sequence_no
     FROM case_events_v2
     WHERE case_id = ?
     ORDER BY sequence_no ASC`
  ).bind(String(ap.case_id)).all()
  universalCreditCase.timeline = (eventRows.results ?? []).map((row) => ({
    eventId: String(row.event_id),
    caseId: String(row.case_id),
    type: String(row.event_type) as CaseEvent["type"],
    occurredAt: String(row.occurred_at),
    reportedAt: String(row.reported_at),
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    effectiveFrom: row.effective_from ? String(row.effective_from) : undefined,
    effectiveTo: row.effective_to ? String(row.effective_to) : undefined,
    payload: row.payload_json ? JSON.parse(String(row.payload_json)) : {},
    evidenceRefs: row.evidence_refs_json ? JSON.parse(String(row.evidence_refs_json)) as string[] : []
  }))

  return {
    universalCreditCase,
    assessmentPeriod: {
      assessmentPeriodId: String(ap.assessment_period_id),
      caseId: String(ap.case_id),
      sequenceNumber: Number(ap.sequence_no),
      startDate: String(ap.start_date),
      endDate: String(ap.end_date),
      status: String(ap.status) as AssessmentPeriod["status"],
      sourceEvents: JSON.parse(String(ap.source_events_json)) as string[],
      calculationArtifacts: JSON.parse(String(ap.calculation_artifacts_json)) as string[]
    } satisfies AssessmentPeriod
  }
}

export async function appendCaseEventV2(env: Env, input: { caseId: string; event: CaseEvent }) {
  const latest = await env.DB.prepare("SELECT MAX(sequence_no) AS max_sequence FROM case_events_v2 WHERE case_id = ?").bind(input.caseId).first()
  const nextSequence = Number(latest?.max_sequence ?? 0) + 1
  await env.DB.prepare(
    `INSERT INTO case_events_v2 (
      event_id, case_id, event_type, occurred_at, reported_at, verified_at,
      effective_from, effective_to, payload_json, evidence_refs_json, sequence_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.event.eventId,
    input.caseId,
    input.event.type,
    input.event.occurredAt,
    input.event.reportedAt,
    input.event.verifiedAt ?? null,
    input.event.effectiveFrom ?? null,
    input.event.effectiveTo ?? null,
    JSON.stringify(input.event.payload),
    JSON.stringify(input.event.evidenceRefs),
    nextSequence
  ).run()
  return nextSequence
}

export async function saveCalculationArtifactV2(env: Env, input: {
  snapshot: AssessmentPeriodSnapshot
  artifact: CalculationArtifact
  traces: TraceEntry[]
  assumptions: Assumption[]
  derivedArtifacts: DerivedArtifact[]
  reduction?: { reducerVersion: string; reducedState: ReducedAssessmentPeriodState }
  unsupportedCases: Array<{
    unsupportedCaseId: string
    code: string
    severity: string
    reason: string
    affectedStages: string[]
    userMessage: string
    internalNotes: string
  }>
}) {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO assessment_period_snapshots_v2 (
        snapshot_id, assessment_period_id, snapshot_version, created_at, reason,
        normalized_case_json, source_event_ids_json, input_hash, rule_pack_version, rate_pack_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.snapshot.snapshotId,
      input.snapshot.assessmentPeriodId,
      input.snapshot.snapshotVersion,
      input.snapshot.createdAt,
      input.snapshot.reason,
      input.snapshot.normalizedCaseJson,
      JSON.stringify(input.snapshot.sourceEventIds),
      input.snapshot.inputHash,
      input.snapshot.rulePackVersion,
      input.snapshot.ratePackVersion
    ),
    env.DB.prepare(
      `INSERT INTO calculation_artifacts_v2 (
        artifact_id, case_id, assessment_period_id, snapshot_id, calculation_mode,
        status, final_award_pence, rate_pack_version, rate_pack_checksum,
        rule_pack_version, rule_pack_checksum, input_hash, output_hash,
        reducer_version, reducer_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.artifact.artifactId,
      input.artifact.caseId,
      input.artifact.assessmentPeriodId,
      input.artifact.snapshotId,
      input.artifact.calculationMode,
      input.artifact.status,
      input.artifact.finalAwardPence ?? null,
      input.artifact.ratePackVersion,
      input.artifact.ratePackChecksum,
      input.artifact.rulePackVersion,
      input.artifact.rulePackChecksum,
      input.artifact.inputHash,
        input.artifact.outputHash,
        input.artifact.reducerVersion ?? null,
        input.artifact.reducerHash ?? null,
        input.artifact.createdAt
    ),
    ...input.traces.map((trace, index) =>
      env.DB.prepare(
        `INSERT INTO calculation_traces_v2 (
          trace_id, artifact_id, sequence_no, rule_id, rule_version, stage,
          legal_basis_json, inputs_hash, input_excerpt_json, output_json, formula,
          evidence_refs_json, assumption_refs_json, derived_artifact_refs_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        trace.traceId,
        input.artifact.artifactId,
        index + 1,
        trace.ruleId,
        trace.ruleVersion,
        trace.stage,
        JSON.stringify(trace.legalBasis),
        trace.inputsHash,
        JSON.stringify(trace.inputExcerpt),
        JSON.stringify(trace.output),
        trace.formula ?? null,
        JSON.stringify(trace.evidenceRefs),
        JSON.stringify(trace.assumptionRefs),
        JSON.stringify(trace.derivedArtifactRefs)
      )
    ),
    ...input.derivedArtifacts.map((item) =>
      env.DB.prepare(
        `INSERT INTO derived_artifacts_v2 (
          derived_artifact_id, artifact_id, artifact_type, schema_version, value_json, value_hash
        ) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        createEntityId("derived"),
        input.artifact.artifactId,
        item.artifactType,
        item.schemaVersion,
        JSON.stringify(item.value),
        stableHash(item.value)
      )
    ),
    ...input.assumptions.map((item) =>
      env.DB.prepare(
        `INSERT INTO assumptions_v2 (
          assumption_id, artifact_id, severity, code, message, assumed_value_json,
          affected_rule_ids_json, can_user_resolve, resolution_prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.assumptionId,
        input.artifact.artifactId,
        item.severity,
        item.code,
        item.message,
        item.assumedValue === undefined ? null : JSON.stringify(item.assumedValue),
        JSON.stringify(item.affectedRuleIds),
        item.canUserResolve ? 1 : 0,
        item.resolutionPrompt ?? null
      )
    ),
    ...input.unsupportedCases.map((item) =>
      env.DB.prepare(
        `INSERT INTO unsupported_cases_v2 (
          unsupported_case_id, artifact_id, code, severity, reason,
          affected_stages_json, user_message, internal_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.unsupportedCaseId,
        input.artifact.artifactId,
        item.code,
        item.severity,
        item.reason,
        JSON.stringify(item.affectedStages),
        item.userMessage,
        item.internalNotes
      )
    ),
    ...(input.reduction
      ? [
          env.DB.prepare(
            `INSERT INTO case_reductions_v2 (
              reduction_id, case_id, assessment_period_id, snapshot_id, reducer_version,
              reduction_hash, mode, effective_event_ids_json, superseded_event_ids_json,
              revision_reasons_json, reduced_state_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            createEntityId("reduction"),
            input.artifact.caseId,
            input.artifact.assessmentPeriodId,
            input.snapshot.snapshotId,
            input.reduction.reducerVersion,
            input.reduction.reducedState.reductionHash,
            input.artifact.calculationMode,
            JSON.stringify(input.reduction.reducedState.effectiveEventIds),
            JSON.stringify(input.reduction.reducedState.supersededEventIds),
            JSON.stringify(input.reduction.reducedState.revisionReasons satisfies DecisionReason[]),
            JSON.stringify(input.reduction.reducedState),
            input.artifact.createdAt
          )
        ]
      : [])
  ])
}
