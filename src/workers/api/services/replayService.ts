import { calculateAssessmentPeriodV2 } from "./v2CalculationService"
import { loadCalculationArtifactV2, loadCaseForAssessmentPeriod } from "../repositories/v2CaseRepository"
import { stableHash } from "../../../../packages/shared/src"
import type { Env } from "../types"

export async function replayCalculationArtifactV2(input: {
  env: Env
  artifactId: string
  now: string
}) {
  const original = await loadCalculationArtifactV2(input.env, input.artifactId)
  if (!original) return null
  const loaded = await loadCaseForAssessmentPeriod(input.env, original.assessmentPeriodId)
  if (!loaded) return null

  const replay = calculateAssessmentPeriodV2({
    env: input.env,
    universalCreditCase: loaded.universalCreditCase,
    assessmentPeriod: loaded.assessmentPeriod,
    request: {
      clientRequestId: `replay-${input.artifactId}`,
      schemaVersion: "calculate-ap.v2",
      calculationMode: original.calculationMode,
      ratePackVersion: original.ratePackVersion,
      rulePackVersion: original.rulePackVersion
    },
    now: input.now
  })

  const checks = {
    inputHash: replay.artifact.inputHash === original.inputHash,
    outputHash: replay.artifact.outputHash === original.outputHash,
    reducerHash: replay.artifact.reducerHash === original.reducerHash,
    ratePackChecksum: replay.artifact.ratePackChecksum === original.ratePackChecksum,
    rulePackChecksum: replay.artifact.rulePackChecksum === original.rulePackChecksum,
    finalAwardPence: replay.artifact.finalAwardPence === original.finalAwardPence,
    status: replay.artifact.status === original.status
  }
  const failedChecks = Object.entries(checks).filter(([, matched]) => !matched).map(([name]) => name)
  const status = failedChecks.length === 0 ? "matched" : failedChecks.length <= 1 ? "matched_with_warnings" : "failed"
  const diffHash = stableHash({ artifactId: input.artifactId, checks, replayOutputHash: replay.artifact.outputHash, originalOutputHash: original.outputHash })

  return {
    artifactId: input.artifactId,
    status,
    checks,
    failedChecks,
    diffHash,
    original: {
      status: original.status,
      finalAwardPence: original.finalAwardPence,
      inputHash: original.inputHash,
      outputHash: original.outputHash,
      reducerHash: original.reducerHash
    },
    replay: {
      status: replay.artifact.status,
      finalAwardPence: replay.artifact.finalAwardPence,
      inputHash: replay.artifact.inputHash,
      outputHash: replay.artifact.outputHash,
      reducerHash: replay.artifact.reducerHash
    }
  }
}
