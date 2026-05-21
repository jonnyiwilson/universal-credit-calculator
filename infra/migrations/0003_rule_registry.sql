CREATE TABLE IF NOT EXISTS calculation_artifacts_v2 (
  artifact_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  calculation_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  final_award_pence INTEGER,
  rate_pack_version TEXT NOT NULL,
  rate_pack_checksum TEXT NOT NULL,
  rule_pack_version TEXT NOT NULL,
  rule_pack_checksum TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id),
  FOREIGN KEY (assessment_period_id) REFERENCES assessment_periods_v2(assessment_period_id)
);

CREATE TABLE IF NOT EXISTS calculation_traces_v2 (
  trace_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  sequence_no INTEGER NOT NULL,
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  stage TEXT NOT NULL,
  legal_basis_json TEXT NOT NULL,
  inputs_hash TEXT NOT NULL,
  input_excerpt_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  formula TEXT,
  evidence_refs_json TEXT NOT NULL,
  assumption_refs_json TEXT NOT NULL,
  derived_artifact_refs_json TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS derived_artifacts_v2 (
  derived_artifact_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  value_json TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS assumptions_v2 (
  assumption_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  assumed_value_json TEXT,
  affected_rule_ids_json TEXT NOT NULL,
  can_user_resolve INTEGER NOT NULL,
  resolution_prompt TEXT,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS unsupported_cases_v2 (
  unsupported_case_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  reason TEXT NOT NULL,
  affected_stages_json TEXT NOT NULL,
  user_message TEXT NOT NULL,
  internal_notes TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS rate_packs_v2 (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  checksum TEXT NOT NULL,
  pack_json TEXT NOT NULL,
  approved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_packs_v2 (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  checksum TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  approved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legislative_references_v2 (
  reference_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  citation_json TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports_v2 (
  report_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  report_schema_version TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  storage_ref TEXT,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys_v2 (
  key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_tokens_v2 (
  token_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id)
);

CREATE TABLE IF NOT EXISTS audit_log_v2 (
  audit_id TEXT PRIMARY KEY,
  case_id TEXT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifacts_v2_case_id ON calculation_artifacts_v2(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_traces_v2_artifact ON calculation_traces_v2(artifact_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_unsupported_v2_artifact ON unsupported_cases_v2(artifact_id);
