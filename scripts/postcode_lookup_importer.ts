import { basename, resolve } from "node:path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { canonicalJson, normalizeBrmaId, parseCsvRows, sha256 } from "./import-lha-rates"

export const POSTCODE_MAPPING_DATASET_VERSION = "england-postcode-brma-2026-2027"
export const POSTCODE_MAPPING_EFFECTIVE_FROM = "2026-04-01"
export const POSTCODE_MAPPING_EFFECTIVE_TO = "2027-03-31"

type MatchPrecision = "full_postcode" | "unit_prefix" | "outcode" | "district" | "area"

export interface NormalizedPostcodeBrmaMapping {
  postcodePrefix: string
  brmaId: string
  brmaName?: string
  localAuthorityCode?: string
  localAuthorityName?: string
  matchPrecision: MatchPrecision
  source: string
  sourceDatasetVersion: string
  effectiveFrom: string
  effectiveTo: string
}

export interface NormalizedLocalAuthorityBrmaMapping {
  localAuthorityCode: string
  localAuthorityName: string
  brmaId: string
  source: string
  sourceDatasetVersion: string
  effectiveFrom: string
  effectiveTo: string
}

export interface NormalizedPostcodeLookupDataset {
  datasetVersion: string
  postcodeMappings: NormalizedPostcodeBrmaMapping[]
  localAuthorityMappings: NormalizedLocalAuthorityBrmaMapping[]
  checksum: string
}

const postcodeHeaders = ["postcode", "postcode_prefix", "outcode", "postcode district", "postcode sector"]
const brmaIdHeaders = ["brma_id", "brma code", "brma_code"]
const brmaNameHeaders = ["brma", "brma_name", "brma name", "broad rental market area"]
const localAuthorityCodeHeaders = ["local_authority_code", "local authority code", "ladcd", "lad code"]
const localAuthorityNameHeaders = ["local_authority_name", "local authority name", "ladnm", "lad name"]

export function normalizePostcode(value: string): string {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function postcodeLookupPrefixes(value: string): string[] {
  const normalized = normalizePostcode(value)
  if (!normalized) return []
  const prefixes = new Set<string>()
  for (let length = normalized.length; length >= 2; length -= 1) {
    prefixes.add(normalized.slice(0, length))
  }
  return [...prefixes]
}

export function postcodeMatchPrecision(prefix: string): MatchPrecision {
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(prefix)) return "full_postcode"
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]?$/.test(prefix)) return "unit_prefix"
  if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(prefix)) return "outcode"
  if (/^[A-Z]{1,2}\d$/.test(prefix)) return "district"
  return "area"
}

export function normalizePostcodeLookupCsv(csvText: string, options: {
  source?: string
  datasetVersion?: string
  effectiveFrom?: string
  effectiveTo?: string
} = {}): NormalizedPostcodeLookupDataset {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) throw new Error("Postcode mapping CSV must contain a header and at least one data row.")
  const headers = rows[0].map((header) => header.trim())
  const postcodeIndex = findHeader(headers, postcodeHeaders)
  const brmaIdIndex = findHeader(headers, brmaIdHeaders)
  const brmaNameIndex = findHeader(headers, brmaNameHeaders)
  const laCodeIndex = findHeader(headers, localAuthorityCodeHeaders)
  const laNameIndex = findHeader(headers, localAuthorityNameHeaders)
  if (postcodeIndex === -1 && laCodeIndex === -1) throw new Error("Postcode mapping CSV needs a postcode/outcode or local authority code column.")
  if (brmaIdIndex === -1 && brmaNameIndex === -1) throw new Error("Postcode mapping CSV needs a BRMA ID or BRMA name column.")

  const source = options.source ?? "official_mapping_dataset"
  const sourceDatasetVersion = options.datasetVersion ?? POSTCODE_MAPPING_DATASET_VERSION
  const effectiveFrom = options.effectiveFrom ?? POSTCODE_MAPPING_EFFECTIVE_FROM
  const effectiveTo = options.effectiveTo ?? POSTCODE_MAPPING_EFFECTIVE_TO
  const postcodeMappings: NormalizedPostcodeBrmaMapping[] = []
  const localAuthorityMappings: NormalizedLocalAuthorityBrmaMapping[] = []
  const seenPostcodes = new Map<string, string>()
  const seenLocalAuthorities = new Map<string, string>()

  for (const row of rows.slice(1)) {
    const brmaName = brmaNameIndex === -1 ? undefined : row[brmaNameIndex]?.trim()
    const brmaId = brmaIdIndex === -1 ? normalizeBrmaId(brmaName ?? "") : normalizeExplicitBrmaId(row[brmaIdIndex])
    if (!brmaId || brmaId === "brma_") throw new Error("Mapping row is missing BRMA.")

    if (postcodeIndex !== -1 && row[postcodeIndex]?.trim()) {
      const postcodePrefix = normalizePostcode(row[postcodeIndex])
      if (postcodePrefix.length < 2) throw new Error(`Invalid postcode prefix: ${row[postcodeIndex]}`)
      const existingBrma = seenPostcodes.get(postcodePrefix)
      if (existingBrma && existingBrma !== brmaId) throw new Error(`Conflicting postcode mapping for ${postcodePrefix}: ${existingBrma} vs ${brmaId}`)
      if (!existingBrma) {
        postcodeMappings.push({
          postcodePrefix,
          brmaId,
          brmaName,
          localAuthorityCode: laCodeIndex === -1 ? undefined : normalizeLocalAuthorityCode(row[laCodeIndex]),
          localAuthorityName: laNameIndex === -1 ? undefined : row[laNameIndex]?.trim() || undefined,
          matchPrecision: postcodeMatchPrecision(postcodePrefix),
          source,
          sourceDatasetVersion,
          effectiveFrom,
          effectiveTo
        })
        seenPostcodes.set(postcodePrefix, brmaId)
      }
    }

    if (laCodeIndex !== -1 && row[laCodeIndex]?.trim()) {
      const localAuthorityCode = normalizeLocalAuthorityCode(row[laCodeIndex])
      const localAuthorityName = laNameIndex === -1 ? localAuthorityCode : row[laNameIndex]?.trim() || localAuthorityCode
      const existingBrma = seenLocalAuthorities.get(localAuthorityCode)
      if (existingBrma && existingBrma !== brmaId) throw new Error(`Conflicting local authority mapping for ${localAuthorityCode}: ${existingBrma} vs ${brmaId}`)
      if (!existingBrma) {
        localAuthorityMappings.push({
          localAuthorityCode,
          localAuthorityName,
          brmaId,
          source,
          sourceDatasetVersion,
          effectiveFrom,
          effectiveTo
        })
        seenLocalAuthorities.set(localAuthorityCode, brmaId)
      }
    }
  }

  const normalizedRows = {
    datasetVersion: sourceDatasetVersion,
    postcodeMappings: postcodeMappings.sort((left, right) => left.postcodePrefix.localeCompare(right.postcodePrefix)),
    localAuthorityMappings: localAuthorityMappings.sort((left, right) => left.localAuthorityCode.localeCompare(right.localAuthorityCode))
  }
  const checksum = sha256(canonicalJson(normalizedRows))
  return { ...normalizedRows, checksum }
}

