# Frontend Architecture

REV7 makes the active claimant journey event-driven.

The frontend collects interview answers into `ClaimantInterviewDraft`, then converts those answers into ordered `case-event.v2` drafts. The frontend does not calculate Universal Credit entitlement, select policy rates, or suppress unsupported outcomes.

Core rules:

- Active result pages render persisted server artifacts.
- Employment income is captured as one event per payment.
- Optional domains use yes/no gates before details are shown.
- Postcode lookup never guesses a BRMA; manual BRMA selection remains available.
- Legacy scalar `AssessmentInput` remains compatibility-only.
- Claimant-facing labels use plain English; technical policy identifiers are hidden in technical details.
- Frontend validation can warn or block obvious input mistakes, but backend artifacts remain authoritative.
