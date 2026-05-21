import type { UcRatePack } from "../types/calculation"
import { gb2026ExampleRatePack } from "./rate-packs/gb-2026-example"

const ratePacks = new Map<string, UcRatePack>([
  [gb2026ExampleRatePack.version, gb2026ExampleRatePack]
])

export const defaultRateVersion = gb2026ExampleRatePack.version

export function getRatePack(version = defaultRateVersion): UcRatePack {
  const pack = ratePacks.get(version)
  if (!pack) {
    throw new Error(`Unknown Universal Credit rate pack: ${version}`)
  }
  return pack
}

export function listRatePacks(): UcRatePack[] {
  return Array.from(ratePacks.values())
}
