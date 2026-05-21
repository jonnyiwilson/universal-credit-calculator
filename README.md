# Universal Credit Rules Platform

An assessment-period-driven Universal Credit rules platform designed to evolve from a prototype calculator into an auditable, replayable, policy-aware decision engine.

## Overview

This project is intentionally being built around:

- deterministic replayability
- immutable historical calculations
- assessment-period correctness
- explainable decisions
- rule traceability
- policy versioning
- unsupported-case safety
- audit-grade artifacts

The platform is not designed as a simple calculator.

It is designed as:

- Case Timeline
  - Assessment Period Reduction
  - Rule Graph Execution
  - Derived Decisions
  - Immutable Calculation Artifacts
  - Reports / Audit Outputs

## Current Platform Status

### V1 — Prototype calculator

Characteristics:

- React form wizard
- direct calculation pipeline
- simplified UC formulas
- local calculations
- minimal persistence

Status:

- Prototype only.
- Not production-safe.

### V2 — Architecture foundation

Introduced:

- AP ledger
- immutable snapshots
- rule graph runtime
- state machines
- unsupported-case gating
- rate-pack lifecycle
- append-only artifacts
- v2 persistence model

Status:

- Foundational platform architecture.

### V3 — Working AP-driven platform slice

Introduced:

- AP event reducer
- derived artifact persistence
- assumptions persistence
- access-token enforcement groundwork
- v2 event API
- frontend artifact rendering
- award composition scaffolding

Status:

- Credible policy-platform architecture.
- Still incomplete policy depth.

## Core Architectural Principles

### 1. Assessment Period Authoritative

Universal Credit is assessment-period-based.

Everything in the platform revolves around `AssessmentPeriod`, not single form submission.

All calculations derive from:

- AP dates
- effective events
- received earnings
- policy versions
- rate versions

### 2. Immutable Historical Decisions

Historical calculations must never mutate.

Instead:

- new AP snapshots are created
- new artifacts are inserted
- revisions create new artifacts
- supersessions create new artifacts

This supports:

- appeals
- audit replay
- historical reconstruction
- rate comparison
- policy comparison

### 3. Event-Driven Reduction

Cases evolve through events.

Example events:

- `case_created`
- `income_reported`
- `housing_changed`
- `child_added`
- `fit_note_added`
- `sanction_applied`

The reducer creates deterministic AP state from those events.

### 4. Rule Graph Execution

The system does not execute one large calculator.

Instead, it runs a dependency graph:

- Eligibility
- Income
- Capital
- Housing
- Work Allowance
- Award Composition

Rules:

- declare dependencies
- declare effective dates
- emit traces
- emit assumptions
- emit derived artifacts

### 5. Unsupported-Case Safety

The system must NEVER provide fake certainty.

Unknown or unsupported states must block, partial, or warn instead of silently estimating.

Examples:

- temporary accommodation
- unknown immigration status
- unsupported student scenarios
- refugee accommodation

## Monorepo Structure

- `apps/`
  - `frontend/`
  - `worker-api/`
- `packages/`
  - `shared/`
  - `domain/`
  - `rules-engine/`
  - `rates/`
  - `legislation/`
  - `validation/`
  - `uc-rules/`
- `infra/`
  - `migrations/`
- `tests/`
  - `unit/`
  - `integration/`
  - `golden-scenarios/`
- `docs/`

## Package Responsibilities

### `packages/shared`

Shared utilities.

Contains:

- money helpers
- IDs
- hashing
- result wrappers
- canonical serialization

Important rule:

- All money uses integer pence.

### `packages/domain`

Core case model.

Contains:

- case entities
- AP ledger
- state machines
- assumptions
- unsupported cases
- events
- decisions

### `packages/rules-engine`

Generic policy engine runtime.

Contains:

- PolicyRule interfaces
- dependency graph execution
- topological sorting
- trace system
- artifact generation

This package is UC-agnostic.

### `packages/uc-rules`

UC-specific policy implementation.

Contains:

- eligibility rules
- income rules
- housing rules
- capital rules
- award composition

This is where policy logic lives.

### `packages/rates`

Rate-pack lifecycle management.

Contains:

- approved/draft/retired states
- validation
- lookup
- effective-date handling
- checksums

### `packages/legislation`

Structured citations.

Used for:

- audit trails
- trace references
- reports
- rule provenance

### `packages/validation`

API DTO validation.

Uses Zod for schema enforcement.

## Core Runtime Flow

### Current REV3 Runtime

Frontend
  -> Create Case
  -> Create AP
  -> Submit Events
  -> Build AP Snapshot
  -> Run Rule Graph
  -> Persist Artifact
  -> Render Artifact

### Assessment Period Lifecycle

1. Create Case

Creates:

- case entity
- first AP
- initial snapshot
- access token

2. Add Events

Events are appended.

Examples:

