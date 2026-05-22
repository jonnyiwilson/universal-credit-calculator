import { stableHash } from "../../../shared/src"
import type { UniversalCreditCase } from "../../../domain/src"
import type { ReducedAssessmentPeriodState } from "../../../domain/src"
import { awardCompositionRule } from "../award-composition/awardCompositionRule"
import { benefitCapRule } from "../benefit-cap/benefitCapRules"
import { capitalAssessmentRule } from "../capital/capitalRules"
import { childcareDeterminationRule } from "../childcare/childcareRules"
import { eligibilityDeterminationRule } from "../eligibility/eligibilityRules"
import { healthCarerRule } from "../health-carer/healthCarerRules"
import { housingDeterminationRule } from "../housing/housingRules"
import { incomeAggregationRule, workAllowanceRule } from "../income/incomeRules"
import { sanctionsDeductionsRule } from "../sanctions-deductions/sanctionsDeductionsRules"
import { selfEmploymentAssessmentRule } from "../self-employment/selfEmploymentRules"
import { rev8SupportedSliceRule } from "../supported-slice/rev8SupportedSliceRule"
import { transitionalProtectionRule } from "../transitional-protection/transitionalProtectionRules"
import { unsupportedEligibilityRule } from "../eligibility/unsupportedEligibilityRules"
import type { PolicyRule, RulePack } from "../../../rules-engine/src"

export const ucV2Rules: PolicyRule<UniversalCreditCase, unknown>[] = [unsupportedEligibilityRule]
export const ucRev3Rules: PolicyRule<ReducedAssessmentPeriodState, unknown>[] = [
  unsupportedEligibilityRule as unknown as PolicyRule<ReducedAssessmentPeriodState, unknown>,
  eligibilityDeterminationRule,
  housingDeterminationRule,
  incomeAggregationRule,
  workAllowanceRule,
  selfEmploymentAssessmentRule,
  healthCarerRule,
  childcareDeterminationRule,
  capitalAssessmentRule,
  transitionalProtectionRule,
  sanctionsDeductionsRule,
  benefitCapRule,
  rev8SupportedSliceRule,
  awardCompositionRule
]

export const ucV2RulePack: RulePack = {
  version: "uc-rev4-2026.2",
  status: "approved",
  checksum: stableHash(ucRev3Rules.map((rule) => ({ ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, dependencies: rule.dependencies })))
}
