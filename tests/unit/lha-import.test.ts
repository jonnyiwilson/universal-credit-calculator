import { describe, expect, it } from "vitest"
import { buildLhaSeedSql, normalizeBrmaId, normalizeLhaCsv, parseMoneyToPence } from "../../scripts/import-lha-rates"

const csv = `BRMA,Monthly UC LHA rates 2026 to 2027 - SAR,1 Bed 2026 to 2027,2 Bed 2026 to 2027,3 Bed 2026 to 2027,4 Bed 2026 to 2027
Ashford,£393.24,£750.00,£850.00,"£1,097.80","£1,440.00"
`

describe("LHA import pipeline", () => {
  it("parses quoted currency values into pence", () => {
    expect(parseMoneyToPence("\"£1,097.80\"")).toBe(109780)
    expect(parseMoneyToPence("£393.24")).toBe(39324)
  })

  it("normalizes BRMA IDs deterministically", () => {
    expect(normalizeBrmaId("Barrow-in-Furness")).toBe("brma_barrow_in_furness")
  })

  it("normalizes LHA rows and derives weekly rates", () => {
    const normalized = normalizeLhaCsv(csv)
    expect(normalized.regions).toHaveLength(1)
    expect(normalized.rates).toHaveLength(5)
    const oneBedroom = normalized.rates.find((rate) => rate.bedroomCategory === "one_bedroom")
    expect(oneBedroom?.monthlyRatePence).toBe(75000)
    expect(oneBedroom?.weeklyRatePence).toBe(Math.round(75000 * 12 / 52))
    expect(normalized.checksum).toHaveLength(64)
  })

  it("emits deterministic seed SQL", () => {
    const normalized = normalizeLhaCsv(csv)
    const left = buildLhaSeedSql(normalized, "england-rates-2026-to-2027.csv")
    const right = buildLhaSeedSql(normalized, "england-rates-2026-to-2027.csv")
    expect(left).toBe(right)
    expect(left).toContain("INSERT OR REPLACE INTO brma_regions")
    expect(left).toContain("INSERT OR REPLACE INTO lha_rates")
  })

  it("rejects duplicate BRMA category rows", () => {
    expect(() => normalizeLhaCsv(`${csv}Ashford,£393.24,£750.00,£850.00,"£1,097.80","£1,440.00"\n`)).toThrow(/Duplicate LHA rate row/)
  })
})
