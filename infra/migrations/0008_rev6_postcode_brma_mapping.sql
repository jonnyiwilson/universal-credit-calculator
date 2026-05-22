ALTER TABLE postcode_brma_lookup ADD COLUMN postcode_normalized TEXT;
ALTER TABLE postcode_brma_lookup ADD COLUMN match_precision TEXT;
ALTER TABLE postcode_brma_lookup ADD COLUMN source_dataset_version TEXT;
ALTER TABLE postcode_brma_lookup ADD COLUMN checksum TEXT;
ALTER TABLE postcode_brma_lookup ADD COLUMN effective_from TEXT;
ALTER TABLE postcode_brma_lookup ADD COLUMN effective_to TEXT;

ALTER TABLE local_authority_brma_lookup ADD COLUMN source_dataset_version TEXT;
ALTER TABLE local_authority_brma_lookup ADD COLUMN checksum TEXT;
ALTER TABLE local_authority_brma_lookup ADD COLUMN effective_from TEXT;
ALTER TABLE local_authority_brma_lookup ADD COLUMN effective_to TEXT;

CREATE TABLE geographic_lookup_imports (
  dataset_version TEXT PRIMARY KEY,
  source_file_name TEXT NOT NULL,
  source_checksum TEXT NOT NULL,
  postcode_mapping_count INTEGER NOT NULL,
  local_authority_mapping_count INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  imported_at TEXT NOT NULL
);

CREATE INDEX idx_postcode_brma_lookup_normalized ON postcode_brma_lookup(postcode_normalized);
CREATE INDEX idx_postcode_brma_lookup_brma ON postcode_brma_lookup(brma_id);
CREATE INDEX idx_postcode_brma_lookup_dataset ON postcode_brma_lookup(source_dataset_version);
CREATE INDEX idx_local_authority_brma_lookup_dataset ON local_authority_brma_lookup(source_dataset_version);
