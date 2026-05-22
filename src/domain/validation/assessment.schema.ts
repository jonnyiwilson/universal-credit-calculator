import { z } from "zod"

export const MoneyAmountSchema = z.object({
  amountPence: z.coerce.number().int().min(0),
  currency: z.literal("GBP").default("GBP")
})

export const AssessmentPeriodSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1)
})

export const HouseholdSchema = z
  .object({
    claimType: z.enum(["single", "couple"]),
    claimantAge: z.coerce.number().int().min(16).max(120),
    partnerAge: z.coerce.number().int().min(16).max(120).optional(),
    hasCaringResponsibilities: z.boolean().default(false),
    caringHoursPerWeek: z.coerce.number().min(0).optional()
  })
  .superRefine((value, context) => {
    if (value.claimType === "couple" && value.partnerAge === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["partnerAge"], message: "Partner age is required for couples." })
    }
  })

export const ChildSchema = z.object({
  dateOfBirth: z.string().min(1),
  bornBeforeApril2017: z.boolean().default(false),
  disabled: z.boolean().default(false),
  severelyDisabled: z.boolean().default(false),
  twoChildLimitException: z.boolean().default(false)
})

export const EarningsSchema = z.object({
  employmentNetMonthly: MoneyAmountSchema,
  pensionContributionsMonthly: MoneyAmountSchema,
  otherIncomeMonthly: MoneyAmountSchema
})

export const SelfEmploymentSchema = z.object({
  enabled: z.boolean().default(false),
  incomeMonthly: MoneyAmountSchema,
  allowableExpensesMonthly: MoneyAmountSchema,
  gainfullySelfEmployed: z.boolean().default(false),
  startupPeriodApplies: z.boolean().default(false)
})

export const HousingSchema = z.object({
  tenure: z.enum(["none", "private_rent", "social_rent", "owner"]),
  postcode: z.string().optional(),
  localAuthorityCode: z.string().optional(),
  localAuthorityName: z.string().optional(),
  brmaCode: z.string().optional(),
  brmaName: z.string().optional(),
  lhaBedroomCategory: z.enum(["shared_accommodation", "one_bedroom", "two_bedroom", "three_bedroom", "four_bedroom"]).optional(),
  lhaMonthlyRate: MoneyAmountSchema.optional(),
  lhaWeeklyRate: MoneyAmountSchema.optional(),
  lhaDatasetVersion: z.string().optional(),
  lhaDatasetChecksum: z.string().optional(),
  eligibleRentMonthly: MoneyAmountSchema,
  eligibleServiceChargesMonthly: MoneyAmountSchema,
  localHousingAllowanceMonthly: MoneyAmountSchema.optional(),
  nonDependantDeductionsMonthly: MoneyAmountSchema,
  bedroomTaxReductionMonthly: MoneyAmountSchema
})

export const ChildcareSchema = z.object({
  monthlyCosts: MoneyAmountSchema,
  approvedProvider: z.boolean().default(false),
  childCountForCap: z.union([z.literal(0), z.literal(1), z.literal(2)])
})

export const CapitalSchema = z.object({
  cashSavings: MoneyAmountSchema,
  investments: MoneyAmountSchema,
  propertyCapital: MoneyAmountSchema,
  notionalCapital: MoneyAmountSchema,
  deprivationOfCapital: z.boolean().default(false)
})

export const HealthSchema = z.object({
  lcw: z.boolean().default(false),
  lcwra: z.boolean().default(false)
})

export const DeductionSchema = z.object({
  type: z.enum(["advance_repayment", "overpayment", "third_party", "child_maintenance", "fraud_penalty"]),
  amountMonthly: MoneyAmountSchema
})

export const SanctionSchema = z.object({
  level: z.enum(["none", "low", "medium", "high"]),
  amountMonthly: MoneyAmountSchema
})

export const TransitionalProtectionSchema = z.object({
  managedMigration: z.boolean().default(false),
  transitionalElementMonthly: MoneyAmountSchema
})

export const AssessmentInputSchema = z.object({
  household: HouseholdSchema,
  children: z.array(ChildSchema),
  earnings: EarningsSchema,
  selfEmployment: SelfEmploymentSchema,
  housing: HousingSchema,
  childcare: ChildcareSchema,
  capital: CapitalSchema,
  health: HealthSchema,
  deductions: z.array(DeductionSchema),
  sanction: SanctionSchema,
  transitionalProtection: TransitionalProtectionSchema
})

export const CalculateAssessmentRequestSchema = z.object({
  assessmentPeriod: AssessmentPeriodSchema,
  rateVersion: z.string().min(1),
  input: AssessmentInputSchema
})

export type AssessmentInputFormData = z.infer<typeof AssessmentInputSchema>
