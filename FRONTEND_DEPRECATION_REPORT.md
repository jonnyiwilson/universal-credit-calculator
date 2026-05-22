# FRONTEND DEPRECATION REPORT

## REV7 Active Flow

- The active wizard now uses `ClaimantInterviewDraft` and assessment-period event drafts.
- Employment income is captured as dynamic `income_reported` events.
- Deductions and sanctions are gated by claimant questions before any events are emitted.
- Private-rent BRMA/LHA fields are shown only for private rent.
- Postcode lookup explains local mapping-data limitations and never guesses a BRMA.
- Results remain rendered from server calculation artifacts.

## Deprecated Compatibility Surface

- `AssessmentInput` remains for legacy tests, fixtures, schemas, and prototype compatibility only.
- `legacyAssessmentInputToEventDrafts()` exists as a temporary migration adapter.
- `createCaseFromPrototypeInput()` and `appendPrototypeEventsToCase()` remain in the API client for compatibility but are no longer used by the active wizard.
- `runUniversalCreditCalculation()` remains in legacy calculator tests and is not imported by the active wizard.

## Remaining Cleanup

- Move any future prototype-only UI into `archive/frontend-prototype`.
- Delete compatibility adapters after event-driven frontend tests and backend event coverage are complete.
- Keep CI guards preventing scalar income fields or local calculator imports from returning to the active wizard.
