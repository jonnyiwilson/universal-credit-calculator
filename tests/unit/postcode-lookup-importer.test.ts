import { describe, expect, it } from "vitest"
import {
  buildPostcodeMappingSeedSql,
  normalizePostcode,
  normalizePostcodeLookupCsv,
  postcodeLookupPrefixes,
  postcodeMatchPrecision
} from "../../scripts/postcode_lookup_importer"

describe("postcode BRMA mapping importer", () => {
  it("normalizes postcode input and creates longest-to-shortest lookup prefixes", () => {
    expect(normalizePostcode(" sw1a 1aa ")).toBe("SW1A1AA")
    expect(postcodeLookupPrefixes(" sw1a 1aa ").slice(0, 5)).toEqual(["SW1A1AA", "SW1A1A", "SW1A1", "SW1A", "SW1"])
  })

  it("classifies postcode match precision", () => {
    expect(postcodeMatchPrecision("SW1A1AA")).toBe("full_postcode")
    expect(postcodeMatchPrecision("SW1A")).toBe("outcode")
    expect(postcodeMatchPrecision("SW")).toBe("area")
  })

  it("normalizes postcode and local authority rows into deterministic mappings", () => {
    const normalized = normalizePostcodeLookupCsv([
      "postcode_prefix,BRMA,local_authority_code,local_authority_name",
      " TN23 ,Ashford,E07000105,Ashford Borough Council",
      "TN24,Ashford,E07000105,Ashford Borough Council"
    ].join("\n"), { source: "official-test.csv" })

    expect(normalized.postcodeMappings).toHaveLength(2)
    expect(normalized.localAuthorityMappings).toHaveLength(1)
    expect(normalized.postcodeMappings[0]).toMatchObject({
      postcodePrefix: "TN23",
      brmaId: "brma_ashford",
      source: "official-test.csv"
    })
    expect(normalized.checksum).toMatch(/^[a-f0-9]{64}$/)
  })

  it("rejects conflicting postcode mappings", () => {
    expect(() => normalizePostcodeLookupCsv([
      "postcode_prefix,BRMA",
      "TN23,Ashford",
      "TN23,Canterbury"
    ].join("\n"))).toThrow(/Conflicting postcode mapping/)
  })

  it("builds replayable SQL seed rows with dataset checksum", () => {
    const normalized = normalizePostcodeLookupCsv([
      "postcode_prefix,BRMA",
      "TN23,Ashford"
    ].join("\n"))
    const sql = buildPostcodeMappingSeedSql(normalized, "official-test.csv")
    expect(sql).toContain("INSERT OR REPLACE INTO geographic_lookup_imports")
    expect(sql).toContain("INSERT OR REPLACE INTO postcode_brma_lookup")
    expect(sql).toContain(normalized.checksum)
  })
})
