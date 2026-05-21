export interface Transition<State extends string> {
  from: State
  to: State
  event: string
}

export function createStateMachine<State extends string>(transitions: Transition<State>[]) {
  return {
    canTransition(from: State, to: State): boolean {
      return transitions.some((transition) => transition.from === from && transition.to === to)
    },
    transition(from: State, to: State): State {
      if (!this.canTransition(from, to)) {
        throw new Error(`Invalid state transition from ${from} to ${to}`)
      }
      return to
    },
    transitionsFrom(from: State): Transition<State>[] {
      return transitions.filter((transition) => transition.from === from)
    }
  }
}
