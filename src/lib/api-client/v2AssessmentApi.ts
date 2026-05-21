import type { AssessmentInput } from "../../domain/types/assessment"

export interface CreateCaseV2Response {
  caseId: string
  assessmentPeriodId: string
  caseSnapshotId: string
  accessToken: string
  tokenExpiresAt: string
  status: string
}

export interface CalculationResponseV2 {
  artifactId: string
  status: "determined" | "partial" | "unsupported" | "failed"
  finalAward?: { amountPence: number; currency: "GBP" }
  summary: {
    confidence: string
    ratePackVersion: string
    rulePackVersion: string
    inputHash: string
    outputHash: string
  }
  assumptions: Array<{ assumptionId: string; severity: string; code: string; message: string }>
  unsupportedCases: Array<{ unsupportedCaseId: string; code: string; severity: string; userMessage: string; reason: string }>
  derivedArtifacts: Array<{ artifactType: string; schemaVersion: string; value: unknown }>
  tracePreview: Array<{ ruleId: string; ruleVersion: string; stage: string; output: unknown }>
}

export async function createCaseFromPrototypeInput(input: AssessmentInput): Promise<CreateCaseV2Response> {
  const claimantBirthYear = new Date().getFullYear() - input.household.claimantAge
  const partnerBirthYear = input.household.partnerAge ? new Date().getFullYear() - input.household.partnerAge : undefined
  const response = await fetch("/api/v2/cases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRequestId: crypto.randomUUID(),
      schemaVersion: "case-create.v2",
      assessmentPeriod: {
        startDate: currentAssessmentPeriod().startDate,
        endDate: currentAssessmentPeriod().endDate
      },
      household: {
        adults: [
          {
            role: "claimant",
            dateOfBirth: `${claimantBirthYear}-01-01`,
            immigrationStatus: "eligible",
            habitualResidenceStatus: "passes_habitual_residence",
            studentStatus: "not_student",
            prisonStatus: "not_in_prison"
          },
          ...(partnerBirthYear
            ? [
                {
                  role: "partner",
                  dateOfBirth: `${partnerBirthYear}-01-01`,
                  immigrationStatus: "eligible",
                  habitualResidenceStatus: "passes_habitual_residence",
                  studentStatus: "not_student",
                  prisonStatus: "not_in_prison"
                }
              ]
            : [])
        ],
        housing:
          input.housing.tenure === "none"
            ? undefined
            : {
                tenure: input.housing.tenure === "owner" ? "owner_occupier" : input.housing.tenure,
                eligibleRent: input.housing.eligibleRentMonthly,
                eligibleServiceCharges: input.housing.eligibleServiceChargesMonthly,
                rentFrequency: "monthly",
                liabilityVerified: true,
                landlordVerified: false
              }
      },
      consent: { saveAssessment: true, storeLocalDraft: false }
    })
  })
  if (!response.ok) throw new Error(`v2 case creation failed: ${response.status}`)
  return response.json() as Promise<CreateCaseV2Response>
}

