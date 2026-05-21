import { describe, expect, it } from "vitest"
import { createAssessmentPeriod, createUniversalCreditCaseFromCreateRequest, reduceCaseForAssessmentPeriod } from "../../../packages/domain/src"

const now = "2026-05-21T12:00:00.000Z"

function baseCase() {
  return createUniversalCreditCaseFromCreateRequest(
    {
      clientRequestId: "request-reducer-1",
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
}

describe("REV3 AP event reducer", () => {
  it("is deterministic for the same event stream", () => {
    const ucCase = baseCase()
    const ap = createAssessmentPeriod({ caseId: ucCase.caseId, sequenceNumber: 1, startDate: "2026-05-01", endDate: "2026-05-31" })

    const first = reduceCaseForAssessmentPeriod({ universalCreditCase: ucCase, assessmentPeriod: ap, events: ucCase.timeline, mode: "original", now })
    const second = reduceCaseForAssessmentPeriod({ universalCreditCase: ucCase, assessmentPeriod: ap, events: ucCase.timeline, mode: "original", now })

    expect(first.reducedState.reductionHash).toBe(second.reducedState.reductionHash)
  })

  it("excludes events effective after the assessment period", () => {
    const ucCase = baseCase()
    ucCase.timeline.push({
      eventId: "event_future",
      caseId: ucCase.caseId,
      type: "housing_declared",
      occurredAt: "2026-06-01",
      reportedAt: now,
      effectiveFrom: "2026-06-01",
      payload: {},
      evidenceRefs: []
    })
    const ap = createAssessmentPeriod({ caseId: ucCase.caseId, sequenceNumber: 1, startDate: "2026-05-01", endDate: "2026-05-31" })

    const reduced = reduceCaseForAssessmentPeriod({ universalCreditCase: ucCase, assessmentPeriod: ap, events: ucCase.timeline, mode: "original", now })

    expect(reduced.reducedState.effectiveEventIds).not.toContain("event_future")
  })
})
