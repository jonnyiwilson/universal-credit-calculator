export interface LegislativeCitation {
  sourceType: "legislation" | "adm" | "govuk" | "dwp-guidance" | "case-law" | "internal-policy"
  title: string
  url: string
  regulation?: string
  chapter?: string
  paragraph?: string
  effectiveFrom: string
  effectiveTo?: string
  retrievedAt: string
  appliesToJurisdiction: "GB" | "England" | "Wales" | "Scotland"
}

export type LegislativeReferenceRegistry = Record<string, LegislativeCitation>
