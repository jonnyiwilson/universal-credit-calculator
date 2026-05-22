# Event Model

The claimant interview emits assessment-period events rather than a single mutable form DTO.

Frontend event drafts contain:

- `sequence`
- `eventType`
- `occurredAt`
- `effectiveFrom`
- `payload`

REV7 active event types:

- `child_added`
- `housing_declared`
- `income_reported`
- `capital_declared`
- `health_declared`
- `evidence_added`
- `migration_notice_reported`
- `sanction_reported`
- `assessment_revised` for deduction declarations

The AP reducer remains the source of truth for turning these events into a calculation snapshot.
