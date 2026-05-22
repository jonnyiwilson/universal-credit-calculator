import type { AdultRole, ClaimantInterviewDraft } from "./interviewDraft"

export const claimantTerms = {
  localRentArea: "Local rent area",
  localHousingLimit: "Local housing limit",
  calculationBreakdown: "Calculation breakdown",
  technicalDetails: "Technical details",
  unsupported: "This situation cannot yet be calculated safely",
  manualEmployment: "Employment payment entered by you"
}

export function personLabel(draft: ClaimantInterviewDraft, role: AdultRole) {
  const adult = draft.adults.find((item) => item.role === role)
  return adult?.firstName?.trim() || (role === "claimant" ? "claimant" : "partner")
}

export function childLabel(draft: ClaimantInterviewDraft, index: number) {
  return draft.children[index]?.firstName?.trim() || `child ${index + 1}`
}

export function householdOwner(draft: ClaimantInterviewDraft) {
  const claimant = personLabel(draft, "claimant")
  return claimant === "claimant" ? "your household" : `${claimant}'s household`
}

export function sourceLabel(source: string | undefined) {
  if (source === "employment_manual") return claimantTerms.manualEmployment
  if (source === "employment_rti") return "Employment payment from payroll records"
  return source?.replaceAll("_", " ") ?? ""
}

export function tenureLabel(tenure: string) {
  const labels: Record<string, string> = {
    none: "No housing costs",
    private_rent: "Private rent",
    social_rent: "Council or housing association rent",
    owner: "Own your home",
    temporary_accommodation: "Temporary accommodation",
    specified_supported: "Supported accommodation",
    refuge: "Refuge accommodation"
  }
  return labels[tenure] ?? tenure
}
