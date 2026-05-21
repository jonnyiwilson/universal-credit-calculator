import { create } from "zustand"

interface UiState {
  fullTraceOpen: boolean
  setFullTraceOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  fullTraceOpen: false,
  setFullTraceOpen: (open) => set({ fullTraceOpen: open })
}))
