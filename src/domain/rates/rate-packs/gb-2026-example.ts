import { gbp } from "../../types/money"
import type { UcRatePack } from "../../types/calculation"
import { legislationReferences } from "../../legislation/references"

export const gb2026ExampleRatePack: UcRatePack = {
  version: "gb-2026-example",
  effectiveFrom: "2026-04-01",
  effectiveTo: "2027-03-31",
  sourceRefs: [
    legislationReferences.GOV_UK_UC_WHAT_YOU_GET,
    legislationReferences.ADM_STAFF_GUIDE,
    legislationReferences.UC_REGULATIONS_2013
  ],
  standardAllowances: {
    singleUnder25: gbp(31698),
    single25Plus: gbp(40014),
    coupleBothUnder25: gbp(49755),
    coupleOneOrBoth25Plus: gbp(62810)
  },
  childElements: {
    childElement: gbp(29281),
    firstChildBornBeforeApril2017: gbp(33900),
    disabledChildLower: gbp(15876),
    disabledChildHigher: gbp(49587)
  },
  housing: {
    defaultLhaCapMonthly: gbp(120000)
  },
  childcare: {
    reimbursementPercentage: 0.85,
    oneChildCap: gbp(101492),
    twoOrMoreChildrenCap: gbp(173901)
  },
  earnings: {
    taperRate: 0.55,
    workAllowanceHigher: gbp(68400),
    workAllowanceLower: gbp(41100)
  },
  capital: {
    lowerThreshold: gbp(600000),
    upperThreshold: gbp(1600000),
    bandSizePence: 25000,
    tariffIncomePerBand: gbp(435)
  },
  deductions: {
    minimumAwardPence: 0
  },
  metadata: {
    checksum: "manual-review-required",
    preparedBy: "initial scaffold",
    notes:
      "Example rates for engineering scaffolding. Verify all monetary values against official sources before production use."
  }
}
