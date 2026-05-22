import { describe, expect, it } from "vitest"
import { normalizePostcode, postcodeLookupPrefixes } from "../../src/workers/api/services/housingRegionService"

describe("housing region postcode normalization", () => {
  it("normalizes full and partial postcodes consistently", () => {
    expect(normalizePostcode("tn23 1aa")).toBe("TN231AA")
    expect(normalizePostcode(" TN23 ")).toBe("TN23")
  })

  it("orders prefixes from most specific to least specific for longest-match lookup", () => {
    expect(postcodeLookupPrefixes("TN23 1AA")).toEqual(["TN231AA", "TN231A", "TN231", "TN23", "TN2", "TN"])
  })
})
