import type { AssessmentInput, AssessmentPeriod } from "../../../domain/types/assessment"
import type { RunCalculationOutput } from "../../../domain/calculator"
import type { Env } from "../types"

export async function saveAssessment(env: Env, input: AssessmentInput, period: AssessmentPeriod, calculation: RunCalculationOutput) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const totalDeductions =
    calculation.result.earningsDeduction.amountPence +
    calculation.result.capitalDeduction.amountPence +
    calculation.result.otherDeductions.amountPence

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO assessments (
        id, status, assessment_period_start, assessment_period_end, rate_version,
        calculation_engine_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, "saved", period.startDate, period.endDate, calculation.rateVersion, calculation.calculationEngineVersion, now, now),
    env.DB.prepare(
      `INSERT INTO assessment_inputs (assessment_id, input_json, input_schema_version)
       VALUES (?, ?, ?)`
    ).bind(id, JSON.stringify(input), "0.1.0"),
    env.DB.prepare(
      `INSERT INTO assessment_results (
        assessment_id, result_json, final_award_pence, maximum_entitlement_pence,
        total_deductions_pence, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      JSON.stringify(calculation.result),
      calculation.result.finalAward.amountPence,
      calculation.result.maximumEntitlement.amountPence,
      totalDeductions,
      now
    ),
    ...calculation.trace.map((entry) =>
      env.DB.prepare(
        `INSERT INTO calculation_traces (
          id, assessment_id, rule_id, stage, trace_json, legislation_refs_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), id, entry.ruleId, entry.stage, JSON.stringify(entry), JSON.stringify(entry.legislationRefs), now)
    )
  ])

  return id
}

export async function getAssessment(env: Env, id: string) {
  const assessment = await env.DB.prepare("SELECT * FROM assessments WHERE id = ?").bind(id).first()
  const input = await env.DB.prepare("SELECT * FROM assessment_inputs WHERE assessment_id = ?").bind(id).first()
  const result = await env.DB.prepare("SELECT * FROM assessment_results WHERE assessment_id = ?").bind(id).first()
  const traces = await env.DB.prepare("SELECT trace_json FROM calculation_traces WHERE assessment_id = ? ORDER BY created_at").bind(id).all()

  if (!assessment || !input || !result) {
    return null
  }

  return {
    assessment,
    input: JSON.parse(String(input.input_json)),
    result: JSON.parse(String(result.result_json)),
    trace: traces.results.map((row) => JSON.parse(String(row["trace_json"])))
  }
}
