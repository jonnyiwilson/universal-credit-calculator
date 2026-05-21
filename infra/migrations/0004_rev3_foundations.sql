ALTER TABLE access_tokens_v2 ADD COLUMN revoked_at TEXT;
ALTER TABLE access_tokens_v2 ADD COLUMN last_used_at TEXT;
ALTER TABLE access_tokens_v2 ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE access_tokens_v2 ADD COLUMN purpose TEXT NOT NULL DEFAULT 'anonymous_case_access';

ALTER TABLE idempotency_keys_v2 ADD COLUMN request_hash TEXT;
ALTER TABLE idempotency_keys_v2 ADD COLUMN expires_at TEXT;

ALTER TABLE derived_artifacts_v2 ADD COLUMN value_hash TEXT;

ALTER TABLE calculation_artifacts_v2 ADD COLUMN reducer_version TEXT;
ALTER TABLE calculation_artifacts_v2 ADD COLUMN reducer_hash TEXT;

CREATE TABLE IF NOT EXISTS case_reductions_v2 (
  reduction_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  reducer_version TEXT NOT NULL,
  reduction_hash TEXT NOT NULL,
  mode TEXT NOT NULL,
  effective_event_ids_json TEXT NOT NULL,
  superseded_event_ids_json TEXT NOT NULL,
  revision_reasons_json TEXT NOT NULL,
  reduced_state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id),
  FOREIGN KEY (assessment_period_id) REFERENCES assessment_periods_v2(assessment_period_id),
  FOREIGN KEY (snapshot_id) REFERENCES assessment_period_snapshots_v2(snapshot_id)
);

CREATE TABLE IF NOT EXISTS self_employment_states_v2 (
  state_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  adult_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  state TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id)
);

CREATE TABLE IF NOT EXISTS rule_execution_manifests_v2 (
  manifest_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  rule_pack_version TEXT NOT NULL,
  rule_pack_checksum TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS golden_scenario_results_v2 (
  result_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  artifact_id TEXT,
  status TEXT NOT NULL,
  expected_hash TEXT NOT NULL,
  actual_hash TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tokens_hash_expires_v2 ON access_tokens_v2(token_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_reductions_ap_snapshot_v2 ON case_reductions_v2(assessment_period_id, snapshot_id);
CREATE INDEX IF NOT EXISTS idx_derived_artifact_type_v2 ON derived_artifacts_v2(artifact_type);
CREATE INDEX IF NOT EXISTS idx_idempotency_route_key_v2 ON idempotency_keys_v2(route, key);
