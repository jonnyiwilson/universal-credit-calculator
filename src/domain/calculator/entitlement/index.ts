import { calculateChildcareElement } from "../childcare"
import { calculateHousingElement } from "../housing"
import { traceEntry } from "../trace"
import { addMoney, gbp } from "../../types/money"
import type { CalculationContext, CalculationStageResult, EntitlementElement } from "../../types/calculation"

export interface EntitlementBuild {
  elements: EntitlementElement[]
}

export function calculateEntitlement(context: CalculationContext): CalculationStageResult<EntitlementBuild> {
  const elements: EntitlementElement[] = []
  const trace = []
  const warnings = []
  const { household } = context.input
  const rates = context.ratePack.standardAllowances

  const standardAllowance =
    household.claimType === "single"
      ? household.claimantAge < 25
        ? rates.singleUnder25
        : rates.single25Plus
      : household.claimantAge < 25 && (household.partnerAge ?? 0) < 25
        ? rates.coupleBothUnder25
        : rates.coupleOneOrBoth25Plus

  const standardTrace = traceEntry({
    ruleId: "ENT-001",
    stage: "entitlement",
    label: "Standard allowance",
    formula: "standard allowance selected by claim type and claimant ages",
    inputs: { household },
    output: standardAllowance,
    legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.UC_REGULATIONS_2013]
  })
  trace.push(standardTrace)
  elements.push({ type: "standard_allowance", label: "Standard allowance", amount: standardAllowance, traceRuleIds: [standardTrace.ruleId] })

  context.input.children.forEach((child, index) => {
    const childLimitApplies = index >= 2 && !child.twoChildLimitException
    if (!childLimitApplies) {
      const amount = child.bornBeforeApril2017 && index === 0 ? context.ratePack.childElements.firstChildBornBeforeApril2017 : context.ratePack.childElements.childElement
      const childTrace = traceEntry({
        ruleId: "ENT-CHILD-001",
        stage: "entitlement",
        label: `Child element ${index + 1}`,
        formula: "child element applies unless two-child limit excludes the child",
        inputs: { child, childIndex: index, childLimitApplies },
        output: amount,
        legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.UC_REGULATIONS_2013]
      })
      trace.push(childTrace)
      elements.push({ type: "child_element", label: `Child element ${index + 1}`, amount, traceRuleIds: [childTrace.ruleId] })
    }

    if (child.disabled || child.severelyDisabled) {
      const amount = child.severelyDisabled ? context.ratePack.childElements.disabledChildHigher : context.ratePack.childElements.disabledChildLower
      const disabledTrace = traceEntry({
        ruleId: "ENT-CHILD-DISABILITY-001",
        stage: "entitlement",
        label: `Disabled child element ${index + 1}`,
        inputs: { child },
        output: amount,
        legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.UC_REGULATIONS_2013]
      })
      trace.push(disabledTrace)
      elements.push({ type: "disabled_child_element", label: `Disabled child element ${index + 1}`, amount, traceRuleIds: [disabledTrace.ruleId] })
    }
  })

  if (context.input.health.lcwra) {
    const amount = gbp(41619)
    const lcwraTrace = traceEntry({
      ruleId: "ENT-LCWRA-001",
      stage: "entitlement",
      label: "LCWRA element",
      inputs: { health: context.input.health },
      output: amount,
      legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE]
    })
    trace.push(lcwraTrace)
    elements.push({ type: "lcwra_element", label: "LCWRA element", amount, traceRuleIds: [lcwraTrace.ruleId] })
  }

  if (household.hasCaringResponsibilities && (household.caringHoursPerWeek ?? 0) >= 35) {
    const amount = gbp(19831)
    const carerTrace = traceEntry({
      ruleId: "ENT-CARER-001",
      stage: "entitlement",
      label: "Carer element",
      inputs: { caringHoursPerWeek: household.caringHoursPerWeek },
      output: amount,
      legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET, context.legislation.ADM_STAFF_GUIDE]
    })
    trace.push(carerTrace)
    elements.push({ type: "carer_element", label: "Carer element", amount, traceRuleIds: [carerTrace.ruleId] })
  }

  const housing = calculateHousingElement(context)
  if (housing.value) elements.push(housing.value)
  trace.push(...housing.trace)
  warnings.push(...housing.warnings)

  const childcare = calculateChildcareElement(context)
  if (childcare.value) elements.push(childcare.value)
  trace.push(...childcare.trace)
  warnings.push(...childcare.warnings)

  if (context.input.transitionalProtection.managedMigration && context.input.transitionalProtection.transitionalElementMonthly.amountPence > 0) {
    const transitionalTrace = traceEntry({
      ruleId: "TRANS-001",
      stage: "transitional_protection",
      label: "Transitional protection element",
      inputs: { transitionalProtection: context.input.transitionalProtection },
      output: context.input.transitionalProtection.transitionalElementMonthly,
      legislationRefs: [context.legislation.UC_TRANSITIONAL_REGULATIONS_2013, context.legislation.ADM_STAFF_GUIDE]
    })
    trace.push(transitionalTrace)
    elements.push({
      type: "transitional_protection",
      label: "Transitional protection",
      amount: context.input.transitionalProtection.transitionalElementMonthly,
      traceRuleIds: [transitionalTrace.ruleId]
    })
  }

  const total = addMoney(...elements.map((element) => element.amount))
  trace.push(
    traceEntry({
      ruleId: "ENT-TOTAL-001",
      stage: "entitlement",
      label: "Maximum entitlement total",
      formula: "sum(entitlement elements)",
      inputs: { elementCount: elements.length },
      output: total,
      legislationRefs: [context.legislation.GOV_UK_UC_WHAT_YOU_GET]
    })
  )

  return { value: { elements }, trace, warnings }
}
