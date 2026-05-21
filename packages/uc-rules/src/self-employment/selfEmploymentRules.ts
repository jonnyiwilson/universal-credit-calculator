import { createEntityId, gbp, stableHash, zeroGbp } from "../../../shared/src"
import type { Assumption, ReducedAssessmentPeriodState, UnsupportedCase } from "../../../domain/src"
import { universalCreditReferences } from "../../../legislation/src"
import type { PolicyRule } from "../../../rules-engine/src"
import type { SelfEmploymentArtifact } from "../artifacts/types"

export const selfEmploymentAssessmentRule: PolicyRule<ReducedAssessmentPeriodState, SelfEmploymentArtifact> = {
  ruleId: "SELF-EMPLOYMENT-ASSESS-001",
  ruleVersion: "2026.2.0",
  title: "Assess self-employed income and MIF lifecycle",
  stage: "self_employment",
  effectiveFrom: "2026-04-06",
  jurisdiction: "GB",
  dependencies: [{ ruleId: "INCOME-AGGREGATE-001" }],
  appliesWhen: () => true,
  requiresEvidence: [{ evidenceType: "self_employment_accounts", required: false }],
  legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
  outputSchemaVersion: "self-employment-artifact.v1",
  evaluate: (input) => {
    const selfEmploymentState = (input as unknown as {
      selfEmploymentState?: {
        enabled?: boolean
        gainfullySelfEmployed?: boolean
        gatewayStatus?: string
        startupPeriodApplies?: boolean
        incomePence?: number
        expensesPence?: number
        expectedHours?: number
        hourlyRatePence?: number
        lossCarriedForwardPence?: number
        director?: boolean
        mifSuspended?: boolean
      }
    }).selfEmploymentState
    const assumptions: Assumption[] = []
    const unsupportedCases: UnsupportedCase[] = []

    if (!selfEmploymentState?.enabled) {
      return response({
        status: "not_applicable",
        actualProfit: zeroGbp(),
        allowableExpenses: zeroGbp(),
        lossCarriedForward: zeroGbp(),
        usedIncome: zeroGbp(),
        gatewayStatus: "not_self_employed",
        startupPeriodApplies: false,
        evidenceRefs: []
      })
    }

    if (selfEmploymentState.director) {
      unsupportedCases.push(blocking("COMPANY_DIRECTOR_UNSUPPORTED", "Company director self-employment needs a separate income model."))
    }
    if (!selfEmploymentState.gatewayStatus && selfEmploymentState.gainfullySelfEmployed === undefined) {
      assumptions.push({
        assumptionId: createEntityId("assumption"),
        severity: "blocking",
        code: "GSE_GATEWAY_UNKNOWN",
        message: "Gainful self-employment gateway decision is unknown.",
        affectedRuleIds: ["SELF-EMPLOYMENT-ASSESS-001"],
        canUserResolve: true,
        resolutionPrompt: "Confirm whether DWP has decided the claimant is gainfully self-employed."
      })
    }

    const actualProfitPence = Math.max(0, (selfEmploymentState.incomePence ?? 0) - (selfEmploymentState.expensesPence ?? 0) - (selfEmploymentState.lossCarriedForwardPence ?? 0))
    const expectedHours = selfEmploymentState.expectedHours ?? 35
    const hourlyRate = selfEmploymentState.hourlyRatePence ?? 1210
    const mif = selfEmploymentState.gainfullySelfEmployed && !selfEmploymentState.startupPeriodApplies && !selfEmploymentState.mifSuspended
      ? gbp(Math.round(expectedHours * hourlyRate * 52 / 12))
      : zeroGbp()
    const usedIncome = gbp(Math.max(actualProfitPence, mif.amountPence))
    const artifact: SelfEmploymentArtifact = {
      status: unsupportedCases.length ? "unsupported" : assumptions.some((item) => item.severity === "blocking") ? "unknown" : mif.amountPence > actualProfitPence ? "mif_applied" : "actual_profit",
      actualProfit: gbp(actualProfitPence),
      allowableExpenses: gbp(selfEmploymentState.expensesPence ?? 0),
      lossCarriedForward: gbp(selfEmploymentState.lossCarriedForwardPence ?? 0),
      minimumIncomeFloor: mif.amountPence > 0 ? mif : undefined,
      usedIncome,
      gatewayStatus: selfEmploymentState.gatewayStatus ?? (selfEmploymentState.gainfullySelfEmployed ? "gainfully_self_employed" : "unknown"),
      startupPeriodApplies: selfEmploymentState.startupPeriodApplies === true,
      evidenceRefs: []
    }
    return response(artifact)

    function response(artifact: SelfEmploymentArtifact) {
      return {
        ruleId: "SELF-EMPLOYMENT-ASSESS-001",
        ruleVersion: "2026.2.0",
        status: unsupportedCases.length ? "unsupported" as const : assumptions.some((item) => item.severity === "blocking") ? "unknown" as const : "passed" as const,
        value: artifact,
        trace: [{
          traceId: createEntityId("trace"),
          sequenceNumber: 1,
          ruleId: "SELF-EMPLOYMENT-ASSESS-001",
          ruleVersion: "2026.2.0",
          stage: "self_employment",
          legalBasis: [universalCreditReferences.GOV_UK_UC_WHAT_YOU_GET_2026],
          inputsHash: stableHash(selfEmploymentState ?? {}),
          inputExcerpt: { gatewayStatus: artifact.gatewayStatus, startupPeriodApplies: artifact.startupPeriodApplies },
          output: artifact,
          evidenceRefs: [],
          assumptionRefs: assumptions.map((assumption) => assumption.assumptionId),
          derivedArtifactRefs: []
        }],
        assumptions,
        warnings: [],
        unsupportedCases,
        derivedArtifacts: [{ artifactType: "self_employment_assessment", schemaVersion: "self-employment-artifact.v1", value: artifact }]
      }
    }
  }
}

function blocking(code: string, message: string): UnsupportedCase {
  return {
    unsupportedCaseId: createEntityId("unsupported"),
    code,
    severity: "blocking",
    reason: message,
    affectedStages: ["self_employment", "income", "award_composition"],
    userMessage: message,
    internalNotes: code
  }
}
