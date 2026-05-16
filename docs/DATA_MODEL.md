# Data Model (Locked Core)

## Canonical Domain Objects

- Entity
- Human
- Organization
- Node
- System
- Resource
- Event
- Signal
- Risk
- Policy
- Decision
- SimulationRun
- EvidenceRecord
- GovernanceAction
- TrustScore
- StressScore
- MissionScore
- Scenario

## Required Objects

## `SystemState`

- `id`
- `system_id`
- `timestamp`
- `trust_index`
- `stress_index`
- `resilience_index`
- `activity_index`
- `risk_level`
- `anomaly_count`

## `RiskSignal`

- `id`
- `entity_id`
- `type`
- `severity`
- `confidence`
- `source`
- `first_seen_at`
- `last_seen_at`
- `linked_events`

## `SimulationRun`

- `id`
- `scenario_name`
- `input_json`
- `result_json`
- `confidence`
- `created_by`
- `created_at`

## `GovernanceAction`

- `id`
- `action_type`
- `requested_by`
- `approved_by`
- `status`
- `linked_simulation_id`
- `rollback_ref`
- `audit_hash`

## Modeling Rules

- event-first data flow
- immutable audit lineage for governance-critical events
- explicit linkage between simulation output and decision/action
- role-scoped visibility and action permissions
- avoid schema drift before model package is versioned
