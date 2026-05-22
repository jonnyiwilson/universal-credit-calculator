ALTER TABLE calculation_artifacts_v2 ADD COLUMN replay_verified_at TEXT;
ALTER TABLE calculation_artifacts_v2 ADD COLUMN replay_status TEXT;
ALTER TABLE rate_packs_v2 ADD COLUMN governance_approval_id TEXT;
ALTER TABLE rule_packs_v2 ADD COLUMN governance_approval_id TEXT;
ALTER TABLE reports_v2 ADD COLUMN replay_status TEXT;
ALTER TABLE reports_v2 ADD COLUMN signed_access_token_id TEXT;

CREATE TABLE IF NOT EXISTS golden_scenarios_v2 (
  scenario_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  rate_pack_version TEXT NOT NULL,
  rule_pack_version TEXT NOT NULL,
  source_refs_json TEXT NOT NULL,
  input_events_json TEXT NOT NULL,
  assessment_periods_json TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  review_status TEXT NOT NULL,
  scenario_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS golden_expected_artifacts_v2 (
  expected_artifact_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  expected_json TEXT NOT NULL,
  expected_hash TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES golden_scenarios_v2(scenario_id)
);

CREATE TABLE IF NOT EXISTS replay_runs_v2 (
  replay_run_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  status TEXT NOT NULL,
  diff_hash TEXT NOT NULL,
  diff_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES calculation_artifacts_v2(artifact_id)
);

CREATE TABLE IF NOT EXISTS replay_diffs_v2 (
  replay_diff_id TEXT PRIMARY KEY,
  replay_run_id TEXT NOT NULL,
  field TEXT NOT NULL,
  original_value_json TEXT,
  replay_value_json TEXT,
  FOREIGN KEY (replay_run_id) REFERENCES replay_runs_v2(replay_run_id)
);

CREATE TABLE IF NOT EXISTS tp_baselines_v2 (
  tp_baseline_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  baseline_amount_pence INTEGER NOT NULL,
  source_event_id TEXT NOT NULL,
  baseline_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tp_ap_states_v2 (
  tp_state_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  state TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  erosion_pence INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS surplus_earnings_ledger_v2 (
  surplus_ledger_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  carried_forward_pence INTEGER NOT NULL,
  source_artifact_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payroll_adjustments_v2 (
  payroll_adjustment_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  income_event_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  adjustment_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lha_imports_v2 (
  lha_import_id TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  source_url TEXT NOT NULL,
  checksum TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sanction_states_v2 (
  sanction_state_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  state TEXT NOT NULL,
  rate_category TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deduction_applications_v2 (
  deduction_application_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  assessment_period_id TEXT NOT NULL,
  deduction_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  amount_pence INTEGER NOT NULL,
  recovery_class TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS governance_approvals_v2 (
  governance_approval_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_version TEXT NOT NULL,
  prepared_by TEXT NOT NULL,
  policy_reviewed_by TEXT NOT NULL,
  engineering_reviewed_by TEXT NOT NULL,
  qa_reviewed_by TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  source_refs_json TEXT NOT NULL,
  signature TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_source_snapshots_v2 (
  source_snapshot_id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_replay_runs_artifact_status_v2 ON replay_runs_v2(artifact_id, status);
CREATE INDEX IF NOT EXISTS idx_golden_scenario_category_status_v2 ON golden_scenarios_v2(category, review_status);
CREATE INDEX IF NOT EXISTS idx_tp_ap_states_case_ap_v2 ON tp_ap_states_v2(case_id, assessment_period_id, state);
CREATE INDEX IF NOT EXISTS idx_sanction_states_case_ap_dates_v2 ON sanction_states_v2(case_id, assessment_period_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_surplus_ledger_case_ap_v2 ON surplus_earnings_ledger_v2(case_id, assessment_period_id);
