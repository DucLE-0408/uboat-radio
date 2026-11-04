# Architecture

Replace every placeholder before implementation. Keep this topology current; link detailed decisions to ADRs.

```text
Client/UI
  → CDN/LB/API gateway
  → API route/authn/authz/validation
  → service/domain transaction
  → DB/cache/queue/object storage/external API
  → structured logs + metrics + traces + audit events
```

## Components and ownership

| Component | Runtime/port | Owner | Data | Dependencies | Health/readiness | SLO/runbook |
|---|---|---|---|---|---|---|

## Trust and network boundaries

Document public/private listeners, TLS termination and trust, DNS/service discovery, ingress/egress, firewall/ACL, proxy behavior, CORS/CSRF, SSRF controls, rate/resource limits, and admin/metrics exposure.

## Identity and authorization flow

Document identity provider, sessions/JWT, issuer/audience/expiry, server-side RBAC/ABAC, tenant/object ownership, service identities, least privilege, and audit events.

## Data and consistency

Document schema ownership, transactions, duplicate delivery/order, cache invalidation, retention/deletion, encryption, backups/restores, migration compatibility, and disaster recovery.

## Failure and operations model

Document timeouts, cancellation, retry/idempotency, circuit breaking, backpressure, partial failure, graceful shutdown/draining, signals, alerts, capacity, rollout, and rollback triggers.

## U-Boat Radio Operator: simulation core (`packages/sim-core`)

Headless, deterministic TypeScript core (no DOM/engine). One seeded PRNG (`rng.ts`, mulberry32 + FNV-1a, `derive(seed, ...path)` for independent streams). Modules: `enigma` (M4), `morse` (element-level noisy channel + `Fist`), `messages` (genuine traffic and forgeries with verifiable tells), `auth` (Latin squares, challenge ledger, keybook), `intel` (Allied Intel ladder 0-4), `detection` (HF/DF), `events` (Event Bus; the only coupling to presentation/network). Tunables live in `data/balance.json`. Save/load is seed + event log, not snapshots. Presentation (P4+) subscribes to the Event Bus only.
