import { createEntityId, stableHash, zeroGbp } from "../../../shared/src"
import type { Assumption, ReducedAssessmentPeriodState } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { HealthCarerArtifact } from "../artifacts/types"

export const healthCarerRule: PolicyRule<ReducedAssessmentPeriodState, HealthCarerArtifact> = {
  ruleId: "HEALTH-CARER-001",
  ruleVersion: "2026.2.0",
  title: "Determine LCWRA cohort and carer element",
  stage: "health_carer",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "ELIG-DETERMINE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [{ evidenceType: "wca_decision", required: false }, { evidenceType: "disability_award", required: false }],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "health-carer-artifact.v1",
  evaluate: (input, context) => {
    const assumptions: Assumption[] = []
    const lcwraAdult = input.adults.find((adult) => adult.workCapability?.status === "lcwra")
    const cohort = lcwraAdult?.workCapability?.lcwraCohort ?? (lcwraAdult ? "unknown" : "none")
    const healthRates = context.ratePack.rates.healthElements
    let lcwraElement = zeroGbp()

    if (cohort === "post_april_2026_lower") lcwraElement = healthRates.lcwraLowerPostApril2026 ?? zeroGbp()
    if (cohort === "protected_severe" || cohort === "transitional_protected") lcwraElement = healthRates.lcwraProtectedSevere ?? zeroGbp()
    if (cohort === "unknown") {
      assumptions.push({
        assumptionId: createEntityId("assumption"),
        severity: "blocking",
        code: "LCWRA_COHORT_UNKNOWN",
        message: "LCWRA is declared but the 2026 cohort/protection status is unknown.",
        affectedRuleIds: ["HEALTH-CARER-001"],
        canUserResolve: true,
        resolutionPrompt: "Confirm whether the claimant is in the post-April-2026 lower cohort or a protected/severe cohort."
      })
    }

    const carer = input.adults.flatMap((adult) => adult.caringResponsibilities.map((care) => ({ adult, care }))).find(({ care }) => care.hoursPerWeek >= 35)
    const carerQualified = Boolean(carer?.care.qualifyingBenefitVerified && carer.care.hoursPerWeek >= 35)
    if (carer && !carer.care.qualifyingBenefitVerified) {
      assumptions.push({
        assumptionId: createEntityId("assumption"),
        severity: "blocking",
        code: "CARER_QUALIFYING_BENEFIT_UNVERIFIED",
        message: "Carer element needs a qualifying disability benefit to be verified.",
        affectedRuleIds: ["HEALTH-CARER-001"],
        canUserResolve: true,
        resolutionPrompt: "Confirm the cared-for person receives a qualifying disability benefit."
      })
    }

    const conflictApplied = carerQualified && lcwraElement.amountPence > 0
    const artifact: HealthCarerArtifact = {
      lcwraElement,
      lcwraCohort: cohort,
      carerElement: carerQualified && !conflictApplied ? context.ratePack.rates.carerElement : zeroGbp(),
      carerQualified,
      conflictApplied,
      assumptions: assumptions.map((assumption) => assumption.assumptionId)
    }

    return {
      ruleId: "HEALTH-CARER-001",
      ruleVersion: "2026.2.0",
      status: assumptions.some((assumption) => assumption.severity === "blocking") ? "unknown" : "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "HEALTH-CARER-001",
        ruleVersion: "2026.2.0",
        stage: "health_carer",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
        inputsHash: stableHash(input.healthCohortState),
        inputExcerpt: { lcwraCohort: cohort, carerQualified },
        output: artifact,
        evidenceRefs: input.adults.flatMap((adult) => [...(adult.workCapability?.evidenceRefs ?? []), ...adult.caringResponsibilities.flatMap((care) => care.evidenceRefs)]),
        assumptionRefs: artifact.assumptions,
        derivedArtifactRefs: []
      }],
      assumptions,
      warnings: [],
      unsupportedCases: [],
      derivedArtifacts: [{ artifactType: "health_carer_determination", schemaVersion: "health-carer-artifact.v1", value: artifact }]
    }
  }
}
