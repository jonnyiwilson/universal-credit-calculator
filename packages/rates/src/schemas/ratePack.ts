import { z } from "zod"

export const MoneySchema = z.object({
  amountPence: z.number().int(),
  currency: z.literal("GBP")
})

export const RatePackSchema = z.object({
  ratePackId: z.string().min(1),
  version: z.string().min(1),
  status: z.enum(["draft", "approved", "retired"]),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
  jurisdiction: z.literal("GB"),
  preparedBy: z.string().min(1),
  reviewedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  checksum: z.string().min(1),
  signature: z.string().optional(),
  sourceRefs: z.array(z.unknown()),
  rates: z.record(z.string(), z.unknown())
})
