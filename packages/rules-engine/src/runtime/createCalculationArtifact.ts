import { createEntityId, stableHash } from "../../../shared/src"
import type { CalculationArtifact, AssessmentPeriodSnapshot, AssessmentPeriod } from "../../../domain/src"
import type { RatePack } from "../../../rates/src"
import type { RuleGraphResult } from "./runRuleGraph"
import type { RulePack } from "./types"

export function createCalculationArtifact(input: {
  caseId: string
  assessmentPeriod: AssessmentPeriod
  snapshot: AssessmentPeriodSnapshot
  graphResult: RuleGraphResult
  ratePack: RatePack
  rulePack: RulePack
  calculationMode: CalculationArtifact["calculationMode"]
  reducerVersion?: string
  reducerHash?: string
  createdAt: string
}): CalculationArtifact {
  const awardComposition = input.graphResult.evaluations
    .flatMap((evaluation) => evaluation.derivedArtifacts)
    .find((artifact) => artifact.artifactType === "award_composition")?.value as { finalAward?: { amountPence: number } } | undefined
  const outputHash = stableHash({
    status: input.graphResult.status,
    finalAward: awardComposition?.finalAward,
    evaluations: input.graphResult.evaluations.map((evaluation) => ({
      ruleId: evaluation.ruleId,
      status: evaluation.status,
      value: evaluation.value,
      unsupportedCases: evaluation.unsupportedCases.map((item) => item.code)
    }))
  })

  return {
    artifactId: createEntityId("artifact"),
    caseId: input.caseId,
    assessmentPeriodId: input.assessmentPeriod.assessmentPeriodId,
    snapshotId: input.snapshot.snapshotId,
    calculationMode: input.calculationMode,
    status: input.graphResult.status,
    ratePackVersion: input.ratePack.version,
    ratePackChecksum: input.ratePack.checksum,
    rulePackVersion: input.rulePack.version,
    rulePackChecksum: input.rulePack.checksum,
    inputHash: input.snapshot.inputHash,
    outputHash,
    finalAwardPence: awardComposition?.finalAward?.amountPence,
    reducerVersion: input.reducerVersion,
    reducerHash: input.reducerHash,
    createdAt: input.createdAt
  }
}
