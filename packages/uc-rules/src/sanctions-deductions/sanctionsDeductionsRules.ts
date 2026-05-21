import { addMoney, createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { SanctionsDeductionsArtifact } from "../artifacts/types"

export const sanctionsDeductionsRule: PolicyRule<ReducedAssessmentPeriodState, SanctionsDeductionsArtifact> = {
  ruleId: "DEDUCTIONS-SANCTIONS-001",
  ruleVersion: "2026.2.0",
  title: "Assess sanctions and other deductions",
  stage: "deductions",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "sanctions-deductions-artifact.v1",
  evaluate: (input) => {
    const unsupportedCases: UnsupportedCase[] = []
    for (const sanction of input.sanctionState) {
      if (!sanction.level || sanction.status === "decision_pending") {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "SANCTION_LIFECYCLE_INCOMPLETE",
          severity: "blocking",
          reason: "Sanction level or lifecycle state is incomplete.",
          affectedStages: ["deductions", "award_composition"],
          userMessage: "The sanction cannot be included until the decision level and period are known.",
          internalNotes: JSON.stringify(sanction)
        })
      }
    }
    const sanctionDeduction = gbp(input.sanctionState.reduce((total, sanction) => total + (sanction.amountPence ?? 0), 0))
    const otherDeductions = addMoney(...input.deductionState.map((deduction) => gbp(deduction.amountPence)))
    const artifact: SanctionsDeductionsArtifact = {
      status: unsupportedCases.length ? "unsupported" : "determined",
      sanctionDeduction,
      otherDeductions,
      recoveryCapApplied: false,
      blockingReasons: unsupportedCases.map((item) => item.code)
    }
    return {
      ruleId: "DEDUCTIONS-SANCTIONS-001",
      ruleVersion: "2026.2.0",
      status: unsupportedCases.length ? "unsupported" : "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "DEDUCTIONS-SANCTIONS-001",
        ruleVersion: "2026.2.0",
        stage: "deductions",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
        inputsHash: stableHash({ sanctions: input.sanctionState, deductions: input.deductionState }),
        inputExcerpt: { sanctionCount: input.sanctionState.length, deductionCount: input.deductionState.length },
        output: artifact,
        evidenceRefs: [],
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [{ artifactType: "sanctions_deductions_assessment", schemaVersion: "sanctions-deductions-artifact.v1", value: artifact }]
    }
  }
}
