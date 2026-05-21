import { createEntityId, stableHash } from "../../../shared/src"
import type { UniversalCreditCase, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"

export const unsupportedEligibilityRule: PolicyRule<UniversalCreditCase, UnsupportedCase[]> = {
  ruleId: "ELIG-UNSUPPORTED-001",
  ruleVersion: "2026.1.0",
  title: "Block unsupported eligibility states",
  stage: "eligibility",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [
    universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026,
    universalCreditReferences.GOV_UK_UC_CAPITAL_2026,
    universalCreditReferences.GOV_UK_UC_HOUSING_2026
  ],
  outputSchemaVersion: "unsupported-cases.v1",
  evaluate: (input) => {
    const unsupportedCases: UnsupportedCase[] = []
    const adults = input.household.adults

    for (const adult of adults) {
      if (adult.immigrationStatus === "unknown") {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "IMMIGRATION_STATUS_UNKNOWN",
          severity: "blocking",
          reason: "Universal Credit eligibility cannot be determined without immigration eligibility.",
          affectedStages: ["eligibility"],
          userMessage: "This assessment cannot estimate Universal Credit until immigration eligibility is known.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
      if (adult.habitualResidenceStatus === "unknown") {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "HABITUAL_RESIDENCE_UNKNOWN",
          severity: "blocking",
          reason: "Habitual residence status is required for eligibility.",
          affectedStages: ["eligibility"],
          userMessage: "This assessment cannot estimate Universal Credit until residence eligibility is known.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
      if (adult.studentStatus === "unknown") {
        unsupportedCases.push({
          unsupportedCaseId: createEntityId("unsupported"),
          code: "STUDENT_STATUS_UNKNOWN",
          severity: "blocking",
          reason: "Student rules can make a claimant ineligible or alter entitlement.",
          affectedStages: ["eligibility"],
          userMessage: "This assessment cannot estimate Universal Credit until student status is known.",
          internalNotes: `adultId=${adult.adultId}`
        })
      }
    }

    const unsupportedHousing = input.household.housing?.tenure === "temporary_accommodation" || input.household.housing?.tenure === "specified_supported" || input.household.housing?.tenure === "refuge"
    if (unsupportedHousing) {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "HOUSING_ROUTE_UNSUPPORTED",
        severity: "blocking",
        reason: "Some temporary, specified supported, and refuge accommodation is not handled by the UC housing-cost route.",
        affectedStages: ["housing", "award_composition"],
        userMessage: "This housing situation needs a separate housing-cost assessment before Universal Credit can be estimated.",
        internalNotes: `tenure=${input.household.housing?.tenure}`
      })
    }

    return {
      ruleId: "ELIG-UNSUPPORTED-001",
      ruleVersion: "2026.1.0",
      status: unsupportedCases.length ? "unsupported" : "passed",
      value: unsupportedCases,
      trace: [
        {
          traceId: createEntityId("trace"),
          sequenceNumber: 1,
          ruleId: "ELIG-UNSUPPORTED-001",
          ruleVersion: "2026.1.0",
          stage: "eligibility",
          legalBasis: [
            universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026,
            universalCreditReferences.GOV_UK_UC_HOUSING_2026
          ],
          inputsHash: stableHash({ adults: input.household.adults, housing: input.household.housing }),
          inputExcerpt: { adultCount: adults.length, housingTenure: input.household.housing?.tenure },
          output: unsupportedCases.map((item) => item.code),
          evidenceRefs: [],
          assumptionRefs: [],
          derivedArtifactRefs: []
        }
      ],
      assumptions: [],
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [
        {
          artifactType: "unsupported_case_screening",
          schemaVersion: "unsupported-case-screening.v1",
          value: unsupportedCases
        }
      ]
    }
  }
}
