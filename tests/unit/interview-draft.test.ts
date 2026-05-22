import { describe, expect, it } from "vitest"
import { buildCaseEventDrafts, createDefaultInterviewDraft } from "../../src/features/assessment-wizard/interviewDraft"
import { gbp } from "../../src/domain/types/money"

describe("REV7 interview event drafts", () => {
  it("creates one income_reported event for each employment payment in stable order", () => {
    const draft = createDefaultInterviewDraft()
    draft.hasEmploymentIncome = true
    draft.employmentIncomes = [
      {
        draftId: "income-1",
        adultRole: "claimant",
        employerName: "Morning job",
        source: "employment_manual",
        receivedDate: "2026-05-10",
        netAmount: gbp(50000),
        pensionContribution: gbp(1000),
        payrollFrequency: "monthly"
      },
      {
        draftId: "income-2",
        adultRole: "partner",
        employerName: "Evening job",
        source: "employment_rti",
        receivedDate: "2026-05-20",
        netAmount: gbp(30000),
        pensionContribution: gbp(0),
        payrollFrequency: "weekly"
      }
    ]

    const incomeEvents = buildCaseEventDrafts(draft).filter((event) => event.eventType === "income_reported")

    expect(incomeEvents).toHaveLength(2)
    expect(incomeEvents.map((event) => event.sequence)).toEqual([1, 2])
    expect(incomeEvents.map((event) => (event.payload as { adultRole: string }).adultRole)).toEqual(["claimant", "partner"])
  })

  it("does not emit deductions when the claimant says deductions do not apply", () => {
    const draft = createDefaultInterviewDraft()
    draft.hasDeductions = false
    draft.deductions = [{ draftId: "deduction-1", type: "advance_repayment", amountMonthly: gbp(2500) }]

    expect(buildCaseEventDrafts(draft).some((event) => event.eventType === "assessment_revised")).toBe(false)
  })

  it("includes resolved private rent LHA data and non-dependants in the housing event", () => {
    const draft = createDefaultInterviewDraft()
    draft.housing = {
      tenure: "private_rent",
      brmaCode: "brma_ashford",
      brmaName: "Ashford",
      lhaBedroomCategory: "one_bedroom",
      lhaMonthlyRate: gbp(75000),
      lhaWeeklyRate: gbp(17308),
      lhaDatasetVersion: "england-lha-2026-2027",
      lhaDatasetChecksum: "checksum",
      eligibleRentMonthly: gbp(80000),
      eligibleServiceChargesMonthly: gbp(0)
    }
    draft.nonDependants = [{
      draftId: "nondep-1",
      dateOfBirth: "1990-01-01",
      relationshipToClaimant: "friend",
      exemptFromDeduction: false,
      benefitsReceived: "",
      housingContributionMayApply: true
    }]

    const housingEvent = buildCaseEventDrafts(draft).find((event) => event.eventType === "housing_declared")

    expect(housingEvent?.payload).toMatchObject({
      brmaCode: "brma_ashford",
      lhaDatasetVersion: "england-lha-2026-2027",
      nonDependants: [{ personId: "nondep-1", housingContributionMayApply: true }]
    })
  })
})
