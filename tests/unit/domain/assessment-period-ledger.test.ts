import { describe, expect, it } from "vitest"
import { createAssessmentPeriod, createAssessmentPeriodSnapshot, createUniversalCreditCaseFromCreateRequest } from "../../../packages/domain/src"

describe("assessment period ledger", () => {
  it("builds immutable AP snapshots with stable input hashes", () => {
    const now = "2026-05-21T12:00:00.000Z"
    const request = {
      clientRequestId: "request-0001",
      schemaVersion: "case-create.v2" as const,
      assessmentPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
      household: {
        adults: [
          {
            role: "claimant" as const,
            dateOfBirth: "1990-01-01",
            immigrationStatus: "eligible" as const,
            habitualResidenceStatus: "passes_habitual_residence" as const,
            studentStatus: "not_student" as const,
            prisonStatus: "not_in_prison" as const
          }
        ]
      },
      consent: { saveAssessment: true }
    }
    const ucCase = createUniversalCreditCaseFromCreateRequest(request, now)
    const ap = createAssessmentPeriod({ caseId: ucCase.caseId, sequenceNumber: 1, startDate: "2026-05-01", endDate: "2026-05-31" })
    const snapshot = createAssessmentPeriodSnapshot({
      universalCreditCase: ucCase,
      assessmentPeriod: ap,
      snapshotVersion: 1,
      reason: "initial",
      rulePackVersion: "uc-v2-foundation-2026.1",
      ratePackVersion: "gb-2026-2027-draft",
      createdAt: now
    })

    expect(snapshot.inputHash).toMatch(/^fnv1a32:/)
    expect(snapshot.sourceEventIds).toHaveLength(1)
  })

  it("rejects assessment periods with end before start", () => {
    expect(() =>
      createAssessmentPeriod({ caseId: "case_1", sequenceNumber: 1, startDate: "2026-05-31", endDate: "2026-05-01" })
    ).toThrow("end date cannot be before start date")
  })
})
