import { brmaIdForLocalAuthority, brmaMatchForPostcodePrefixes, getBrmaRegion, listBrmaRegions, listLhaRatesForBrma } from "../repositories/housingRegionRepository"
import type { Env } from "../types"

export async function listHousingBrmaRegions(env: Env, asOfDate: string) {
  return listBrmaRegions(env, asOfDate)
}

export async function getHousingLhaRates(env: Env, brmaId: string, asOfDate: string) {
  const region = await getBrmaRegion(env, brmaId, asOfDate)
  if (!region) return null
  const rates = await listLhaRatesForBrma(env, brmaId, asOfDate)
  return { region, rates: rates.map(toApiRate) }
}

export async function resolveHousingArea(env: Env, input: {
  brmaId?: string
  postcode?: string
  localAuthorityCode?: string
  asOfDate: string
}) {
  if (input.brmaId) {
    const resolved = await getHousingLhaRates(env, input.brmaId, input.asOfDate)
    return resolved ? { status: "resolved", resolutionMethod: "brma", ...resolved } : unsupported("BRMA_NOT_FOUND", "The selected BRMA could not be found for this date.")
  }
  if (input.postcode) {
    const postcodeNormalized = normalizePostcode(input.postcode)
    const match = await brmaMatchForPostcodePrefixes(env, postcodeLookupPrefixes(postcodeNormalized))
    if (!match) return unsupported("POSTCODE_BRMA_MAPPING_UNAVAILABLE", "Postcode to BRMA mapping is not loaded yet.")
    const resolved = await getHousingLhaRates(env, match.brmaId, input.asOfDate)
    return resolved
      ? {
          status: "resolved",
          resolutionMethod: "postcode",
          postcodeNormalized,
          postcodePrefix: match.postcodePrefix,
          postcodeMatchPrecision: match.matchPrecision,
          mappingDatasetVersion: match.sourceDatasetVersion,
          mappingChecksum: match.checksum,
          ...resolved
        }
      : unsupported("BRMA_NOT_FOUND", "The mapped BRMA could not be found for this date.")
  }
  if (input.localAuthorityCode) {
    const brmaId = await brmaIdForLocalAuthority(env, input.localAuthorityCode)
    if (!brmaId) return unsupported("LOCAL_AUTHORITY_BRMA_MAPPING_UNAVAILABLE", "Local authority to BRMA mapping is not loaded yet.")
    const resolved = await getHousingLhaRates(env, brmaId, input.asOfDate)
    return resolved ? { status: "resolved", resolutionMethod: "local_authority", ...resolved } : unsupported("BRMA_NOT_FOUND", "The mapped BRMA could not be found for this date.")
  }
  return unsupported("AREA_INPUT_REQUIRED", "Provide a BRMA, postcode, or local authority code.")
}

function toApiRate(rate: {
  bedroomCategory: string
  weeklyRatePence: number
  monthlyRatePence: number
  effectiveFrom: string
  effectiveTo?: string
  sourceDatasetVersion: string
  checksum: string
}) {
  return {
    bedroomCategory: rate.bedroomCategory,
    weeklyRate: { amountPence: rate.weeklyRatePence, currency: "GBP" as const },
    monthlyRate: { amountPence: rate.monthlyRatePence, currency: "GBP" as const },
    effectiveFrom: rate.effectiveFrom,
    effectiveTo: rate.effectiveTo,
    sourceDatasetVersion: rate.sourceDatasetVersion,
    checksum: rate.checksum
  }
}

function unsupported(code: string, message: string) {
  return { status: "unsupported", code, message }
}

export function normalizePostcode(postcode: string) {
  return postcode.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function postcodeLookupPrefixes(postcode: string) {
  const normalized = normalizePostcode(postcode)
  if (!normalized) return []
  const prefixes: string[] = []
  for (let length = normalized.length; length >= 2; length -= 1) {
    prefixes.push(normalized.slice(0, length))
  }
  return prefixes
}
