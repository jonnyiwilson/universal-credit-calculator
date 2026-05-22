import { createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { TransitionalProtectionArtifact } from "../artifacts/types"

export const transitionalProtectionRule: PolicyRule<ReducedAssessmentPeriodState, TransitionalProtectionArtifact> = {
  ruleId: "TP-ASSESS-001",
  ruleVersion: "2026.3.0",
  title: "Assess transitional protection state",
  stage: "transitional_protection",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [{ evidenceType: "migration_notice", required: false }],
  legalBasis: [universalCreditReferences.DWP_MANAGED_MIGRATION_TP_2025],
  outputSchemaVersion: "transitional-protection-artifact.v2",
  evaluate: (input) => {
    const unsupportedCases: UnsupportedCase[] = []
    if (!input.tpState) {
      return response({ status: "not_applicable", amount: zeroGbp(), erosion: zeroGbp() }, unsupportedCases)
    }
    if (input.tpState.status === "baseline_pending" || input.tpState.baselineAmountPence === undefined) {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "TP_BASELINE_INCOMPLETE",
        severity: "blocking",
        reason: "Managed migration transitional protection baseline is incomplete.",
        affectedStages: ["transitional_protection", "award_composition"],
        userMessage: "Transitional protection cannot be estimated until the migration baseline is known.",
        internalNotes: "tp baseline missing"
      })
    }
    if (input.tpState.status === "nil_award_pause") {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "TP_NIL_AWARD_REINSTATEMENT_REQUIRES_HISTORY",
        severity: "blocking",
        reason: "Nil-award transitional protection handling requires prior AP history and reinstatement decision.",
        affectedStages: ["transitional_protection", "award_composition"],
        userMessage: "Transitional protection after a nil award cannot be estimated without the prior assessment-period history.",
        internalNotes: "tp nil-award pause"
      })
    }
    if (input.tpState.status === "couple_change") {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "TP_COUPLE_CHANGE_REQUIRES_DECISION",
        severity: "blocking",
        reason: "Couple changes can end or alter transitional protection and need a policy decision.",
        affectedStages: ["transitional_protection", "award_composition"],
        userMessage: "This managed migration case needs a transitional protection couple-change decision before estimating.",
        internalNotes: "tp couple change"
      })
    }
    const baseline = input.tpState.baselineAmountPence ?? 0
    const current = input.tpState.currentAmountPence ?? baseline
    const erosion = Math.max(0, baseline - current)
    const amount = Math.max(0, baseline - erosion)
    const artifact: TransitionalProtectionArtifact = {
      status: unsupportedCases.length ? "unsupported" : input.tpState.status as TransitionalProtectionArtifact["status"],
      amount: gbp(amount),
      erosion: gbp(erosion),
      reason: input.tpState.status,
      baselineAmount: gbp(baseline),
      nilAwardHandling: input.tpState.status === "nil_award_pause" ? "paused" : "not_applicable"
    }
    return response(artifact, unsupportedCases)

    function response(artifact: TransitionalProtectionArtifact, cases: UnsupportedCase[]) {
      return {
        ruleId: "TP-ASSESS-001",
        ruleVersion: "2026.2.0",
        status: cases.length ? "unsupported" as const : "passed" as const,
        value: artifact,
        trace: [{
          traceId: createEntityId("trace"),
          sequenceNumber: 1,
          ruleId: "TP-ASSESS-001",
          ruleVersion: "2026.3.0",
          stage: "transitional_protection",
          legalBasis: [universalCreditReferences.DWP_MANAGED_MIGRATION_TP_2025],
          inputsHash: stableHash(input.tpState ?? {}),
          inputExcerpt: { status: input.tpState?.status ?? "not_applicable" },
          output: artifact,
          evidenceRefs: input.evidence.filter((item) => item.type === "migration_notice").map((item) => item.evidenceId),
          assumptionRefs: [],
          derivedArtifactRefs: []
        }],
        assumptions: [],
        warnings: [],
        unsupportedCases: cases,
        derivedArtifacts: [
          { artifactType: "tp_baseline", schemaVersion: "tp-baseline.v1", value: { baselineAmount: artifact.baselineAmount, status: artifact.status } },
          { artifactType: "tp_erosion", schemaVersion: "tp-erosion.v1", value: { erosion: artifact.erosion, amount: artifact.amount } },
          { artifactType: "transitional_protection_assessment", schemaVersion: "transitional-protection-artifact.v2", value: artifact }
        ]
      }
    }
  }
}
