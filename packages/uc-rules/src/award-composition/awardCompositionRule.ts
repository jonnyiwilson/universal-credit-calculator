import { addMoney, createEntityId, gbp, stableHash, subtractMoney, zeroGbp } from "../../../shared/src"
import type { ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { AwardCompositionArtifact, AwardElement, AwardReduction, BenefitCapArtifact, CapitalAssessmentArtifact, ChildcareArtifact, EligibilityArtifact, HealthCarerArtifact, HousingDeterminationArtifact, IncomeAggregationArtifact, SanctionsDeductionsArtifact, SelfEmploymentArtifact, TransitionalProtectionArtifact, WorkAllowanceArtifact } from "../artifacts/types"

export const awardCompositionRule: PolicyRule<ReducedAssessmentPeriodState, AwardCompositionArtifact> = {
  ruleId: "AWARD-COMPOSE-001",
  ruleVersion: "2026.1.0",
  title: "Compose Universal Credit award from derived artifacts",
  stage: "award_composition",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [
    { ruleId: "ELIG-DETERMINE-001" },
    { ruleId: "CAPITAL-ASSESS-001" },
    { ruleId: "HOUSING-DETERMINE-001" },
    { ruleId: "INCOME-AGGREGATE-001" },
    { ruleId: "INCOME-WORK-ALLOWANCE-001" },
    { ruleId: "SELF-EMPLOYMENT-ASSESS-001" },
    { ruleId: "HEALTH-CARER-001" },
    { ruleId: "CHILDCARE-DETERMINE-001" },
    { ruleId: "TP-ASSESS-001" },
    { ruleId: "DEDUCTIONS-SANCTIONS-001" },
    { ruleId: "BENEFIT-CAP-001" }
  ],
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "award-composition.v1",
  evaluate: (input, context) => {
    const unsupportedCases: UnsupportedCase[] = []
    const standardRates = context.ratePack.rates.standardAllowances
    const claimant = input.adults.find((adult) => adult.role === "claimant")
    const partner = input.adults.find((adult) => adult.role === "partner")
    const claimantAge = claimant ? ageAt(claimant.dateOfBirth, context.assessmentPeriod.startDate) : 0
    const partnerAge = partner ? ageAt(partner.dateOfBirth, context.assessmentPeriod.startDate) : 0
    const standardAllowance =
      partner
        ? claimantAge < 25 && partnerAge < 25
          ? standardRates.coupleBothUnder25
          : standardRates.coupleOneOrBoth25Plus
        : claimantAge < 25
          ? standardRates.singleUnder25
          : standardRates.single25Plus
    const safeStandardAllowance = standardAllowance && typeof standardAllowance === "object" ? standardAllowance : zeroGbp()

    const housingArtifact = findDerived<HousingDeterminationArtifact>(context, "housing_determination")
    const incomeArtifact = findDerived<IncomeAggregationArtifact>(context, "income_aggregation")
    const workAllowanceArtifact = findDerived<WorkAllowanceArtifact>(context, "work_allowance_determination")
    const capitalArtifact = findDerived<CapitalAssessmentArtifact>(context, "capital_assessment")
    const eligibilityArtifact = findDerived<EligibilityArtifact>(context, "eligibility_decision")
    const healthCarerArtifact = findDerived<HealthCarerArtifact>(context, "health_carer_determination")
    const childcareArtifact = findDerived<ChildcareArtifact>(context, "childcare_determination")
    const selfEmploymentArtifact = findDerived<SelfEmploymentArtifact>(context, "self_employment_assessment")
    const tpArtifact = findDerived<TransitionalProtectionArtifact>(context, "transitional_protection_assessment")
    const sanctionsDeductionsArtifact = findDerived<SanctionsDeductionsArtifact>(context, "sanctions_deductions_assessment")
    const benefitCapArtifact = findDerived<BenefitCapArtifact>(context, "benefit_cap_assessment")

    if (!eligibilityArtifact || eligibilityArtifact.status === "unknown" || eligibilityArtifact.status === "unsupported") {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "ELIGIBILITY_NOT_DETERMINED",
        severity: "blocking",
        reason: "Award composition requires a determined eligibility artifact.",
        affectedStages: ["award_composition"],
        userMessage: "The award cannot be calculated until eligibility is determined.",
        internalNotes: "missing-or-unknown eligibility artifact"
      })
    }
    if (housingArtifact?.status === "unsupported" || childcareArtifact?.status === "unsupported" || selfEmploymentArtifact?.status === "unsupported" || tpArtifact?.status === "unsupported" || sanctionsDeductionsArtifact?.status === "unsupported") {
      unsupportedCases.push({
        unsupportedCaseId: createEntityId("unsupported"),
        code: "DEPENDENT_ENGINE_UNSUPPORTED",
        severity: "blocking",
        reason: "One or more dependent policy engines returned unsupported.",
        affectedStages: ["award_composition"],
        userMessage: "The final award cannot be shown because one or more required policy checks are incomplete.",
        internalNotes: "dependent derived artifact unsupported"
      })
    }

    const elements: AwardElement[] = [{ type: "standard_allowance", label: "Standard allowance", amount: safeStandardAllowance }]
    const childRates = context.ratePack.rates.childElements
    input.children.forEach((child, index) => {
      const standardChild = childRates.childStandard ?? zeroGbp()
      elements.push({ type: "child_element", label: `Child element ${index + 1}`, amount: standardChild })
      if (index === 0 && child.dateOfBirth < "2017-04-06") {
        elements.push({ type: "first_child_pre_2017_extra", label: "First child born before 6 April 2017 extra", amount: childRates.firstChildPreApril2017Extra ?? zeroGbp() })
      }
      const disabledAward = child.disabilityAwards[0]
      if (disabledAward) {
        const amount = disabledAward.rate === "higher" || disabledAward.rate === "enhanced" ? childRates.disabledChildHigher : childRates.disabledChildLower
        elements.push({ type: "disabled_child_addition", label: "Disabled child addition", amount: amount ?? zeroGbp() })
      }
    })
    if (housingArtifact?.status === "determined" && housingArtifact.housingElement.amountPence > 0) {
      elements.push({ type: "housing_element", label: "Housing element", amount: housingArtifact.housingElement })
    }
    if (healthCarerArtifact?.lcwraElement.amountPence) {
      elements.push({ type: "lcwra_element", label: "LCWRA element", amount: healthCarerArtifact.lcwraElement })
    }
    if (healthCarerArtifact?.carerElement.amountPence) {
      elements.push({ type: "carer_element", label: "Carer element", amount: healthCarerArtifact.carerElement })
    }
    if (childcareArtifact?.status === "determined" && childcareArtifact.reimbursedAmount.amountPence > 0) {
      elements.push({ type: "childcare_element", label: "Childcare element", amount: childcareArtifact.reimbursedAmount })
    }
    if (tpArtifact && (tpArtifact.status === "active" || tpArtifact.status === "eroding") && tpArtifact.amount.amountPence > 0) {
      elements.push({ type: "transitional_protection", label: "Transitional protection", amount: tpArtifact.amount })
    }

    const maximumEntitlement = addMoney(...elements.map((element) => element.amount))
    const workAllowance = workAllowanceArtifact?.amount ?? zeroGbp()
    const selfEmploymentIncome = selfEmploymentArtifact?.usedIncome ?? incomeArtifact?.selfEmploymentIncome ?? zeroGbp()
    const earnedIncome = addMoney(incomeArtifact?.employmentIncome ?? zeroGbp(), selfEmploymentIncome)
    const earningsAfterAllowance = gbp(Math.max(0, earnedIncome.amountPence - workAllowance.amountPence))
    const taperRate = typeof context.ratePack.rates.earnings.taperRate === "number" ? context.ratePack.rates.earnings.taperRate : 0.55
    const earnedIncomeDeduction = gbp(earningsAfterAllowance.amountPence * taperRate)
    const unearnedIncomeDeduction = incomeArtifact?.unearnedIncome ?? zeroGbp()
    const capitalTariffDeduction = capitalArtifact?.tariffIncome ?? zeroGbp()
    const otherDeductions = addMoney(sanctionsDeductionsArtifact?.sanctionDeduction ?? zeroGbp(), sanctionsDeductionsArtifact?.otherDeductions ?? zeroGbp())
    let benefitCapReduction = zeroGbp()
    if (benefitCapArtifact?.applies && benefitCapArtifact.capAmount && maximumEntitlement.amountPence > benefitCapArtifact.capAmount.amountPence) {
      benefitCapReduction = gbp(maximumEntitlement.amountPence - benefitCapArtifact.capAmount.amountPence)
    }
    const totalDeductions = addMoney(earnedIncomeDeduction, unearnedIncomeDeduction, capitalTariffDeduction, otherDeductions, benefitCapReduction)
    const finalAward = eligibilityArtifact?.status === "ineligible" ? zeroGbp() : unsupportedCases.length ? undefined : gbp(Math.max(0, subtractMoney(maximumEntitlement, totalDeductions).amountPence))
    const reductions: AwardReduction[] = [
      { type: "earned_income", label: "Earned income taper", amount: earnedIncomeDeduction },
      { type: "unearned_income", label: "Unearned income", amount: unearnedIncomeDeduction },
      { type: "capital_tariff", label: "Capital tariff income", amount: capitalTariffDeduction },
      { type: "other_deductions", label: "Sanctions and other deductions", amount: otherDeductions },
      { type: "benefit_cap", label: "Benefit cap", amount: benefitCapReduction }
    ]
    const artifact: AwardCompositionArtifact = {
      status: unsupportedCases.length ? "unsupported" : "determined",
      maximumEntitlement,
      standardAllowance: safeStandardAllowance,
      elements,
      earnedIncomeDeduction,
      unearnedIncomeDeduction,
      capitalTariffDeduction,
      otherDeductions,
      benefitCapReduction,
      finalAward,
      omittedElements: [
        housingArtifact && housingArtifact.status !== "determined" ? "housing_element" : "",
        childcareArtifact && childcareArtifact.status !== "determined" && childcareArtifact.status !== "not_applicable" ? "childcare_element" : ""
      ].filter(Boolean),
      reductions,
      blockingReasons: unsupportedCases.map((item) => item.code)
    }

    return {
      ruleId: "AWARD-COMPOSE-001",
      ruleVersion: "2026.1.0",
      status: unsupportedCases.length ? "unsupported" : "passed",
      value: artifact,
      trace: [{
        traceId: createEntityId("trace"),
        sequenceNumber: 1,
        ruleId: "AWARD-COMPOSE-001",
        ruleVersion: "2026.1.0",
        stage: "award_composition",
        legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
        inputsHash: stableHash({ inputHash: context.snapshot.inputHash }),
        inputExcerpt: { elementCount: elements.length },
        output: artifact,
        evidenceRefs: [],
        assumptionRefs: [],
        derivedArtifactRefs: []
      }],
      assumptions: [],
      warnings: [],
      unsupportedCases,
      derivedArtifacts: [{ artifactType: "award_composition", schemaVersion: "award-composition.v1", value: artifact }]
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

function findDerived<T>(context: unknown, artifactType: string): T | undefined {
  const evaluations = (context as { evaluations?: Array<{ derivedArtifacts: Array<{ artifactType: string; value: unknown }> }> }).evaluations ?? []
  return evaluations.flatMap((evaluation) => evaluation.derivedArtifacts).find((artifact) => artifact.artifactType === artifactType)?.value as T | undefined
}
