import type { PolicyRule } from "../runtime/types"

export function sortRulesByDependency<I = unknown>(rules: PolicyRule<I, unknown>[]): PolicyRule<I, unknown>[] {
  const byId = new Map(rules.map((rule) => [rule.ruleId, rule]))
  const temporary = new Set<string>()
  const permanent = new Set<string>()
  const result: PolicyRule<I, unknown>[] = []

  function visit(rule: PolicyRule<I, unknown>) {
    if (permanent.has(rule.ruleId)) return
    if (temporary.has(rule.ruleId)) {
      throw new Error(`Rule dependency cycle detected at ${rule.ruleId}`)
    }
    temporary.add(rule.ruleId)
    for (const dependency of rule.dependencies) {
      const dependencyRule = byId.get(dependency.ruleId)
      if (!dependencyRule) {
        throw new Error(`Rule ${rule.ruleId} depends on missing rule ${dependency.ruleId}`)
      }
      visit(dependencyRule)
    }
    temporary.delete(rule.ruleId)
    permanent.add(rule.ruleId)
    result.push(rule)
  }

  for (const rule of rules) visit(rule)
  return result
}
