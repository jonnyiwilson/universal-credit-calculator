import { describe, expect, it } from "vitest"
import { createAssessmentPeriod, createSnapshotFromReducedState, createUniversalCreditCaseFromCreateRequest, reduceCaseForAssessmentPeriod } from "../../packages/domain/src"
import { universalCreditReferences } from "../../packages/legislation/src"
import { getRatePackV2 } from "../../packages/rates/src"
import { runRuleGraph } from "../../packages/rules-engine/src"
import { ucRev3Rules, ucV2RulePack } from "../../packages/uc-rules/src"
import type { Money } from "../../packages/shared/src"

describe("REV4 policy depth", () => {
  it("uses the approved 2026/2027 rate pack by default", () => {
    const pack = getRatePackV2({ asOfDate: "2026-05-21", allowDraft: false })
    expect(pack.version).toBe("gb-2026-2027-approved-v1")
    expect(pack.status).toBe("approved")
    expect(pack.rates.standardAllowances.single25Plus.amountPence).toBe(42490)
    expect((pack.rates.childcare.oneChildCap as Money).amountPence).toBe(107109)
    expect((pack.rates.capital.tariffIncomePerBand as Money).amountPence).toBe(435)
  })

  it("reduces AP events into REV4 derived artifacts", () => {
    const now = "2026-05-21T12:00:00.000Z"
    const ucCase = createUniversalCreditCaseFromCreateRequest(
      {
        clientRequestId: "request-rev4-artifacts",
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
    ucCase.timeline.push(
      {
        eventId: "event-child-1",
        caseId: ucCase.caseId,
        type: "child_added",
        occurredAt: "2026-05-01",
        reportedAt: now,
        effectiveFrom: "2026-05-01",
        payload: { dateOfBirth: "2016-01-01", disabilityAwards: [{ type: "dla_child", rate: "higher", evidenceRefs: [] }] },
        evidenceRefs: []
      },
      {
        eventId: "event-income-1",
        caseId: ucCase.caseId,
        type: "income_reported",
        occurredAt: "2026-05-20",
        reportedAt: now,
        effectiveFrom: "2026-05-20",
        payload: { source: "employment_manual", receivedDate: "2026-05-20", netAmount: { amountPence: 100000, currency: "GBP" } },
        evidenceRefs: []
      },
      {
        eventId: "event-capital-1",
        caseId: ucCase.caseId,
        type: "capital_declared",
        occurredAt: "2026-05-01",
        reportedAt: now,
        effectiveFrom: "2026-05-01",
        payload: { type: "bank_account", value: { amountPence: 650000, currency: "GBP" }, valuationDate: "2026-05-01", valuationConfidence: "declared" },
        evidenceRefs: []
      }
    )
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

    const artifactTypes = result.evaluations.flatMap((evaluation) => evaluation.derivedArtifacts.map((artifact) => artifact.artifactType))
    expect(reduction.reducerVersion).toBe("rev4-reducer-1")
    expect(reduction.reducedState.children).toHaveLength(1)
    expect(reduction.reducedState.incomeEvents).toHaveLength(1)
    expect(reduction.reducedState.capitalAtApEnd).toHaveLength(1)
    expect(artifactTypes).toEqual(expect.arrayContaining([
      "health_carer_determination",
      "childcare_determination",
      "self_employment_assessment",
      "transitional_protection_assessment",
      "sanctions_deductions_assessment",
      "benefit_cap_assessment",
      "payroll_movement_assessment",
      "surplus_earnings_assessment",
      "award_composition"
    ]))
  })

  it("blocks confident awards when high earnings need surplus earnings history", () => {
    const now = "2026-05-21T12:00:00.000Z"
    const ucCase = createUniversalCreditCaseFromCreateRequest(
      {
        clientRequestId: "request-rev4-surplus",
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
      eventId: "event-income-high",
      caseId: ucCase.caseId,
      type: "income_reported",
      occurredAt: "2026-05-20",
      reportedAt: now,
      effectiveFrom: "2026-05-20",
      payload: { source: "employment_manual", receivedDate: "2026-05-20", netAmount: { amountPence: 300000, currency: "GBP" } },
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

    expect(result.status).toBe("unsupported")
    expect(result.evaluations.flatMap((evaluation) => evaluation.unsupportedCases).map((item) => item.code)).toContain("SURPLUS_EARNINGS_HISTORY_REQUIRED")
  })
})
