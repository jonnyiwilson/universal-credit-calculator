export interface RuleCatalogueEntry {
  ruleId: string
  stage: string
  summary: string
  sourceRefIds: string[]
  implementation: string
  testFile: string
}

export const ruleCatalogue: RuleCatalogueEntry[] = [
  {
    ruleId: "ELIG-001",
    stage: "eligibility",
    summary: "Capital above the upper threshold makes the assessment ineligible.",
    sourceRefIds: ["UC_REGULATIONS_2013", "ADM_STAFF_GUIDE"],
    implementation: "src/domain/calculator/eligibility/index.ts",
    testFile: "tests/unit/calculator/capital.test.ts"
  },
  {
    ruleId: "ENT-001",
    stage: "entitlement",
    summary: "Select standard allowance by single/couple claim type and age.",
    sourceRefIds: ["GOV_UK_UC_WHAT_YOU_GET", "UC_REGULATIONS_2013"],
    implementation: "src/domain/calculator/entitlement/index.ts",
    testFile: "tests/integration/golden-scenarios.test.ts"
  },
  {
    ruleId: "EARN-001",
    stage: "earnings",
    summary: "Apply work allowance before earnings taper.",
    sourceRefIds: ["GOV_UK_UC_WHAT_YOU_GET", "ADM_STAFF_GUIDE"],
    implementation: "src/domain/calculator/earnings/index.ts",
    testFile: "tests/unit/calculator/earnings.test.ts"
  },
  {
    ruleId: "CAP-001",
    stage: "capital",
    summary: "Calculate capital tariff income above lower threshold.",
    sourceRefIds: ["GOV_UK_UC_WHAT_YOU_GET", "ADM_STAFF_GUIDE", "UC_REGULATIONS_2013"],
    implementation: "src/domain/calculator/capital/index.ts",
    testFile: "tests/unit/calculator/capital.test.ts"
  },
  {
    ruleId: "FINAL-001",
    stage: "final_award",
    summary: "Final award is maximum entitlement less deductions, floored at zero.",
    sourceRefIds: ["GOV_UK_UC_WHAT_YOU_GET"],
    implementation: "src/domain/calculator/final-award/index.ts",
    testFile: "tests/integration/golden-scenarios.test.ts"
  }
]
