import { describe, expect, it } from "vitest"
import scenario from "../golden/scenarios/rev8-single-private-rent-employed.json"
import { createAssessmentPeriod, createSnapshotFromReducedState, createUniversalCreditCaseFromCreateRequest, reduceCaseForAssessmentPeriod, type CaseEvent } from "../../packages/domain/src"
import { universalCreditReferences } from "../../packages/legislation/src"
import { getRatePackV2 } from "../../packages/rates/src"
import { runRuleGraph } from "../../packages/rules-engine/src"
import { ucRev3Rules, ucV2RulePack } from "../../packages/uc-rules/src"
import type { AwardCompositionArtifact, SupportedSliceArtifact } from "../../packages/uc-rules/src/artifacts/types"

describe("REV8 supported vertical slice", () => {
  it("determines the trusted single private-rent employment journey", () => {
    const result = calculateFromScenario()
    const supported = findArtifact<SupportedSliceArtifact>(result, "supported_slice_rev8")
    const award = findArtifact<AwardCompositionArtifact>(result, "award_composition")

    expect(result.status).toBe("determined")
    expect(supported?.status).toBe("supported")
    expect(award?.maximumEntitlement.amountPence).toBe(117490)
    expect(award?.earnedIncomeDeduction.amountPence).toBe(43450)
    expect(award?.finalAward?.amountPence).toBe(74040)
  })

  it.each([
    ["partner present", { partner: true }, "REV8 supports exactly one claimant and no partner."],
    ["child present", { child: true }, "REV8 does not yet verify child elements."],
    ["postcode-only housing", { missingLha: true }, "REV8 private rent needs manual BRMA, LHA category, rate, dataset version, and checksum."],
    ["self-employment present", { selfEmployment: true }, "REV8 does not yet verify self-employment or MIF."],
    ["capital at lower threshold", { capitalPence: 600000 }, "REV8 allows only simple assessable capital below GBP 6,000."]
  ])("returns unsupported for %s", (_, mutation, expectedReason) => {
    const result = calculateFromScenario(mutation)
    const supported = findArtifact<SupportedSliceArtifact>(result, "supported_slice_rev8")
    const award = findArtifact<AwardCompositionArtifact>(result, "award_composition")

    expect(result.status).toBe("unsupported")
    expect(supported?.status).toBe("unsupported")
    expect(supported?.blockingReasons).toContain(expectedReason)
    expect(award?.finalAward).toBeUndefined()
  })
})

function calculateFromScenario(mutation: { partner?: boolean; child?: boolean; missingLha?: boolean; selfEmployment?: boolean; capitalPence?: number } = {}) {
  const now = "2026-05-22T12:00:00.000Z"
  const ucCase = createUniversalCreditCaseFromCreateRequest(
    {
      clientRequestId: "request-rev8-supported",
      schemaVersion: "case-create.v2",
      assessmentPeriod: scenario.assessmentPeriods[0],
      household: {
        adults: [
          {
            role: "claimant",
            dateOfBirth: "1990-01-01",
            immigrationStatus: "eligible",
            habitualResidenceStatus: "passes_habitual_residence",
            studentStatus: "not_student",
            prisonStatus: "not_in_prison"
          },
          ...(mutation.partner
            ? [{
                role: "partner" as const,
                dateOfBirth: "1991-01-01",
                immigrationStatus: "eligible" as const,
                habitualResidenceStatus: "passes_habitual_residence" as const,
                studentStatus: "not_student" as const,
                prisonStatus: "not_in_prison" as const
              }]
            : [])
        ]
      },
      consent: { saveAssessment: true }
    },
    now
  )

  ucCase.timeline.push(...scenario.inputEvents.map((event, index) => ({
    eventId: `event-rev8-${index}`,
    caseId: ucCase.caseId,
    type: event.eventType as CaseEvent["type"],
    occurredAt: event.occurredAt,
    reportedAt: now,
    effectiveFrom: event.effectiveFrom,
    payload: mutatePayload(event.payload, mutation),
    evidenceRefs: []
  })))
  if (mutation.child) {
    ucCase.timeline.push({
      eventId: "event-rev8-child",
      caseId: ucCase.caseId,
      type: "child_added",
      occurredAt: "2026-05-01",
      reportedAt: now,
      effectiveFrom: "2026-05-01",
      payload: { dateOfBirth: "2020-01-01", livesWithHousehold: true, responsibilityStatus: "responsible" },
      evidenceRefs: []
    })
  }
  if (mutation.selfEmployment) {
    ucCase.timeline.push({
      eventId: "event-rev8-self-employment",
      caseId: ucCase.caseId,
      type: "income_reported",
      occurredAt: "2026-05-11",
      reportedAt: now,
      effectiveFrom: "2026-05-11",
      payload: { source: "self_employment", receivedDate: "2026-05-11", netAmount: { amountPence: 10000, currency: "GBP" }, businessIncome: { amountPence: 10000, currency: "GBP" }, allowableExpenses: { amountPence: 0, currency: "GBP" }, gainfullySelfEmployed: true },
      evidenceRefs: []
    })
  }

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

function mutatePayload(payload: unknown, mutation: { missingLha?: boolean; capitalPence?: number }) {
  if (!payload || typeof payload !== "object") return payload
  const value = { ...(payload as Record<string, unknown>) }
  if (mutation.missingLha && value.tenure === "private_rent") {
    delete value.brmaCode
    delete value.lhaBedroomCategory
    delete value.lhaMonthlyRate
    delete value.lhaDatasetVersion
    delete value.lhaDatasetChecksum
  }
  if (typeof mutation.capitalPence === "number" && value.type === "cash") {
    value.value = { amountPence: mutation.capitalPence, currency: "GBP" }
  }
  return value
}

function findArtifact<T>(result: { evaluations: Array<{ derivedArtifacts: Array<{ artifactType: string; value: unknown }> }> }, artifactType: string): T | undefined {
  return result.evaluations.flatMap((evaluation) => evaluation.derivedArtifacts).find((artifact) => artifact.artifactType === artifactType)?.value as T | undefined
}
