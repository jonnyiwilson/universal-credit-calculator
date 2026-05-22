import type { Env } from "../types"

export interface BrmaRegionRow {
  brmaId: string
  name: string
  country: string
  effectiveFrom: string
  effectiveTo?: string
}

export interface LhaRateRow {
  brmaId: string
  bedroomCategory: string
  weeklyRatePence: number
  monthlyRatePence: number
  effectiveFrom: string
  effectiveTo?: string
  sourceDatasetVersion: string
  checksum: string
}

export interface PostcodeBrmaMatch {
  brmaId: string
  postcodePrefix: string
  sourceDatasetVersion?: string
  checksum?: string
  matchPrecision?: string
}

export async function listBrmaRegions(env: Env, asOfDate: string): Promise<BrmaRegionRow[]> {
  const rows = await env.DB.prepare(
    `SELECT brma_id, name, country, effective_from, effective_to
     FROM brma_regions
     WHERE effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
     ORDER BY name ASC`
  ).bind(asOfDate, asOfDate).all()
  return (rows.results ?? []).map((row) => ({
    brmaId: String(row.brma_id),
    name: String(row.name),
    country: String(row.country),
    effectiveFrom: String(row.effective_from),
    effectiveTo: row.effective_to ? String(row.effective_to) : undefined
  }))
}

export async function getBrmaRegion(env: Env, brmaId: string, asOfDate: string): Promise<BrmaRegionRow | null> {
  const row = await env.DB.prepare(
    `SELECT brma_id, name, country, effective_from, effective_to
     FROM brma_regions
     WHERE brma_id = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
     LIMIT 1`
  ).bind(brmaId, asOfDate, asOfDate).first()
  return row
    ? {
        brmaId: String(row.brma_id),
        name: String(row.name),
        country: String(row.country),
        effectiveFrom: String(row.effective_from),
        effectiveTo: row.effective_to ? String(row.effective_to) : undefined
      }
    : null
}

export async function listLhaRatesForBrma(env: Env, brmaId: string, asOfDate: string): Promise<LhaRateRow[]> {
  const rows = await env.DB.prepare(
    `SELECT brma_id, bedroom_category, weekly_rate_pence, monthly_rate_pence,
            effective_from, effective_to, source_dataset_version, checksum
     FROM lha_rates
     WHERE brma_id = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
     ORDER BY CASE bedroom_category
       WHEN 'shared_accommodation' THEN 0
       WHEN 'one_bedroom' THEN 1
       WHEN 'two_bedroom' THEN 2
       WHEN 'three_bedroom' THEN 3
       WHEN 'four_bedroom' THEN 4
       ELSE 5
     END`
  ).bind(brmaId, asOfDate, asOfDate).all()
  return (rows.results ?? []).map((row) => ({
    brmaId: String(row.brma_id),
    bedroomCategory: String(row.bedroom_category),
    weeklyRatePence: Number(row.weekly_rate_pence),
    monthlyRatePence: Number(row.monthly_rate_pence),
    effectiveFrom: String(row.effective_from),
    effectiveTo: row.effective_to ? String(row.effective_to) : undefined,
    sourceDatasetVersion: String(row.source_dataset_version),
    checksum: String(row.checksum)
  }))
}

export async function brmaMatchForPostcodePrefixes(env: Env, postcodePrefixes: string[]): Promise<PostcodeBrmaMatch | null> {
  for (const prefix of postcodePrefixes) {
    const row = await env.DB.prepare(
      `SELECT brma_id, postcode_prefix, source_dataset_version, checksum, match_precision
       FROM postcode_brma_lookup
       WHERE postcode_prefix = ?
       LIMIT 1`
    ).bind(prefix.toUpperCase()).first()
    if (row) {
      return {
        brmaId: String(row.brma_id),
        postcodePrefix: String(row.postcode_prefix),
        sourceDatasetVersion: row.source_dataset_version ? String(row.source_dataset_version) : undefined,
        checksum: row.checksum ? String(row.checksum) : undefined,
        matchPrecision: row.match_precision ? String(row.match_precision) : undefined
      }
    }
  }
  return null
}

export async function brmaIdForLocalAuthority(env: Env, localAuthorityCode: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT brma_id FROM local_authority_brma_lookup WHERE local_authority_code = ?").bind(localAuthorityCode.trim().toUpperCase()).first()
  return row ? String(row.brma_id) : null
}
