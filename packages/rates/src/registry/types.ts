import type { Money } from "../../../shared/src"
import type { LegislativeCitation } from "../../../legislation/src"

export interface RatePack {
  ratePackId: string
  version: string
  status: "draft" | "approved" | "retired"
  effectiveFrom: string
  effectiveTo?: string
  jurisdiction: "GB"
  preparedBy: string
  reviewedBy?: string
  approvedBy?: string
  approvedAt?: string
  checksum: string
  signature?: string
  sourceRefs: LegislativeCitation[]
  rates: {
    standardAllowances: Record<string, Money>
    childElements: Record<string, Money>
    healthElements: Record<string, Money>
    carerElement: Money
    housing: Record<string, Money | number>
    childcare: Record<string, Money | number>
    capital: Record<string, Money | number>
    earnings: Record<string, Money | number>
    deductions: Record<string, Money | number>
    sanctions: Record<string, Money | number>
    benefitCap: Record<string, Money | number>
  }
}

export interface RateLookupOptions {
  asOfDate: string
  allowDraft: boolean
  version?: string
}