export function buildPostcodeMappingSeedSql(input: NormalizedPostcodeLookupDataset, sourceFileName: string, importedAt = "2026-05-22T00:00:00.000Z"): string {
  const lines = [
    "BEGIN TRANSACTION;",
    `INSERT OR REPLACE INTO geographic_lookup_imports (dataset_version, source_file_name, source_checksum, postcode_mapping_count, local_authority_mapping_count, effective_from, effective_to, imported_at) VALUES (${sql(input.datasetVersion)}, ${sql(sourceFileName)}, ${sql(input.checksum)}, ${input.postcodeMappings.length}, ${input.localAuthorityMappings.length}, ${sql(POSTCODE_MAPPING_EFFECTIVE_FROM)}, ${sql(POSTCODE_MAPPING_EFFECTIVE_TO)}, ${sql(importedAt)});`
  ]
  for (const mapping of input.postcodeMappings) {
    lines.push(`INSERT OR REPLACE INTO postcode_brma_lookup (postcode_prefix, postcode_normalized, brma_id, source, source_dataset_version, checksum, match_precision, effective_from, effective_to, created_at) VALUES (${sql(mapping.postcodePrefix)}, ${sql(mapping.postcodePrefix)}, ${sql(mapping.brmaId)}, ${sql(mapping.source)}, ${sql(mapping.sourceDatasetVersion)}, ${sql(input.checksum)}, ${sql(mapping.matchPrecision)}, ${sql(mapping.effectiveFrom)}, ${sql(mapping.effectiveTo)}, ${sql(importedAt)});`)
  }
  for (const mapping of input.localAuthorityMappings) {
    lines.push(`INSERT OR REPLACE INTO local_authority_brma_lookup (local_authority_code, local_authority_name, brma_id, source, source_dataset_version, checksum, effective_from, effective_to, created_at) VALUES (${sql(mapping.localAuthorityCode)}, ${sql(mapping.localAuthorityName)}, ${sql(mapping.brmaId)}, ${sql(mapping.source)}, ${sql(mapping.sourceDatasetVersion)}, ${sql(input.checksum)}, ${sql(mapping.effectiveFrom)}, ${sql(mapping.effectiveTo)}, ${sql(importedAt)});`)
  }
  lines.push("COMMIT;")
  return `${lines.join("\n")}\n`
}

function findHeader(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map((header) => header.toLowerCase())
  return normalizedHeaders.findIndex((header) => aliases.includes(header))
}

function normalizeExplicitBrmaId(value: string): string {
  const raw = String(value).trim()
  return raw.startsWith("brma_") ? normalizeBrmaId(raw.replace(/^brma_/, "")) : normalizeBrmaId(raw)
}

function normalizeLocalAuthorityCode(value: string): string {
  return String(value).trim().toUpperCase()
}

function sql(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`
}

export function main(argv = process.argv.slice(2)): void {
  const inputPath = resolve(argv[0] ?? "../postcode-brma-mapping.csv")
  if (!existsSync(inputPath)) throw new Error(`Postcode/BRMA mapping CSV not found: ${inputPath}`)
  const normalized = normalizePostcodeLookupCsv(readFileSync(inputPath, "utf8"), { source: basename(inputPath) })
  const outputDir = resolve("infra/seed")
  mkdirSync(outputDir, { recursive: true })
  const outputPath = resolve(outputDir, "postcode_brma_mapping.sql")
  writeFileSync(outputPath, buildPostcodeMappingSeedSql(normalized, basename(inputPath)))
  console.log(JSON.stringify({
    outputPath,
    datasetVersion: normalized.datasetVersion,
    checksum: normalized.checksum,
    postcodeMappings: normalized.postcodeMappings.length,
    localAuthorityMappings: normalized.localAuthorityMappings.length
  }, null, 2))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
