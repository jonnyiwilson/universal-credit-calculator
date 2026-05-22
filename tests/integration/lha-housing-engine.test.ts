import { describe, expect, it } from "vitest"
import { createAssessmentPeriod, createSnapshotFromReducedState, createUniversalCreditCaseFromCreateRequest, reduceCaseForAssessmentPeriod } from "../../packages/domain/src"
import { universalCreditReferences } from "../../packages/legislation/src"
import { getRatePackV2 } from "../../packages/rates/src"
import { runRuleGraph } from "../../packages/rules-engine/src"
import { ucRev3Rules, ucV2RulePack } from "../../packages/uc-rules/src"

describe("LHA-backed HousingEngine", () => {
  it("uses resolved Ashford one-bedroom LHA instead of rate-pack placeholder cap", () => {
    const now = "2026-05-22T12:00:00.000Z"
    const ucCase = createUniversalCreditCaseFromCreateRequest(
      {
        clientRequestId: "request-lha-housing",
        schemaVersion: "case-create.v2",
        assessmentPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
        household: {
          adults: [
            {
              role: "claimant",
              dateOfBirth: "1990-01-01",
              immigrationStatus: "eligible",
              habitualResidenceStatus: "passes_habitual_residence",
              studentStatus: "not_student",
              prisonStatus: "not_in_prison"
            }
          ]
        },
        consent: { saveAssessment: true }
      },
      now
    )
    ucCase.timeline.push({
      eventId: "event-housing-lha",
      caseId: ucCase.caseId,
      type: "housing_declared",
      occurredAt: "2026-05-01",
      reportedAt: now,
      effectiveFrom: "2026-05-01",
      payload: {
        tenure: "private_rent",
        brmaCode: "brma_ashford",
        brmaName: "Ashford",
        lhaBedroomCategory: "one_bedroom",
        lhaMonthlyRate: { amountPence: 75000, currency: "GBP" },
        lhaWeeklyRate: { amountPence: Math.round(75000 * 12 / 52), currency: "GBP" },
        lhaDatasetVersion: "england-lha-2026-2027",
        lhaDatasetChecksum: "test-checksum",
        eligibleRent: { amountPence: 90000, currency: "GBP" },
        eligibleServiceCharges: { amountPence: 0, currency: "GBP" },
        rentFrequency: "monthly",
        liabilityVerified: true,
        landlordVerified: false
      },
      evidenceRefs: []
    })

    const ap = createAssessmentPeriod({ caseId: ucCase.caseId, sequenceNumber: 1, startDate: "2026-05-01", endDate: "2026-05-31" })
    const reduction = reduceCaseForAssessmentPeriod({ universalCreditCase: ucCase, assessmentPeriod: ap, events: ucCase.timeline, mode: "original", now })
    const ratePack = getRatePackV2({ asOfDate: ap.startDate, allowDraft: false })
    const snapshot = createSnapshotFromReducedState({
      reducedState: reduction.reducedState,
      assessmentPeriod: ap,
      snapshotVersion: 1,
      reason: "initial",
      rulePackVersion: ucV2RulePack.version,
      ratePackVersion: ratePack.version,
      createdAt: now
    })
    const result = runRuleGraph(
      reduction.reducedState,
      {
        caseId: ucCase.caseId,
        assessmentPeriod: ap,
        snapshot,
        ratePack,
        rulePack: ucV2RulePack,
        legislationRegistry: universalCreditReferences,
        clock: { now }
      },
      ucRev3Rules
    )
    const artifacts = result.evaluations.flatMap((evaluation) => evaluation.derivedArtifacts)
    const housing = artifacts.find((artifact) => artifact.artifactType === "housing_determination")?.value as { housingElement: { amountPence: number } }
    const lhaLookup = artifacts.find((artifact) => artifact.artifactType === "lha_lookup")?.value as { datasetVersion: string; datasetChecksum: string; cap: { amountPence: number } }
    expect(housing.housingElement.amountPence).toBe(75000)
    expect(lhaLookup.cap.amountPence).toBe(75000)
    expect(lhaLookup.datasetVersion).toBe("england-lha-2026-2027")
    expect(lhaLookup.datasetChecksum).toBe("test-checksum")
  })
})
