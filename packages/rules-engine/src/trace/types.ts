import type { EntityId } from "../../../shared/src"
import type { LegislativeCitation } from "../../../legislation/src"

export interface TraceEntry {
  traceId: EntityId
  artifactId?: EntityId
  sequenceNumber: number
  ruleId: string
  ruleVersion: string
  stage: string
  legalBasis: LegislativeCitation[]
  inputsHash: string
  inputExcerpt: Record<string, unknown>
  output: unknown
  formula?: string
  evidenceRefs: EntityId[]
  assumptionRefs: EntityId[]
  derivedArtifactRefs: EntityId[]
}
