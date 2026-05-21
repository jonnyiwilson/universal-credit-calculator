import { z } from "zod"

const MoneySchema = z.object({
  amountPence: z.number().int(),
  currency: z.literal("GBP")
})

export const UcRatePackSchema = z.object({
  version: z.string().min(1),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
  sourceRefs: z.array(z.object({ id: z.string(), title: z.string(), url: z.string(), note: z.string().optional() })),
  standardAllowances: z.object({
    singleUnder25: MoneySchema,
    single25Plus: MoneySchema,
    coupleBothUnder25: MoneySchema,
    coupleOneOrBoth25Plus: MoneySchema
  }),
  childElements: z.object({
    childElement: MoneySchema,
    firstChildBornBeforeApril2017: MoneySchema,
    disabledChildLower: MoneySchema,
    disabledChildHigher: MoneySchema
  }),
  housing: z.object({ defaultLhaCapMonthly: MoneySchema }),
  childcare: z.object({
    reimbursementPercentage: z.number().min(0).max(1),
    oneChildCap: MoneySchema,
    twoOrMoreChildrenCap: MoneySchema
  }),
  earnings: z.object({
    taperRate: z.number().min(0).max(1),
    workAllowanceHigher: MoneySchema,
    workAllowanceLower: MoneySchema
  }),
  capital: z.object({
    lowerThreshold: MoneySchema,
    upperThreshold: MoneySchema,
    bandSizePence: z.number().int().positive(),
    tariffIncomePerBand: MoneySchema
  }),
  deductions: z.object({ minimumAwardPence: z.number().int().min(0) }),
  metadata: z.object({
    checksum: z.string(),
    preparedBy: z.string(),
    reviewedBy: z.string().optional(),
    notes: z.string()
  })
})
