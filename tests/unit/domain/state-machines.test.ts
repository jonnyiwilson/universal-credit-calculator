import { describe, expect, it } from "vitest"
import { claimLifecycle, evidenceLifecycle } from "../../../packages/domain/src"

describe("domain state machines", () => {
  it("allows declared claim lifecycle transitions", () => {
    expect(claimLifecycle.transition("draft", "submitted")).toBe("submitted")
    expect(claimLifecycle.transition("submitted", "active")).toBe("active")
  })

  it("rejects impossible claim lifecycle transitions", () => {
    expect(() => claimLifecycle.transition("draft", "active")).toThrow("Invalid state transition")
  })

  it("tracks evidence verification transitions", () => {
    expect(evidenceLifecycle.transition("missing", "requested")).toBe("requested")
    expect(evidenceLifecycle.transition("requested", "provided")).toBe("provided")
    expect(evidenceLifecycle.transition("provided", "verified")).toBe("verified")
  })
})
