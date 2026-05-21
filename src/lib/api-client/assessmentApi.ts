import type { AssessmentInput, AssessmentPeriod } from "../../domain/types/assessment"
import type { RunCalculationOutput } from "../../domain/calculator"

export interface CalculateAssessmentRequest {
  assessmentPeriod: AssessmentPeriod
  rateVersion: string
  input: AssessmentInput
}

export async function calculateAssessment(request: CalculateAssessmentRequest): Promise<RunCalculationOutput> {
  const response = await fetch("/api/calculate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`Calculation failed with status ${response.status}`)
  }

  return response.json() as Promise<RunCalculationOutput>
}