export async function appendPrototypeEventsToCase(input: AssessmentInput, created: CreateCaseV2Response): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const events = [
    ...input.children.map((child) => ({
      eventType: "child_added",
      occurredAt: today,
      effectiveFrom: today,
      payload: {
        dateOfBirth: child.dateOfBirth,
        livesWithHousehold: true,
        responsibilityStatus: "responsible",
        disabilityAwards: child.disabled || child.severelyDisabled
          ? [{ type: "dla_child", rate: child.severelyDisabled ? "higher" : "lower", evidenceRefs: [] }]
          : [],
        twoChildLimitException: child.twoChildLimitException ? { type: "other", evidenceRefs: [] } : undefined
      }
    })),
    {
      eventType: "income_reported",
      occurredAt: today,
      effectiveFrom: today,
      payload: {
        source: "employment_manual",
        receivedDate: today,
        netAmount: input.earnings.employmentNetMonthly,
        pensionContribution: input.earnings.pensionContributionsMonthly
      }
    },
    ...(input.earnings.otherIncomeMonthly.amountPence > 0
      ? [{
          eventType: "income_reported",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            source: "other",
            receivedDate: today,
            netAmount: input.earnings.otherIncomeMonthly
          }
        }]
      : []),
    ...(input.selfEmployment.enabled
      ? [{
          eventType: "income_reported",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            source: "self_employment",
            receivedDate: today,
            netAmount: { amountPence: Math.max(0, input.selfEmployment.incomeMonthly.amountPence - input.selfEmployment.allowableExpensesMonthly.amountPence), currency: "GBP" },
            businessIncome: input.selfEmployment.incomeMonthly,
            allowableExpenses: input.selfEmployment.allowableExpensesMonthly,
            gainfullySelfEmployed: input.selfEmployment.gainfullySelfEmployed,
            startupPeriodApplies: input.selfEmployment.startupPeriodApplies,
            gatewayStatus: input.selfEmployment.gainfullySelfEmployed ? "gainfully_self_employed" : "gateway_pending"
          }
        }]
      : []),
    ...[
      { type: "cash", value: input.capital.cashSavings },
      { type: "investment", value: input.capital.investments },
      { type: "property_other", value: input.capital.propertyCapital },
      { type: "notional_capital", value: input.capital.notionalCapital, deprivationFlag: input.capital.deprivationOfCapital, notionalCapitalDecisionRef: input.capital.deprivationOfCapital ? undefined : "notional-declared" }
    ].filter((asset) => asset.value.amountPence > 0).map((asset) => ({
      eventType: "capital_declared",
      occurredAt: today,
      effectiveFrom: today,
      payload: {
        type: asset.type,
        value: asset.value,
        valuationDate: today,
        valuationConfidence: "declared",
        deprivationFlag: asset.deprivationFlag,
        notionalCapitalDecisionRef: asset.notionalCapitalDecisionRef
      }
    })),
    ...(input.health.lcw || input.health.lcwra
      ? [{
          eventType: "health_declared",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            status: input.health.lcwra ? "lcwra" : "lcw",
            lcwraCohort: input.health.lcwra ? "unknown" : undefined
          }
        }]
      : []),
    ...(input.household.hasCaringResponsibilities
      ? [{
          eventType: "health_declared",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            caringHoursPerWeek: input.household.caringHoursPerWeek,
            qualifyingBenefitVerified: false
          }
        }]
      : []),
    ...(input.childcare.monthlyCosts.amountPence > 0
      ? [{
          eventType: "evidence_added",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            evidenceType: "childcare_invoice",
            status: input.childcare.approvedProvider ? "verified" : "provided",
            monthlyCosts: input.childcare.monthlyCosts,
            approvedProvider: input.childcare.approvedProvider,
            childCountForCap: input.childcare.childCountForCap
          }
        }]
      : []),
    ...(input.transitionalProtection.managedMigration
      ? [{
          eventType: "migration_notice_reported",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            status: input.transitionalProtection.transitionalElementMonthly.amountPence > 0 ? "active" : "baseline_pending",
            baselineAmount: input.transitionalProtection.transitionalElementMonthly,
            currentAmount: input.transitionalProtection.transitionalElementMonthly
          }
        }]
      : []),
    ...(input.sanction.level !== "none" || input.sanction.amountMonthly.amountPence > 0
      ? [{
          eventType: "sanction_reported",
          occurredAt: today,
          effectiveFrom: today,
          payload: {
            status: "active",
            level: input.sanction.level,
            amount: input.sanction.amountMonthly
          }
        }]
      : [])
  ]

  for (const event of events) {
    await appendCaseEventV2(created.caseId, created.accessToken, event)
  }
}

async function appendCaseEventV2(caseId: string, accessToken: string, event: { eventType: string; occurredAt: string; effectiveFrom?: string; payload: unknown }) {
  const response = await fetch(`/api/v2/cases/${caseId}/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      clientRequestId: crypto.randomUUID(),
      schemaVersion: "case-event.v2",
      evidenceRefs: [],
      ...event
    })
  })
  if (!response.ok) throw new Error(`v2 event append failed: ${response.status}`)
}

export async function calculateAssessmentPeriodV2(input: {
  assessmentPeriodId: string
  accessToken: string
}): Promise<CalculationResponseV2> {
  const response = await fetch(`/api/v2/assessment-periods/${input.assessmentPeriodId}/calculate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`
    },
    body: JSON.stringify({
      clientRequestId: crypto.randomUUID(),
      schemaVersion: "calculate-ap.v2",
      calculationMode: "original"
    })
  })
  if (!response.ok) throw new Error(`v2 calculation failed: ${response.status}`)
  return response.json() as Promise<CalculationResponseV2>
}

function currentAssessmentPeriod() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  }
}
