import { RatePackSchema } from "../schemas/ratePack"
import { gb2026To2027ApprovedV1RatePack } from "../packs/gb-2026-2027/approved-v1"
import { gb2026To2027DraftRatePack } from "../packs/gb-2026-2027/draft"
import type { RateLookupOptions, RatePack } from "./types"

const packs = new Map<string, RatePack>([
  [gb2026To2027ApprovedV1RatePack.version, gb2026To2027ApprovedV1RatePack],
  [gb2026To2027DraftRatePack.version, gb2026To2027DraftRatePack]
])

export function listRatePacksV2(): RatePack[] {
  return Array.from(packs.values())
}

export function getRatePackV2(options: RateLookupOptions): RatePack {
  const candidates = options.version
    ? [packs.get(options.version)].filter((pack): pack is RatePack => Boolean(pack))
    : Array.from(packs.values())
        .filter((pack) => pack.effectiveFrom <= options.asOfDate && (!pack.effectiveTo || pack.effectiveTo >= options.asOfDate))
        .sort((left, right) => {
          if (left.status === right.status) return left.version.localeCompare(right.version)
          return left.status === "approved" ? -1 : 1
        })

  const pack = candidates[0]
  if (!pack) {
    throw new Error(`No rate pack found for ${options.version ?? options.asOfDate}`)
  }

  if (pack.status !== "approved" && !options.allowDraft) {
    throw new Error(`Rate pack ${pack.version} is ${pack.status}; production calculations require an approved rate pack.`)
  }

  RatePackSchema.parse(pack)
  return pack
}
