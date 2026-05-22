import { describe, expect, it } from "vitest"
import baselineScenario from "../golden/scenarios/rev5-baseline.json"
import { createAssessmentPeriod, createSnapshotFromReducedState, createUniversalCreditCaseFromCreateRequest, reduceCaseForAssessmentPeriod } from "../../packages/domain/src"
import { universalCreditReferences } from "../../packages/legislation/src"
import { getRatePackV2 } from "../../packages/rates/src"
import { runRuleGraph } from "../../packages/rules-engine/src"
import { ucRev3Rules, ucV2RulePack } from "../../packages/uc-rules/src"
import type { Money } from "../../packages/shared/src"

describe("REV5 correctness and governance", () => {
  it("uses corrected 2026/2027 work allowance, non-dependant and sanction rates", () => {
    const pack = getRatePackV2({ asOfDate: "2026-05-22", allowDraft: false })
    expect((pack.rates.earnings.workAllowanceHigher as Money).amountPence).toBe(71000)
    expect((pack.rates.earnings.workAllowanceLower as Money).amountPence).toBe(42700)
    expect((pack.rates.housing.defaultNonDependantDeduction as Money).amountPence).toBe(9655)
    expect((pack.rates.sanctions.dailyReduction100Single25Plus as Money).amountPence).toBe(1390)
    expect((pack.rates.sanctions.dailyReduction40SingleUnder25 as Money).amountPence).toBe(440)
  })

  it("enforces approved golden scenario metadata", () => {
    expect(baselineScenario.reviewStatus).toBe("approved")
    expect(baselineScenario.reviewedBy).toBeTruthy()
    expect(baselineScenario.expectedArtifacts[0].expected.standardAllowancePence).toBe(42490)
  })

  it("calculates sanction AP overlap from daily rates", () => {
    const now = "2026-05-22T12:00:00.000Z"
    const ucCase = createUniversalCreditCaseFromCreateRequest(
      {
        clientRequestId: "request-rev5-sanction",
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
      eventId: "event-sanction-1",
      caseId: ucCase.caseId,
      type: "sanction_reported",
      occurredAt: "2026-05-10",
      reportedAt: now,
      effectiveFrom: "2026-05-10",
      payload: { status: "active", level: "high", rateCategory: "100", startDate: "2026-05-10", endDate: "2026-05-12" },
      evidenceRefs: []
    })
    const result = calculate(ucCase, now)
    const sanctions = result.evaluations.flatMap((evaluation) => evaluation.derivedArtifacts).find((artifact) => artifact.artifactType === "sanctions_deductions_assessment")?.value as { sanctionDeduction: Money; sanctionDaysApplied: number }
    expect(sanctions.sanctionDaysApplied).toBe(3)
    expect(sanctions.sanctionDeduction.amountPence).toBe(4170)
  })
})

function calculate(ucCase: ReturnType<typeof createUniversalCreditCaseFromCreateRequest>, now: string) {
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
  return runRuleGraph(
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
}
