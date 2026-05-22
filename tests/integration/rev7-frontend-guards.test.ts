import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const wizardSource = readFileSync("src/features/assessment-wizard/AssessmentWizard.tsx", "utf8")

describe("REV7 frontend guards", () => {
  it("keeps claimant-visible wizard off the local calculator", () => {
    expect(wizardSource).not.toContain("runUniversalCreditCalculation")
  })

  it("keeps scalar prototype earnings out of the active wizard", () => {
    expect(wizardSource).not.toContain("employmentNetMonthly")
  })

  it("renders postcode mapping limitation messaging", () => {
    expect(wizardSource).toContain("postcode-to-area mapping data has not yet been loaded")
    expect(wizardSource).toContain("Select your local rent area manually")
  })

  it("renders verified journey only from backend artifact result data", () => {
    const resultSource = readFileSync("src/components/results/V2ArtifactResult.tsx", "utf8")
    expect(resultSource).toContain("supported_slice_rev8")
    expect(resultSource).toContain("Verified REV8 journey")
  })

  it("keeps claimant-facing wizard language free of visible technical jargon", () => {
    expect(wizardSource).not.toContain('label="BRMA"')
    expect(wizardSource).not.toContain('label="LHA category"')
    expect(wizardSource).not.toContain(">employment_manual<")
    expect(wizardSource).not.toContain("unsupported artifact")
    expect(wizardSource).not.toContain("derived artifact")
  })

  it("renders accessible validation summaries and field descriptions", () => {
    const errorSummarySource = readFileSync("src/components/govuk/ErrorSummary.tsx", "utf8")
    const fieldSource = readFileSync("src/components/govuk/FormField.tsx", "utf8")
    expect(errorSummarySource).toContain('role="alert"')
    expect(errorSummarySource).toContain("tabIndex={-1}")
    expect(fieldSource).toContain("aria-describedby")
    expect(fieldSource).toContain("aria-invalid")
  })
})
