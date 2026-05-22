# System Overview

The platform is an AP-driven Universal Credit assessment system.

Current production direction:

- Frontend asks claimant interview questions.
- Interview answers become immutable assessment-period events.
- The AP reducer creates replayable snapshots.
- The rule graph produces derived artifacts, assumptions, unsupported cases, traces, and final award artifacts.
- Reports and UI read artifacts rather than recalculating locally.

REV7 removes claimant-visible scalar form assumptions from the active wizard.
