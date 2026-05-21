import type { PolicyRule, RuleContext, RuleEvaluationResult } from "./types"
import { sortRulesByDependency } from "../graph/topologicalSort"

export interface RuleGraphResult {
  status: "determined" | "partial" | "unsupported" | "failed"
  evaluations: RuleEvaluationResult[]
}

export function runRuleGraph<I>(input: I, context: RuleContext, rules: PolicyRule<I, unknown>[]): RuleGraphResult {
  const ordered = sortRulesByDependency(rules)
  const evaluations: RuleEvaluationResult[] = []

  for (const rule of ordered) {
    if (rule.effectiveFrom > context.assessmentPeriod.endDate || (rule.effectiveTo && rule.effectiveTo < context.assessmentPeriod.startDate)) {
      continue
    }
    if (!rule.appliesWhen(input, context)) {
      evaluations.push({
        ruleId: rule.ruleId,
        ruleVersion: rule.ruleVersion,
        status: "not_applicable",
        trace: [],
        assumptions: [],
        warnings: [],
        unsupportedCases: [],
        derivedArtifacts: []
      })
      continue
    }
    evaluations.push(rule.evaluate(input, { ...context, evaluations }))
  }

  if (evaluations.some((evaluation) => evaluation.unsupportedCases.some((item) => item.severity === "blocking"))) {
    return { status: "unsupported", evaluations }
  }
  if (evaluations.some((evaluation) => evaluation.assumptions.some((item) => item.severity === "blocking"))) {
    return { status: "partial", evaluations }
  }
  return { status: "determined", evaluations }
}
