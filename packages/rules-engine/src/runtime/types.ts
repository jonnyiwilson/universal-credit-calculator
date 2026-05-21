import type { AssessmentPeriod, AssessmentPeriodSnapshot, Assumption, UnsupportedCase } from "../../../domain/src"
import type { LegislativeCitation, LegislativeReferenceRegistry } from "../../../legislation/src"
import type { RatePack } from "../../../rates/src"
import type { EntityId } from "../../../shared/src"
import type { TraceEntry } from "../trace/types"

export interface RulePack {
  version: string
  checksum: string
  status: "draft" | "approved" | "retired"
}

export interface RuleContext {
  caseId: EntityId
  assessmentPeriod: AssessmentPeriod
  snapshot: AssessmentPeriodSnapshot
  ratePack: RatePack
  rulePack: RulePack
  legislationRegistry: LegislativeReferenceRegistry
  clock: { now: string }
  evaluations?: RuleEvaluationResult[]
}

export interface RuleEvaluationResult<T = unknown> {
  ruleId: string
  ruleVersion: string
  status: "passed" | "failed" | "not_applicable" | "unknown" | "unsupported"
  value?: T
  trace: TraceEntry[]
  assumptions: Assumption[]
  warnings: Array<{ code: string; message: string; severity: "info" | "warning" | "blocking" }>
  unsupportedCases: UnsupportedCase[]
  derivedArtifacts: DerivedArtifact[]
}

export interface DerivedArtifact {
  artifactType: string
  schemaVersion: string
  value: unknown
}

export interface RuleDependency {
  ruleId: string
}

export type RulePredicate<I> = (input: I, context: RuleContext) => boolean
export type RuleEvaluator<I, O> = (input: I, context: RuleContext) => RuleEvaluationResult<O>

export interface PolicyRule<I = unknown, O = unknown> {
  ruleId: string
  ruleVersion: string
  title: string
  stage: string
  effectiveFrom: string
  effectiveTo?: string
  jurisdiction: "GB"
  dependencies: RuleDependency[]
  appliesWhen: RulePredicate<I>
  requiresEvidence: Array<{ evidenceType: string; required: boolean }>
  evaluate: RuleEvaluator<I, O>
  legalBasis: LegislativeCitation[]
  outputSchemaVersion: string
}
