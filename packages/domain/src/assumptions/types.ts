import type { EntityId } from "../../../shared/src"

export interface Assumption {
  assumptionId: EntityId
  severity: "info" | "warning" | "blocking"
  code: string
  message: string
  assumedValue?: unknown
  affectedRuleIds: string[]
  canUserResolve: boolean
  resolutionPrompt?: string
}

export class AssumptionRegistry {
  private readonly assumptions: Assumption[] = []

  add(assumption: Assumption): Assumption {
    this.assumptions.push(assumption)
    return assumption
  }

  list(): Assumption[] {
    return [...this.assumptions]
  }

  hasBlocking(): boolean {
    return this.assumptions.some((assumption) => assumption.severity === "blocking")
  }
}
