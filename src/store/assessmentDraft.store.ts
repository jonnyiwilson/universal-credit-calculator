import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createDefaultInterviewDraft, type ClaimantInterviewDraft } from "../features/assessment-wizard/interviewDraft"

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
  interview: ClaimantInterviewDraft
  validationState: Partial<Record<AssessmentStep, StepValidationState>>
  setCurrentStep: (step: AssessmentStep) => void
  setInterview: (interview: ClaimantInterviewDraft) => void
  resetDraft: () => void
}

const newDraftId = () => crypto.randomUUID()

export const useAssessmentDraftStore = create<AssessmentDraftState>()(
  persist(
    (set) => ({
      draftId: newDraftId(),
      currentStep: "household",
      interview: createDefaultInterviewDraft(),
      validationState: {},
      setCurrentStep: (step) => set({ currentStep: step }),
      setInterview: (interview) => set({ interview }),
      resetDraft: () =>
        set({
          draftId: newDraftId(),
          currentStep: "household",
          interview: createDefaultInterviewDraft(),
          validationState: {}
        })
    }),
    {
      name: "uc-assessment-draft"
    }
  )
)
