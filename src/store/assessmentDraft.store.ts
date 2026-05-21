import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AssessmentInput } from "../domain/types/assessment"
import type { CalculationResult } from "../domain/types/calculation"
import { createDefaultAssessmentInput } from "../tests/fixtures/defaultAssessment"

export type AssessmentStep =
  | "household"
  | "children"
  | "earnings"
  | "selfEmployment"
  | "housing"
  | "childcare"
  | "capital"
  | "health"
  | "deductions"
  | "transitionalProtection"
  | "review"
  | "results"

interface StepValidationState {
  valid: boolean
  message?: string
}

interface AssessmentDraftState {
  draftId: string
  currentStep: AssessmentStep
  input: AssessmentInput
  validationState: Partial<Record<AssessmentStep, StepValidationState>>
  lastCalculatedResult?: CalculationResult
  setCurrentStep: (step: AssessmentStep) => void
  setInput: (input: AssessmentInput) => void
  setLastCalculatedResult: (result: CalculationResult) => void
  resetDraft: () => void
}

const newDraftId = () => crypto.randomUUID()

export const useAssessmentDraftStore = create<AssessmentDraftState>()(
  persist(
    (set) => ({
      draftId: newDraftId(),
      currentStep: "household",
      input: createDefaultAssessmentInput(),
      validationState: {},
      setCurrentStep: (step) => set({ currentStep: step }),
      setInput: (input) => set({ input }),
      setLastCalculatedResult: (result) => set({ lastCalculatedResult: result }),
      resetDraft: () =>
        set({
          draftId: newDraftId(),
          currentStep: "household",
          input: createDefaultAssessmentInput(),
          validationState: {},
          lastCalculatedResult: undefined
        })
    }),
    {
      name: "uc-assessment-draft"
    }
  )
)