- `employment_income_received`
- `capital_asset_added`
- `housing_changed`
- `fit_note_uploaded`

3. Reduce AP

Reducer: `reduceCaseForAssessmentPeriod()` creates deterministic AP state.

Reducer responsibilities:

- effective-date filtering
- event ordering
- AP income aggregation
- AP capital state
- source-event tracking
- reduction hashing

4. Build Snapshot

Creates immutable AP snapshot containing:

- normalized state
- input hash
- rule version
- rate version
- reduction metadata

5. Execute Rule Graph

Rules execute in dependency order.

Rules may emit:

- derived artifacts
- assumptions
- unsupported cases
- traces

6. Create Calculation Artifact

Artifact contains:

- AP ID
- hashes
- rule pack version
- rate pack version
- output hash
- final award
- status

Statuses:

- determined
- partial
- unsupported
- failed

### Derived Artifacts

Derived artifacts are persisted policy decisions.

Examples:

- `eligibility_decision`
- `income_aggregation`
- `housing_determination`
- `capital_assessment`
- `work_allowance_determination`
- `award_composition`

Purpose:

- replayability
- auditability
- debugging
- historical reconstruction

### Assumptions

Assumptions are explicit.

Example:

- LHA not supplied.
- Default BRMA estimate used.

Assumptions are persisted and visible. They are never silent.

### Unsupported Cases

Unsupported cases intentionally block unsafe estimates.

Example:

- specified supported accommodation

Result status becomes `unsupported` instead of generating unreliable awards.

### State Machines

Current implemented state machines:

- claim lifecycle
- WCA lifecycle
- evidence lifecycle

Planned:

- sanctions lifecycle
- TP lifecycle
- housing verification lifecycle
- self-employment lifecycle

Invalid transitions throw runtime errors.

### Current REV3 Rule Flow

- unsupported-case screen
  -> eligibility
  -> housing
  -> income aggregation
  -> work allowance
  -> capital assessment
  -> award composition

## Persistence Model

### Main Tables

- `cases_v2`
- `case_events_v2`
- `case_snapshots_v2`
- `assessment_periods_v2`
- `assessment_period_snapshots_v2`
- `calculation_artifacts_v2`
- `calculation_traces_v2`
- `derived_artifacts_v2`
- `assumptions_v2`
- `unsupported_cases_v2`
- `rate_packs_v2`
- `rule_packs_v2`
- `audit_log_v2`
- `access_tokens_v2`
- `idempotency_keys_v2`

## Security Model

Current:

- access tokens
- hashed token storage
- token expiry
- idempotency groundwork

Planned:

- middleware enforcement
- rate limiting
- signed reports
- retention workflows
- PII-safe logs
- encrypted/local-storage removal

## Frontend Strategy

The frontend must eventually become an artifact renderer only.

The frontend must NEVER:

- calculate UC
- select rates
- determine eligibility
- perform award composition

All policy logic belongs in `packages/uc-rules`.

## Reporting Strategy

Planned report outputs:

- claimant summary
- adviser summary
- audit report
- machine-readable export

Reports must include:

- assumptions
- unsupported cases
- legislative references
- rule versions
- rate versions
- trace appendix

## Testing Strategy

Current tests:

- unit tests
- integration tests
- rule graph tests
- state machine tests
- AP snapshot tests
- unsupported-case tests

Planned golden scenarios:

Production correctness depends on independently reviewed scenarios.

Examples:

- fluctuating earnings
- payroll movement
- surplus earnings
- TP erosion
- supported accommodation
- MIF transitions
- benefit cap
- sanctions
- revisions/supersessions

## Known Production Blockers

Still missing:

- full eligibility depth
- benefit cap
- TP engine
- full housing engine
- full MIF lifecycle
- sanctions lifecycle
- approved rate packs
- full report generation
- frontend prototype removal
- golden scenario verification

## Current Runtime Verification

- `npm run typecheck` PASS
- `npm test` PASS
- `npm run build` PASS

## REV4 Direction

REV4 focuses on:

- real 2026/2027 rates
- policy depth
- benefit cap
- sanctions
- TP erosion
- housing depth
- MIF lifecycle
- AP earnings correctness
- payroll-date handling
- surplus earnings
- frontend migration completion
- production security hardening

## Important Engineering Rules

- Never mutate historical artifacts — always append.
- Never silently estimate unsupported states — block instead.
- Never put policy logic in React — frontend renders only.
- Never use floating-point money — use integer pence only.
- Never recompute historical results using new rules by accident.

All artifacts must carry:

- rule version
- rate version
- hashes
- timestamps

## Long-Term Goal

The final system should become an auditable, deterministic, AP-driven Universal Credit policy platform capable of:

- replaying historical decisions
- generating explainable calculations
- handling revisions and supersessions
- supporting audit-grade reports
- safely blocking unsupported claimant states
- surviving annual policy changes without corrupting history
