ALTER TABLE case_events_v2 ADD COLUMN event_schema_version TEXT;
ALTER TABLE case_events_v2 ADD COLUMN payload_hash TEXT;
ALTER TABLE case_events_v2 ADD COLUMN supersedes_event_id TEXT;

ALTER TABLE case_reductions_v2 ADD COLUMN reducer_artifacts_json TEXT;
ALTER TABLE case_reductions_v2 ADD COLUMN source_event_ids_json TEXT;

ALTER TABLE calculation_artifacts_v2 ADD COLUMN policy_correction_reason TEXT;

ALTER TABLE derived_artifacts_v2 ADD COLUMN sequence_no INTEGER;
ALTER TABLE derived_artifacts_v2 ADD COLUMN source_rule_ids_json TEXT;

ALTER TABLE assumptions_v2 ADD COLUMN user_visible INTEGER DEFAULT 1;
ALTER TABLE assumptions_v2 ADD COLUMN blocking INTEGER DEFAULT 0;
ALTER TABLE assumptions_v2 ADD COLUMN resolution_status TEXT DEFAULT 'open';

CREATE TABLE IF NOT EXISTS rate_packs_v2 (
  rate_pack_id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  checksum TEXT NOT NULL,
  signature TEXT,
  source_refs_json TEXT NOT NULL,
  rates_json TEXT NOT NULL,
  prepared_by TEXT NOT NULL,
  reviewed_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_packs_v2 (
  rule_pack_id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  manifest_checksum TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports_v2 (
  report_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  report_schema_version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  storage_ref TEXT,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS audit_log_v2 (
  audit_id TEXT PRIMARY KEY,
  case_id TEXT,
  artifact_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lha_rates_v2 (
  lha_rate_id TEXT PRIMARY KEY,
  brma_code TEXT NOT NULL,
  bedroom_category INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  amount_pence INTEGER NOT NULL,
  source_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_case_events_effective_v2 ON case_events_v2(case_id, effective_from, sequence_no);
CREATE INDEX IF NOT EXISTS idx_derived_artifacts_artifact_type_sequence_v2 ON derived_artifacts_v2(artifact_id, artifact_type, sequence_no);
CREATE INDEX IF NOT EXISTS idx_lha_rates_lookup_v2 ON lha_rates_v2(brma_code, bedroom_category, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_audit_log_case_event_v2 ON audit_log_v2(case_id, event_type, created_at);
