CREATE TABLE IF NOT EXISTS cases_v2 (
  case_id TEXT PRIMARY KEY,
  case_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  latest_snapshot_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  schema_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_events_v2 (
  event_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  verified_at TEXT,
  effective_from TEXT,
  effective_to TEXT,
  payload_json TEXT NOT NULL,
  evidence_refs_json TEXT NOT NULL,
  sequence_no INTEGER NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id)
);

CREATE TABLE IF NOT EXISTS case_snapshots_v2 (
  snapshot_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id)
);

CREATE TABLE IF NOT EXISTS evidence_records_v2 (
  evidence_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  status TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  verified_at TEXT,
  storage_ref TEXT,
  notes TEXT,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id)
);

CREATE TABLE IF NOT EXISTS assessment_periods_v2 (
  assessment_period_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  sequence_no INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  source_events_json TEXT NOT NULL,
  calculation_artifacts_json TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases_v2(case_id)
);

CREATE TABLE IF NOT EXISTS assessment_period_snapshots_v2 (
  snapshot_id TEXT PRIMARY KEY,
  assessment_period_id TEXT NOT NULL,
  snapshot_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  normalized_case_json TEXT NOT NULL,
  source_event_ids_json TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  rule_pack_version TEXT NOT NULL,
  rate_pack_version TEXT NOT NULL,
  FOREIGN KEY (assessment_period_id) REFERENCES assessment_periods_v2(assessment_period_id)
);

CREATE INDEX IF NOT EXISTS idx_cases_v2_updated_at ON cases_v2(updated_at);
CREATE INDEX IF NOT EXISTS idx_case_events_v2_case_id ON case_events_v2(case_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_ap_v2_case_id ON assessment_periods_v2(case_id, sequence_no);
