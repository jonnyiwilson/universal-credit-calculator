import { addMoney, createEntityId, gbp, stableHash } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { SanctionsDeductionsArtifact } from "../artifacts/types"

export const sanctionsDeductionsRule: PolicyRule<ReducedAssessmentPeriodState, SanctionsDeductionsArtifact> = {
  ruleId: "DEDUCTIONS-SANCTIONS-001",
  ruleVersion: "2026.3.0",
  title: "Assess sanctions and other deductions",
  stage: "deductions",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_SANCTIONS_2026],
  outputSchemaVersion: "sanctions-deductions-artifact.v2",
  evaluate: (input, context) => {
    const unsupportedCases: UnsupportedCase[] = []
    let sanctionDaysApplied = 0
    for (const sanction of input.sanctionState) {
      if (!sanction.level || !sanction.rateCategory || !sanction.startDate || !sanction.endDate || sanction.status === "decision_pending") {
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
    const sanctionDeduction = gbp(input.sanctionState.reduce((total, sanction) => {
      const explicitAmount = sanction.amountPence
      if (explicitAmount !== undefined) return total + explicitAmount
      if (!sanction.rateCategory || !sanction.startDate || !sanction.endDate) return total
      const days = overlapDays(sanction.startDate, sanction.endDate, context.assessmentPeriod.startDate, context.assessmentPeriod.endDate)
      sanctionDaysApplied += days
      return total + days * sanctionDailyRate(input, context, sanction.rateCategory)
    }, 0))
    const deductionPriority = input.deductionState
      .map((deduction, index) => ({ type: deduction.type, amount: gbp(deduction.amountPence), priority: deduction.priority ?? index + 1 }))
      .sort((left, right) => left.priority - right.priority)
    const otherDeductions = addMoney(...deductionPriority.map((deduction) => deduction.amount))
    const recoveryCapRate = Number(context.ratePack.rates.deductions.defaultRecoveryCapRate ?? 0.25)
    const recoveryCap = gbp(Math.max(0, recoveryCapRate * 0))
    const artifact: SanctionsDeductionsArtifact = {
      status: unsupportedCases.length ? "unsupported" : "determined",
      sanctionDeduction,
      otherDeductions,
      recoveryCapApplied: false,
      blockingReasons: unsupportedCases.map((item) => item.code),
      sanctionDaysApplied,
      deductionPriority,
      recoveryCap
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
        ruleVersion: "2026.3.0",
        stage: "deductions",
        legalBasis: [universalCreditReferences.GOV_UK_UC_SANCTIONS_2026],
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
      derivedArtifacts: [
        { artifactType: "sanction_lifecycle", schemaVersion: "sanction-lifecycle.v1", value: input.sanctionState },
        { artifactType: "sanction_ap_deduction", schemaVersion: "sanction-ap-deduction.v1", value: { amount: sanctionDeduction, days: sanctionDaysApplied } },
        { artifactType: "deduction_priority", schemaVersion: "deduction-priority.v1", value: deductionPriority },
        { artifactType: "deduction_cap_application", schemaVersion: "deduction-cap.v1", value: { recoveryCapApplied: false, recoveryCap } },
        { artifactType: "sanctions_deductions_assessment", schemaVersion: "sanctions-deductions-artifact.v2", value: artifact }
      ]
    }
  }
}

function sanctionDailyRate(input: ReducedAssessmentPeriodState, context: { ratePack: { rates: { sanctions: Record<string, unknown> } }; assessmentPeriod: { startDate: string } }, category: "100" | "40") {
  const claimant = input.adults.find((adult) => adult.role === "claimant")
  const partner = input.adults.find((adult) => adult.role === "partner")
  const claimantAge = claimant ? ageAt(claimant.dateOfBirth, context.assessmentPeriod.startDate) : 25
  const partnerAge = partner ? ageAt(partner.dateOfBirth, context.assessmentPeriod.startDate) : undefined
  const prefix = category === "100" ? "dailyReduction100" : "dailyReduction40"
  const key = partner
    ? claimantAge < 25 && (partnerAge ?? 25) < 25 ? `${prefix}CoupleBothUnder25` : `${prefix}CoupleOneOrBoth25Plus`
    : claimantAge < 25 ? `${prefix}SingleUnder25` : `${prefix}Single25Plus`
  const value = context.ratePack.rates.sanctions[key]
  return value && typeof value === "object" && "amountPence" in value ? Number((value as { amountPence: number }).amountPence) : 0
}

function overlapDays(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const start = Math.max(Date.parse(leftStart), Date.parse(rightStart))
  const end = Math.min(Date.parse(leftEnd), Date.parse(rightEnd))
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return Math.floor((end - start) / 86400000) + 1
}

function ageAt(dateOfBirth: string, atDate: string) {
  const birth = new Date(dateOfBirth)
  const at = new Date(atDate)
  let age = at.getUTCFullYear() - birth.getUTCFullYear()
  const monthDelta = at.getUTCMonth() - birth.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}
