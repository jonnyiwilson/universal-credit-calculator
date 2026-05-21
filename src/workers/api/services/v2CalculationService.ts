import { createSnapshotFromReducedState, reduceCaseForAssessmentPeriod } from "../../../../packages/domain/src"
import { getRatePackV2 } from "../../../../packages/rates/src"
import { createCalculationArtifact, runRuleGraph } from "../../../../packages/rules-engine/src"
import { universalCreditReferences } from "../../../../packages/legislation/src"
import { ucRev3Rules, ucV2RulePack } from "../../../../packages/uc-rules/src"
import type { UniversalCreditCase, AssessmentPeriod } from "../../../../packages/domain/src"
import type { CalculateAssessmentPeriodRequestV2 } from "../../../../packages/validation/src"
import type { Env } from "../types"

export function calculateAssessmentPeriodV2(input: {
  env: Env
  universalCreditCase: UniversalCreditCase
  assessmentPeriod: AssessmentPeriod
  request: CalculateAssessmentPeriodRequestV2
  now: string
}) {
  const allowDraft = input.env.ENVIRONMENT !== "production"
  const ratePack = getRatePackV2({
    asOfDate: input.assessmentPeriod.startDate,
    allowDraft,
    version: input.request.ratePackVersion
  })
  const rulePack = input.request.rulePackVersion
    ? { ...ucV2RulePack, version: input.request.rulePackVersion }
    : ucV2RulePack

  const reduction = reduceCaseForAssessmentPeriod({
    universalCreditCase: input.universalCreditCase,
    assessmentPeriod: input.assessmentPeriod,
    events: input.universalCreditCase.timeline,
    mode: input.request.calculationMode,
    now: input.now
  })

  const snapshot = createSnapshotFromReducedState({
    reducedState: reduction.reducedState,
    assessmentPeriod: input.assessmentPeriod,
    snapshotVersion: 1,
    reason: input.request.calculationMode === "original" ? "initial" : "late_change",
    rulePackVersion: rulePack.version,
    ratePackVersion: ratePack.version,
    createdAt: input.now
  })

  const graphResult = runRuleGraph(reduction.reducedState, {
    caseId: input.universalCreditCase.caseId,
    assessmentPeriod: input.assessmentPeriod,
    snapshot,
    ratePack,
    rulePack,
    legislationRegistry: universalCreditReferences,
    clock: { now: input.now }
  }, ucRev3Rules)

  const artifact = createCalculationArtifact({
    caseId: input.universalCreditCase.caseId,
    assessmentPeriod: input.assessmentPeriod,
    snapshot,
    graphResult,
    ratePack,
    rulePack,
    calculationMode: input.request.calculationMode,
    reducerVersion: reduction.reducerVersion,
    reducerHash: reduction.reducedState.reductionHash,
    createdAt: input.now
  })

  const unsupportedCases = graphResult.evaluations.flatMap((evaluation) => evaluation.unsupportedCases)
  const assumptions = graphResult.evaluations.flatMap((evaluation) => evaluation.assumptions)
  const traces = graphResult.evaluations.flatMap((evaluation) => evaluation.trace)
  const derivedArtifacts = graphResult.evaluations.flatMap((evaluation) => evaluation.derivedArtifacts)

  return {
    artifact,
    snapshot,
    traces,
    response: {
      artifactId: artifact.artifactId,
      status: artifact.status,
      finalAward: artifact.finalAwardPence !== undefined ? { amountPence: artifact.finalAwardPence, currency: "GBP" as const } : undefined,
      summary: {
        confidence: artifact.status,
        ratePackVersion: artifact.ratePackVersion,
        rulePackVersion: artifact.rulePackVersion,
        inputHash: artifact.inputHash,
        outputHash: artifact.outputHash
      },
      assumptions,
      unsupportedCases,
      derivedArtifacts,
      tracePreview: traces.map((trace) => ({
        ruleId: trace.ruleId,
        ruleVersion: trace.ruleVersion,
        stage: trace.stage,
        output: trace.output
      }))
    },
    reduction
  }
}
