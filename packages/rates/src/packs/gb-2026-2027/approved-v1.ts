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
    lcwraLowerPostApril2026: gbp(21726),
    lcwraProtectedSevere: gbp(42980)
  },
  carerElement: gbp(20934),
  housing: {
    defaultLhaCapMonthly: gbp(120000),
    socialRentUnderOccupancyOneBedroomRate: 0.14,
    socialRentUnderOccupancyTwoPlusBedroomRate: 0.25,
    defaultNonDependantDeduction: gbp(9655),
    sampleBrmaOneBedroomMonthly: gbp(95000),
    sampleBrmaTwoBedroomMonthly: gbp(120000),
    sampleBrmaThreeBedroomMonthly: gbp(145000),
    sampleBrmaFourBedroomMonthly: gbp(170000)
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
    workAllowanceHigher: gbp(71000),
    workAllowanceLower: gbp(42700),
    surplusEarningsMonthlyThreshold: gbp(250000)
  },
  deductions: {
    defaultRecoveryCapRate: 0.25
  },
  sanctions: {
    dailyReduction100SingleUnder25: gbp(1110),
    dailyReduction100Single25Plus: gbp(1390),
    dailyReduction100CoupleBothUnder25: gbp(860),
    dailyReduction100CoupleOneOrBoth25Plus: gbp(1090),
    dailyReduction40SingleUnder25: gbp(440),
    dailyReduction40Single25Plus: gbp(550),
    dailyReduction40CoupleBothUnder25: gbp(340),
    dailyReduction40CoupleOneOrBoth25Plus: gbp(430)
  },
  benefitCap: {
    monthlyOutsideLondonCoupleOrParent: gbp(183500),
    monthlyOutsideLondonSingleNoChildren: gbp(122900),
    monthlyLondonCoupleOrParent: gbp(211000),
    monthlyLondonSingleNoChildren: gbp(141300),
    earningsExemptionThreshold: gbp(79300)
  }
}

export const gb2026To2027ApprovedV1RatePack: RatePack = {
  ratePackId: "rate_gb_2026_2027_approved_v1",
  version: "gb-2026-2027-approved-v1",
  status: "approved",
  effectiveFrom: "2026-04-06",
  effectiveTo: "2027-04-04",
  jurisdiction: "GB",
  preparedBy: "system-scaffold",
  reviewedBy: "policy-review-required-before-public-use",
  approvedBy: "rev4-governance-placeholder",
  approvedAt: "2026-05-21T00:00:00.000Z",
  checksum: stableHash(rateData),
  signature: stableHash({ version: "gb-2026-2027-approved-v1", rateData }),
  sourceRefs: [
    universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026,
    universalCreditReferences.GOV_UK_UC_CAPITAL_2026,
    universalCreditReferences.GOV_UK_UC_CHILDCARE_2026,
    universalCreditReferences.GOV_UK_UC_HOUSING_2026,
    universalCreditReferences.GOV_UK_BENEFIT_CAP_2026
  ],
  rates: rateData
}
