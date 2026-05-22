import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const LHA_DATASET_VERSION = "england-lha-2026-2027"
export const LHA_EFFECTIVE_FROM = "2026-04-01"
export const LHA_EFFECTIVE_TO = "2027-03-31"
export const WEEKLY_DERIVATION = "derived_from_monthly_rate_pence_times_12_divided_by_52_rounded"

interface NormalizedRegion {
  brmaId: string
  name: string
  country: string
  effectiveFrom: string
  effectiveTo: string
}

interface NormalizedRate {
  lhaRateId: string
  brmaId: string
  bedroomCategory: string
  weeklyRatePence: number
  monthlyRatePence: number
  effectiveFrom: string
  effectiveTo: string
  sourceDatasetVersion: string
}

interface NormalizedLhaDataset {
  datasetVersion: string
  regions: NormalizedRegion[]
  rates: NormalizedRate[]
  checksum: string
}

const categoryColumns: Array<[string, string]> = [
  ["shared_accommodation", "Monthly UC LHA rates 2026 to 2027 - SAR"],
  ["one_bedroom", "1 Bed 2026 to 2027"],
  ["two_bedroom", "2 Bed 2026 to 2027"],
  ["three_bedroom", "3 Bed 2026 to 2027"],
  ["four_bedroom", "4 Bed 2026 to 2027"]
]

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index]
    const next = csvText[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      row.push(cell)
      cell = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1
      row.push(cell)
      if (row.some((value) => value.trim() !== "")) rows.push(row)
      row = []
      cell = ""
    } else {
      cell += char
    }
  }
  if (cell || row.length) {
    row.push(cell)
    if (row.some((value) => value.trim() !== "")) rows.push(row)
  }
  return rows
}

export function parseMoneyToPence(value: string): number {
  const normalized = String(value).trim().replace(/[^\d.]/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid money value: ${value}`)
  }
  const [pounds, pence = ""] = normalized.split(".")
  const amount = Number(pounds) * 100 + Number(pence.padEnd(2, "0"))
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid non-positive money value: ${value}`)
  return amount
}

export function normalizeBrmaId(name: string): string {
  return `brma_${String(name).trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function normalizeLhaCsv(csvText: string): NormalizedLhaDataset {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) throw new Error("LHA CSV must contain a header and at least one data row.")
  const headers = rows[0].map((header) => header.trim())
  const brmaIndex = headers.indexOf("BRMA")
  if (brmaIndex === -1) throw new Error("LHA CSV is missing BRMA header.")
  const columnIndexes: Array<[string, number]> = categoryColumns.map(([category, header]) => {
    const index = headers.indexOf(header)
    if (index === -1) throw new Error(`LHA CSV is missing ${header} header.`)
    return [category, index]
  })
  const regions: NormalizedRegion[] = []
  const rates: NormalizedRate[] = []
  const seenRegions = new Set()
  const seenRates = new Set()

  for (const row of rows.slice(1)) {
    const brmaName = row[brmaIndex]?.trim()
    if (!brmaName) throw new Error("LHA CSV contains a row without a BRMA name.")
    const brmaId = normalizeBrmaId(brmaName)
    if (!seenRegions.has(brmaId)) {
      regions.push({
        brmaId,
        name: brmaName,
        country: "England",
        effectiveFrom: LHA_EFFECTIVE_FROM,
        effectiveTo: LHA_EFFECTIVE_TO
      })
      seenRegions.add(brmaId)
    }
    for (const [bedroomCategory, index] of columnIndexes) {
      const monthlyRatePence = parseMoneyToPence(row[index])
      const weeklyRatePence = Math.round(monthlyRatePence * 12 / 52)
      const key = `${brmaId}:${bedroomCategory}:${LHA_EFFECTIVE_FROM}:${LHA_DATASET_VERSION}`
      if (seenRates.has(key)) throw new Error(`Duplicate LHA rate row: ${key}`)
      seenRates.add(key)
      rates.push({
        lhaRateId: `lha_${brmaId.replace(/^brma_/, "")}_${bedroomCategory}_2026_2027`,
        brmaId,
        bedroomCategory,
        weeklyRatePence,
        monthlyRatePence,
        effectiveFrom: LHA_EFFECTIVE_FROM,
        effectiveTo: LHA_EFFECTIVE_TO,
        sourceDatasetVersion: LHA_DATASET_VERSION
      })
    }
  }

  const normalizedRows = {
    datasetVersion: LHA_DATASET_VERSION,
    regions: regions.sort((left, right) => left.brmaId.localeCompare(right.brmaId)),
    rates: rates.sort((left, right) => `${left.brmaId}:${left.bedroomCategory}`.localeCompare(`${right.brmaId}:${right.bedroomCategory}`))
  }
  const checksum = sha256(canonicalJson(normalizedRows))
  return { ...normalizedRows, checksum }
}

export function buildLhaSeedSql(input: NormalizedLhaDataset, sourceFileName: string, importedAt = "2026-05-22T00:00:00.000Z"): string {
  const lines = [
    "BEGIN TRANSACTION;",
    `INSERT OR REPLACE INTO lha_dataset_imports (dataset_version, source_file_name, source_checksum, row_count, effective_from, effective_to, weekly_rate_derivation, imported_at) VALUES (${sql(LHA_DATASET_VERSION)}, ${sql(sourceFileName)}, ${sql(input.checksum)}, ${input.rates.length}, ${sql(LHA_EFFECTIVE_FROM)}, ${sql(LHA_EFFECTIVE_TO)}, ${sql(WEEKLY_DERIVATION)}, ${sql(importedAt)});`
  ]
  for (const region of input.regions) {
    lines.push(`INSERT OR REPLACE INTO brma_regions (brma_id, name, country, effective_from, effective_to, created_at) VALUES (${sql(region.brmaId)}, ${sql(region.name)}, ${sql(region.country)}, ${sql(region.effectiveFrom)}, ${sql(region.effectiveTo)}, ${sql(importedAt)});`)
  }
  for (const rate of input.rates) {
    lines.push(`INSERT OR REPLACE INTO lha_rates (lha_rate_id, brma_id, bedroom_category, weekly_rate_pence, monthly_rate_pence, effective_from, effective_to, source_dataset_version, checksum, created_at) VALUES (${sql(rate.lhaRateId)}, ${sql(rate.brmaId)}, ${sql(rate.bedroomCategory)}, ${rate.weeklyRatePence}, ${rate.monthlyRatePence}, ${sql(rate.effectiveFrom)}, ${sql(rate.effectiveTo)}, ${sql(rate.sourceDatasetVersion)}, ${sql(input.checksum)}, ${sql(importedAt)});`)
  }
  lines.push("COMMIT;")
  return `${lines.join("\n")}\n`
}

function sql(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`
}

export function main(argv = process.argv.slice(2)): void {
  const inputPath = resolve(argv[0] ?? "../england-rates-2026-to-2027.csv")
  if (!existsSync(inputPath)) throw new Error(`LHA CSV not found: ${inputPath}`)
  const normalized = normalizeLhaCsv(readFileSync(inputPath, "utf8"))
  const outputDir = resolve("infra/seed")
  mkdirSync(outputDir, { recursive: true })
  const outputPath = resolve(outputDir, "lha-england-2026-2027.sql")
  writeFileSync(outputPath, buildLhaSeedSql(normalized, basename(inputPath)))
  console.log(JSON.stringify({ outputPath, datasetVersion: LHA_DATASET_VERSION, checksum: normalized.checksum, regions: normalized.regions.length, rates: normalized.rates.length }, null, 2))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
