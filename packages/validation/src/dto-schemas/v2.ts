import { z } from "zod"

const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const MoneySchema = z.object({
  amountPence: z.number().int().min(0),
  currency: z.literal("GBP").default("GBP")
})

const AdultDtoSchema = z.object({
  role: z.enum(["claimant", "partner"]),
  dateOfBirth: ISODateSchema,
  immigrationStatus: z.enum(["eligible", "ineligible", "unknown"]).default("unknown"),
  habitualResidenceStatus: z.enum(["passes_habitual_residence", "fails_habitual_residence", "unknown"]).default("unknown"),
  studentStatus: z.enum(["not_student", "student_eligible", "student_ineligible", "unknown"]).default("unknown"),
  prisonStatus: z.enum(["not_in_prison", "in_prison", "unknown"]).default("unknown")
})

const HousingDtoSchema = z.object({
  tenure: z.enum(["no_housing_costs", "private_rent", "social_rent", "owner_occupier", "temporary_accommodation", "specified_supported", "refuge", "supported_without_care"]),
  postcode: z.string().optional(),
  localAuthorityCode: z.string().optional(),
  localAuthorityName: z.string().optional(),
  brmaCode: z.string().optional(),
  brmaName: z.string().optional(),
  lhaBedroomCategory: z.enum(["shared_accommodation", "one_bedroom", "two_bedroom", "three_bedroom", "four_bedroom"]).optional(),
  lhaMonthlyRate: MoneySchema.optional(),
  lhaWeeklyRate: MoneySchema.optional(),
  lhaDatasetVersion: z.string().optional(),
  lhaDatasetChecksum: z.string().optional(),
  eligibleRent: MoneySchema.default({ amountPence: 0, currency: "GBP" }),
  eligibleServiceCharges: MoneySchema.default({ amountPence: 0, currency: "GBP" }),
  rentFrequency: z.enum(["weekly", "fortnightly", "four_weekly", "monthly"]).default("monthly"),
  liabilityVerified: z.boolean().default(false),
  landlordVerified: z.boolean().default(false)
})

export const CreateCaseRequestV2Schema = z.object({
  clientRequestId: z.string().min(8),
  schemaVersion: z.literal("case-create.v2"),
  assessmentPeriod: z.object({
    startDate: ISODateSchema,
    endDate: ISODateSchema
  }),
  household: z.object({
    adults: z.array(AdultDtoSchema).min(1).max(2),
    housing: HousingDtoSchema.optional()
  }),
  consent: z.object({
    saveAssessment: z.boolean(),
    storeLocalDraft: z.boolean().optional()
  })
})

export const CalculateAssessmentPeriodRequestV2Schema = z.object({
  clientRequestId: z.string().min(8),
  schemaVersion: z.literal("calculate-ap.v2"),
  calculationMode: z.enum(["original", "revision", "appeal", "comparison"]).default("original"),
  ratePackVersion: z.string().optional(),
  rulePackVersion: z.string().optional()
})

export const AddCaseEventRequestV2Schema = z.object({
  clientRequestId: z.string().min(8),
  schemaVersion: z.literal("case-event.v2"),
  eventType: z.enum([
    "adult_added",
    "child_added",
    "housing_declared",
    "income_reported",
    "capital_declared",
    "evidence_added",
    "health_declared",
    "sanction_reported",
    "migration_notice_reported",
    "assessment_revised"
  ]),
  occurredAt: ISODateSchema,
  effectiveFrom: ISODateSchema.optional(),
  effectiveTo: ISODateSchema.optional(),
  payload: z.unknown(),
  evidenceRefs: z.array(z.string()).default([])
})

export type CreateCaseRequestV2 = z.infer<typeof CreateCaseRequestV2Schema>
export type CalculateAssessmentPeriodRequestV2 = z.infer<typeof CalculateAssessmentPeriodRequestV2Schema>
export type AddCaseEventRequestV2 = z.infer<typeof AddCaseEventRequestV2Schema>
