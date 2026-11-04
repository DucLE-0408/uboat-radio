# Configuration and environment inventory

Derived projects must replace this template with a typed inventory. Secret values never appear here.

| Name | Type | Required | Default | Secret | Scope | Validation/failure mode |
|---|---|---:|---|---:|---|---|
| `EXAMPLE_SETTING` | string | yes | none | no | service | Fail startup if missing |

Document ports/listeners, DNS/service discovery, proxy/TLS trust, DB/cache/queue pools, feature flags, external APIs, timeouts/retries, resource limits, and environment-specific ownership. Keep `.env.example` value-free or synthetic.
