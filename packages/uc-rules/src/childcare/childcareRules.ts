import { createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { ChildcareArtifact } from "../artifacts/types"

export const childcareDeterminationRule: PolicyRule<ReducedAssessmentPeriodState, ChildcareArtifact> = {
  ruleId: "CHILDCARE-DETERMINE-001",
  ruleVersion: "2026.2.0",
  title: "Determine childcare element",
  stage: "childcare",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "INCOME-AGGREGATE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [{ evidenceType: "childcare_invoice", required: false }, { evidenceType: "provider_registration", required: false }],
  legalBasis: [universalCreditReferences.GOV_UK_UC_CHILDCARE_2026],
  outputSchemaVersion: "childcare-artifact.v1",
  evaluate: (input, context) => {
    const childcareEvents = input.effectiveEventIds.length ? input.incomeEvents.filter(() => false) : []
    const payloadEvent = input.evidence.find((evidence) => evidence.type === "childcare_invoice")
    const unsupportedCases: UnsupportedCase[] = []
    const childcareState = (input as unknown as { childcareState?: { monthlyCostsPence?: number; approvedProvider?: boolean; childCountForCap?: number } }).childcareState
    const monthlyCosts = childcareState?.monthlyCostsPence ?? 0
    if (!monthlyCosts && !payloadEvent && childcareEvents.length === 0) {
      const artifact: ChildcareArtifact = { status: "not_applicable", eligibleCosts: zeroGbp(), reimbursedAmount: zeroGbp(), capApplied: zeroGbp(), assumptions: [] }
      return response(artifact, unsupportedCases)
    }
    if (childcareState?.approvedProvider !== true) {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "CHILDCARE_PROVIDER_UNVERIFIED",
        severity: "blocking",
        reason: "Approved childcare provider status is not verified.",
        affectedStages: ["childcare", "award_composition"],
        userMessage: "Childcare costs cannot be included until the provider is confirmed as approved.",
        internalNotes: "provider approval missing"
      })
    }
    const cap = childcareState?.childCountForCap === 1 ? context.ratePack.rates.childcare.oneChildCap : context.ratePack.rates.childcare.twoOrMoreChildrenCap
    const capMoney = typeof cap === "object" ? cap : zeroGbp()
    const reimbursed = gbp(Math.min(monthlyCosts * Number(context.ratePack.rates.childcare.reimbursementPercentage ?? 0.85), capMoney.amountPence))
    const artifact: ChildcareArtifact = {
      status: unsupportedCases.length ? "unsupported" : "determined",
      eligibleCosts: gbp(monthlyCosts),
      reimbursedAmount: reimbursed,
      capApplied: capMoney,
      assumptions: []
    }
    return response(artifact, unsupportedCases)

    function response(artifact: ChildcareArtifact, cases: UnsupportedCase[]) {
      return {
        ruleId: "CHILDCARE-DETERMINE-001",
        ruleVersion: "2026.2.0",
        status: cases.length ? "unsupported" as const : "passed" as const,
        value: artifact,
        trace: [{
          traceId: createEntityId("trace"),
          sequenceNumber: 1,
          ruleId: "CHILDCARE-DETERMINE-001",
          ruleVersion: "2026.2.0",
          stage: "childcare",
          legalBasis: [universalCreditReferences.GOV_UK_UC_CHILDCARE_2026],
          inputsHash: stableHash(childcareState ?? {}),
          inputExcerpt: { childCountForCap: childcareState?.childCountForCap ?? 0 },
          output: artifact,
          evidenceRefs: input.evidence.filter((item) => item.type === "childcare_invoice" || item.type === "provider_registration").map((item) => item.evidenceId),
          assumptionRefs: [],
          derivedArtifactRefs: []
        }],
        assumptions: [],
        warnings: [],
        unsupportedCases: cases,
        derivedArtifacts: [{ artifactType: "childcare_determination", schemaVersion: "childcare-artifact.v1", value: artifact }]
      }
    }
  }
}
