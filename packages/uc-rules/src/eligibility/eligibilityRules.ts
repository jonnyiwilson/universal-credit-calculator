import { createEntityId, stableHash } from "../../../shared/src"
import type { ReducedAssessmentPeriodState } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { EligibilityArtifact } from "../artifacts/types"

export const eligibilityDeterminationRule: PolicyRule<ReducedAssessmentPeriodState, EligibilityArtifact> = {
  ruleId: "ELIG-DETERMINE-001",
  ruleVersion: "2026.1.0",
  title: "Determine baseline Universal Credit eligibility",
  stage: "eligibility",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-UNSUPPORTED-001" }],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "eligibility-artifact.v1",
  evaluate: (input, context) => {
    const reasons = []
    let status: EligibilityArtifact["status"] = "eligible"
    const blockingUnsupportedCases: EligibilityArtifact["blockingUnsupportedCases"] = []
    const evidenceRequirements: NonNullable<EligibilityArtifact["evidenceRequirements"]> = []

    for (const adult of input.adults) {
      if (adult.immigrationStatus === "unknown") {
        status = "unsupported"
        evidenceRequirements.push({ evidenceType: "immigration_status", reason: "Immigration status is needed for UC eligibility." })
        blockingUnsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "IMMIGRATION_STATUS_UNKNOWN",
          severity: "blocking",
          reason: "Immigration status is unknown.",
          affectedStages: ["eligibility", "award_composition"],
          userMessage: "The assessment cannot continue until immigration status is known.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
      if (adult.habitualResidenceStatus === "unknown") {
        status = "unsupported"
        evidenceRequirements.push({ evidenceType: "habitual_residence", reason: "Habitual residence status is needed for UC eligibility." })
        blockingUnsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "HABITUAL_RESIDENCE_UNKNOWN",
          severity: "blocking",
          reason: "Habitual residence status is unknown.",
          affectedStages: ["eligibility", "award_composition"],
          userMessage: "The assessment cannot continue until habitual residence status is known.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
      if (adult.studentStatus === "unknown") {
        status = "unsupported"
        blockingUnsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "STUDENT_STATUS_UNKNOWN",
          severity: "blocking",
          reason: "Student status is unknown.",
          affectedStages: ["eligibility", "award_composition"],
          userMessage: "Student eligibility rules can be complex; status must be confirmed before estimating.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
      if (adult.prisonStatus === "unknown") {
        status = "unsupported"
        blockingUnsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "PRISON_STATUS_UNKNOWN",
          severity: "blocking",
          reason: "Prison/remand status is unknown.",
          affectedStages: ["eligibility", "award_composition"],
          userMessage: "Prison or remand status must be confirmed before estimating.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
      if (adult.immigrationStatus === "ineligible") {
        status = "ineligible"
        reasons.push({ code: "IMMIGRATION_INELIGIBLE", message: "An adult is marked ineligible by immigration status.", severity: "blocking" as const })
      }
      if (adult.habitualResidenceStatus === "fails_habitual_residence") {
        status = "ineligible"
        reasons.push({ code: "HRT_FAILED", message: "Habitual residence status is marked as failed.", severity: "blocking" as const })
      }
      if (adult.studentStatus === "student_ineligible") {
        status = "ineligible"
        reasons.push({ code: "STUDENT_INELIGIBLE", message: "Student status is marked ineligible.", severity: "blocking" as const })
      }
      if (adult.prisonStatus === "in_prison") {
        status = "ineligible"
        reasons.push({ code: "PRISON_STATUS_INELIGIBLE", message: "An adult is marked as in prison.", severity: "blocking" as const })
      }
      if (adult.temporaryAbsence) {
        status = "unsupported"
        blockingUnsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "TEMPORARY_ABSENCE_REQUIRES_POLICY_CHECK",
          severity: "blocking",
          reason: "Temporary absence may affect eligibility and is not safely modelled as a simple flag.",
          affectedStages: ["eligibility", "award_composition"],
          userMessage: "Temporary absence must be checked before estimating Universal Credit.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
    }

    const claimant = input.adults.find((adult) => adult.role === "claimant")
    if (!claimant) {
      status = "unknown"
      reasons.push({ code: "NO_CLAIMANT", message: "No claimant adult was found.", severity: "blocking" as const })
    }
    const claimantAge = claimant ? ageAt(claimant.dateOfBirth, context.assessmentPeriod.startDate) : 0
    if (claimant && (claimant.statePensionAgeReached || claimantAge >= 66)) {
      const partner = input.adults.find((adult) => adult.role === "partner")
      if (!partner || partner.statePensionAgeReached) {
        status = "ineligible"
        reasons.push({ code: "PENSION_AGE_RESTRICTION", message: "Pension-age claimant route is outside working-age UC eligibility.", severity: "blocking" as const })
      } else {
        status = "unsupported"
        blockingUnsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "MIXED_AGE_COUPLE_REQUIRES_POLICY_CHECK",
          severity: "blocking",
          reason: "Mixed-age couple eligibility requires a dedicated policy route.",
          affectedStages: ["eligibility", "award_composition"],
          userMessage: "Mixed-age couple cases need a dedicated eligibility check before estimating.",
          internalNotes: "mixed-age-couple"
        })
      }
    }

    const artifact: EligibilityArtifact = {
      status,
      reasons,
      blockingUnsupportedCases,
      evidenceRequirements,
      evidenceRefs: []
    }

    return {
      ruleId: "ELIG-DETERMINE-001",
      ruleVersion: "2026.1.0",
      status: status === "eligible" ? "passed" : status === "ineligible" ? "failed" : status === "unsupported" ? "unsupported" : "unknown",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "ELIG-DETERMINE-001",
        ruleVersion: "2026.1.0",
        stage: "eligibility",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
        inputsHash: stableHash(input.adults),
        inputExcerpt: { adultCount: input.adults.length },
        output: artifact,
        evidenceRefs: [],
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases: blockingUnsupportedCases,
      derivedArtifacts: [{ artifactType: "eligibility_decision", schemaVersion: "eligibility-artifact.v1", value: artifact }]
    }
  }
}

function ageAt(dateOfBirth: string, atDate: string) {
  const birth = new Date(dateOfBirth)
  const at = new Date(atDate)
  let age = at.getUTCFullYear() - birth.getUTCFullYear()
  const monthDelta = at.getUTCMonth() - birth.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}
