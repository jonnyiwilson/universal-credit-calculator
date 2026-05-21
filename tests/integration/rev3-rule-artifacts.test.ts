import { describe, expect, it } from "vitest"
import { createAssessmentPeriod, createSnapshotFromReducedState, createUniversalCreditCaseFromCreateRequest, reduceCaseForAssessmentPeriod } from "../../packages/domain/src"
import { universalCreditReferences } from "../../packages/legislation/src"
import { getRatePackV2 } from "../../packages/rates/src"
import { runRuleGraph } from "../../packages/rules-engine/src"
import { ucRev3Rules, ucV2RulePack } from "../../packages/uc-rules/src"

describe("REV3 rule artifacts", () => {
  it("emits eligibility, income, capital, housing and award derived artifacts", () => {
    const now = "2026-05-21T12:00:00.000Z"
    const ucCase = createUniversalCreditCaseFromCreateRequest(
      {
        clientRequestId: "request-rev3-artifacts",
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
    const ap = createAssessmentPeriod({ caseId: ucCase.caseId, sequenceNumber: 1, startDate: "2026-05-01", endDate: "2026-05-31" })
    const reduction = reduceCaseForAssessmentPeriod({ universalCreditCase: ucCase, assessmentPeriod: ap, events: ucCase.timeline, mode: "original", now })
    const ratePack = getRatePackV2({ asOfDate: ap.startDate, version: "gb-2026-2027-draft", allowDraft: true })
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

    const artifactTypes = result.evaluations.flatMap((evaluation) => evaluation.derivedArtifacts.map((artifact) => artifact.artifactType))
    expect(result.status).toBe("determined")
    expect(artifactTypes).toEqual(
      expect.arrayContaining([
        "unsupported_case_screening",
        "eligibility_decision",
        "income_aggregation",
        "capital_assessment",
        "housing_determination",
        "work_allowance_determination",
        "award_composition"
      ])
    )
  })
})
