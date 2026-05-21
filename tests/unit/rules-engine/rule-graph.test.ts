import { describe, expect, it } from "vitest"
import { sortRulesByDependency } from "../../../packages/rules-engine/src"
import type { PolicyRule } from "../../../packages/rules-engine/src"

const baseRule = (ruleId: string, dependencies: string[] = []): PolicyRule => ({
  ruleId,
  ruleVersion: "1",
  title: ruleId,
  stage: "test",
  effectiveFrom: "2026-01-01",
  jurisdiction: "GB",
  dependencies: dependencies.map((dependency) => ({ ruleId: dependency })),
  appliesWhen: () => true,
  requiresEvidence: [],
  legalBasis: [],
  outputSchemaVersion: "test.v1",
  evaluate: () => ({ ruleId, ruleVersion: "1", status: "passed", trace: [], assumptions: [], warnings: [], unsupportedCases: [], derivedArtifacts: [] })
})

describe("rule graph", () => {
  it("orders dependencies before dependent rules", () => {
    const ordered = sortRulesByDependency([baseRule("C", ["B"]), baseRule("B", ["A"]), baseRule("A")])
    expect(ordered.map((rule) => rule.ruleId)).toEqual(["A", "B", "C"])
  })

  it("rejects dependency cycles", () => {
    expect(() => sortRulesByDependency([baseRule("A", ["B"]), baseRule("B", ["A"])])).toThrow("cycle")
  })
})
