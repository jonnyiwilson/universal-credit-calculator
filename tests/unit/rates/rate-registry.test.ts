import { describe, expect, it } from "vitest"
import { getRatePackV2 } from "../../../packages/rates/src"

describe("rate registry", () => {
  it("blocks draft packs when draft use is not allowed", () => {
    expect(() =>
      getRatePackV2({ asOfDate: "2026-05-21", version: "gb-2026-2027-draft", allowDraft: false })
    ).toThrow("production calculations require an approved rate pack")
  })

  it("allows draft packs outside production gates", () => {
    const pack = getRatePackV2({ asOfDate: "2026-05-21", version: "gb-2026-2027-draft", allowDraft: true })
    expect(pack.status).toBe("draft")
    expect(pack.checksum).toMatch(/^fnv1a32:/)
  })
})
