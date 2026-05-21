import { createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { TransitionalProtectionArtifact } from "../artifacts/types"

export const transitionalProtectionRule: PolicyRule<ReducedAssessmentPeriodState, TransitionalProtectionArtifact> = {
  ruleId: "TP-ASSESS-001",
  ruleVersion: "2026.2.0",
  title: "Assess transitional protection state",
  stage: "transitional_protection",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [{ evidenceType: "migration_notice", required: false }],
  legalBasis: [universalCreditReferences.DWP_MANAGED_MIGRATION_TP_2025],
  outputSchemaVersion: "transitional-protection-artifact.v1",
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
    const baseline = input.tpState.baselineAmountPence ?? 0
    const current = input.tpState.currentAmountPence ?? baseline
    const erosion = Math.max(0, baseline - current)
    const amount = Math.max(0, baseline - erosion)
    const artifact: TransitionalProtectionArtifact = {
      status: unsupportedCases.length ? "unsupported" : input.tpState.status as TransitionalProtectionArtifact["status"],
      amount: gbp(amount),
      erosion: gbp(erosion),
      reason: input.tpState.status
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
          ruleVersion: "2026.2.0",
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
        derivedArtifacts: [{ artifactType: "transitional_protection_assessment", schemaVersion: "transitional-protection-artifact.v1", value: artifact }]
      }
    }
  }
}
