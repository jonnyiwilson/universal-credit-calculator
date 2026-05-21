export interface Env {
  DB: D1Database
  RESEND_API_KEY?: string
  REPORT_FROM_EMAIL?: string
  ENVIRONMENT?: "local" | "preview" | "staging" | "production"
}

export interface PersistedAssessmentRow {
  id: string
  status: string
  assessment_period_start: string
  assessment_period_end: string
  rate_version: string
  calculation_engine_version: string
  created_at: string
  updated_at: string
}
