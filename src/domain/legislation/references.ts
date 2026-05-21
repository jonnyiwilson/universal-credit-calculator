import type { LegislationReferenceIndex } from "../types/calculation"

export const legislationReferences: LegislationReferenceIndex = {
  GOV_UK_UC_WHAT_YOU_GET: {
    id: "GOV_UK_UC_WHAT_YOU_GET",
    title: "GOV.UK Universal Credit: What you'll get",
    url: "https://www.gov.uk/universal-credit/what-youll-get",
    note: "Public guidance for claimant-facing explanations."
  },
  ADM_STAFF_GUIDE: {
    id: "ADM_STAFF_GUIDE",
    title: "DWP Advice for Decision Making: staff guide",
    url: "https://www.gov.uk/government/publications/advice-for-decision-making-staff-guide",
    note: "Operational decision-maker guidance."
  },
  UC_REGULATIONS_2013: {
    id: "UC_REGULATIONS_2013",
    title: "The Universal Credit Regulations 2013",
    url: "https://www.legislation.gov.uk/uksi/2013/376/contents",
    note: "Primary Universal Credit regulations."
  },
  UC_TRANSITIONAL_REGULATIONS_2013: {
    id: "UC_TRANSITIONAL_REGULATIONS_2013",
    title: "Universal Credit Transitional Provisions Regulations 2013",
    url: "https://www.legislation.gov.uk/uksi/2013/386/contents",
    note: "Managed migration and transitional protection."
  }
}

export const refs = (...ids: Array<keyof typeof legislationReferences>) =>
  ids.map((id) => legislationReferences[id])
