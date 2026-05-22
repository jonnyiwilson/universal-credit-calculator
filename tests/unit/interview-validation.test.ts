import { describe, expect, it } from "vitest"
import { createDefaultInterviewDraft } from "../../src/features/assessment-wizard/interviewDraft"
import { validateInterviewDraft } from "../../src/features/assessment-wizard/interviewValidation"
import { gbp } from "../../src/domain/types/money"

describe("REV10 interview validation", () => {
  it("blocks employment income gate without payment rows", () => {
    const draft = createDefaultInterviewDraft()
    draft.hasEmploymentIncome = true

    expect(validateInterviewDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "employment-payment-required", severity: "error" })
    ]))
  })

  it("warns on duplicate same-employer same-date payments", () => {
    const draft = createDefaultInterviewDraft()
    draft.hasEmploymentIncome = true
    draft.employmentIncomes = [
      { draftId: "1", adultRole: "claimant", employerName: "Shop", source: "employment_manual", receivedDate: "2026-05-10", netAmount: gbp(10000), pensionContribution: gbp(0) },
      { draftId: "2", adultRole: "claimant", employerName: "Shop", source: "employment_manual", receivedDate: "2026-05-10", netAmount: gbp(12000), pensionContribution: gbp(0) }
    ]

    expect(validateInterviewDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "warning", message: "Two payments from the same employer have the same received date." })
    ]))
  })

  it("warns when private rent is much higher than the local housing limit", () => {
    const draft = createDefaultInterviewDraft()
    draft.housing.tenure = "private_rent"
    draft.housing.brmaCode = "brma_ashford"
    draft.housing.lhaBedroomCategory = "one_bedroom"
    draft.housing.lhaMonthlyRate = gbp(50000)
    draft.housing.eligibleRentMonthly = gbp(90000)

    expect(validateInterviewDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "rent-above-local-limit", severity: "warning" })
    ]))
  })
})
