CREATE TABLE IF NOT EXISTS brma_regions (
  brma_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lha_rates (
  lha_rate_id TEXT PRIMARY KEY,
  brma_id TEXT NOT NULL,
  bedroom_category TEXT NOT NULL,
  weekly_rate_pence INTEGER NOT NULL,
  monthly_rate_pence INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  source_dataset_version TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (brma_id, bedroom_category, effective_from, source_dataset_version),
  FOREIGN KEY (brma_id) REFERENCES brma_regions(brma_id)
);

CREATE TABLE IF NOT EXISTS postcode_brma_lookup (
  postcode_prefix TEXT PRIMARY KEY,
  brma_id TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (brma_id) REFERENCES brma_regions(brma_id)
);

CREATE TABLE IF NOT EXISTS local_authority_brma_lookup (
  local_authority_code TEXT PRIMARY KEY,
  local_authority_name TEXT NOT NULL,
  brma_id TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (brma_id) REFERENCES brma_regions(brma_id)
);

CREATE TABLE IF NOT EXISTS lha_dataset_imports (
  dataset_version TEXT PRIMARY KEY,
  source_file_name TEXT NOT NULL,
  source_checksum TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  weekly_rate_derivation TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lha_rates_lookup ON lha_rates(brma_id, bedroom_category, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_brma_regions_name ON brma_regions(name);
CREATE INDEX IF NOT EXISTS idx_local_authority_name ON local_authority_brma_lookup(local_authority_name);
