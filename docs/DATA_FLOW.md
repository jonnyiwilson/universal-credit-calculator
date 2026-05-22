# Data Flow

```txt
Claimant interview
  -> ClaimantInterviewDraft
  -> ordered CaseEventDraft[]
  -> /api/v2/cases
  -> /api/v2/cases/:caseId/events
  -> AP reducer
  -> rule graph
  -> persisted calculation artifact
  -> artifact result view
```

The frontend owns interview state and display state only. The backend owns calculation state, reducer state, assumptions, unsupported cases, traces, and final award artifacts.
