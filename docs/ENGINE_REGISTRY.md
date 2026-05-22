# Engine Registry

The frontend does not call rule engines directly.

Relevant backend engines for REV7 frontend events:

- AP reducer: converts ordered case events into reduced AP state.
- Housing engine: consumes resolved housing and BRMA/LHA event data.
- Income engine: consumes one `income_reported` event per payment.
- Capital engine: consumes `capital_declared` events.
- Childcare engine: consumes childcare evidence events.
- Sanctions and deductions engines: consume sanction events and deduction declarations.
- Award composition engine: consumes derived artifacts and produces final award status.

Frontend changes must preserve this boundary.
