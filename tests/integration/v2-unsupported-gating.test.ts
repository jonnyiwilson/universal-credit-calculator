import { describe, expect, it } from "vitest"
import { createAssessmentPeriod, createAssessmentPeriodSnapshot, createUniversalCreditCaseFromCreateRequest } from "../../packages/domain/src"
import { universalCreditReferences } from "../../packages/legislation/src"
import { getRatePackV2 } from "../../packages/rates/src"
import { runRuleGraph } from "../../packages/rules-engine/src"
import { ucV2RulePack, ucV2Rules } from "../../packages/uc-rules/src"

describe("v2 unsupported-case gating", () => {
  it("blocks unknown immigration status before any confident award", () => {
    const now = "2026-05-21T12:00:00.000Z"
    const ucCase = createUniversalCreditCaseFromCreateRequest(
      {
        clientRequestId: "request-unsupported-1",
        schemaVersion: "case-create.v2",
        assessmentPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
        household: {
          adults: [
            {
              role: "claimant",
              dateOfBirth: "1990-01-01",
              immigrationStatus: "unknown",
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
    const ap = createAssessmentPeriod({ caseId: ucCase.caseId, sequenceNumber: 1, startDate: "2026-05-01", endDate: "2026-05-31" })
    const ratePack = getRatePackV2({ asOfDate: ap.startDate, version: "gb-2026-2027-draft", allowDraft: true })
    const snapshot = createAssessmentPeriodSnapshot({
      universalCreditCase: ucCase,
      assessmentPeriod: ap,
      snapshotVersion: 1,
      reason: "initial",
      rulePackVersion: ucV2RulePack.version,
      ratePackVersion: ratePack.version,
      createdAt: now
    })

    const result = runRuleGraph(
      ucCase,
      {
        caseId: ucCase.caseId,
        assessmentPeriod: ap,
        snapshot,
        ratePack,
        rulePack: ucV2RulePack,
        legislationRegistry: universalCreditReferences,
        clock: { now }
      },
      ucV2Rules
    )

    expect(result.status).toBe("unsupported")
    expect(result.evaluations.flatMap((evaluation) => evaluation.unsupportedCases).map((item) => item.code)).toContain("IMMIGRATION_STATUS_UNKNOWN")
  })
})
