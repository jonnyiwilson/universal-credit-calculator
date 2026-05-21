import { gbp, stableHash } from "../../../../shared/src"
import { universalCreditReferences } from "../../../../legislation/src"
import type { RatePack } from "../../registry/types"

const rateData = {
  standardAllowances: {
    singleUnder25: gbp(33858),
    single25Plus: gbp(42490),
    coupleBothUnder25: gbp(52834),
    coupleOneOrBoth25Plus: gbp(66697)
  },
  childElements: {
    childStandard: gbp(30394),
    firstChildPreApril2017Extra: gbp(4794),
    disabledChildLower: gbp(16479),
    disabledChildHigher: gbp(51471)
  },
  healthElements: {
    lcw: gbp(21726),
    lcwra: gbp(42980)
  },
  carerElement: gbp(20934),
  housing: {
    defaultLhaCapMonthly: gbp(120000)
  },
  childcare: {
    reimbursementPercentage: 0.85,
    oneChildCap: gbp(107109),
    twoOrMoreChildrenCap: gbp(183616)
  },
  capital: {
    lowerThreshold: gbp(600000),
    upperThreshold: gbp(1600000),
    bandSizePence: 25000,
    tariffIncomePerBand: gbp(435)
  },
  earnings: {
    taperRate: 0.55,
    workAllowanceHigher: gbp(63100),
    workAllowanceLower: gbp(37900)
  },
  deductions: {},
  sanctions: {},
  benefitCap: {}
}

export const gb2026To2027DraftRatePack: RatePack = {
  ratePackId: "rate_gb_2026_2027_draft",
  version: "gb-2026-2027-draft",
  status: "draft",
  effectiveFrom: "2026-04-06",
  effectiveTo: "2027-04-04",
  jurisdiction: "GB",
  preparedBy: "system-scaffold",
  checksum: stableHash(rateData),
  sourceRefs: [
    universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026,
    universalCreditReferences.GOV_UK_UC_CAPITAL_2026
  ],
  rates: rateData
}
