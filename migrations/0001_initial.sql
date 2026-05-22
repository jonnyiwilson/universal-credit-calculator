CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT NOT NULL,
  claimant_reference TEXT,
  assessment_period_start TEXT NOT NULL,
  assessment_period_end TEXT NOT NULL,
  rate_version TEXT NOT NULL,
  calculation_engine_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_inputs (
  assessment_id TEXT PRIMARY KEY,
  input_json TEXT NOT NULL,
  input_schema_version TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  assessment_id TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  final_award_pence INTEGER NOT NULL,
  maximum_entitlement_pence INTEGER NOT NULL,
  total_deductions_pence INTEGER NOT NULL,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

CREATE TABLE IF NOT EXISTS calculation_traces (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  trace_json TEXT NOT NULL,
  legislation_refs_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

CREATE TABLE IF NOT EXISTS rate_versions (
  version TEXT PRIMARY KEY,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  source_url TEXT,
  rates_json TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_events (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_traces_assessment_id ON calculation_traces(assessment_id);
