# Data classification

| Class | Examples | Storage/transit | Access/audit | Logging | Retention/deletion |
|---|---|---|---|---|---|
| Public | Published docs | Integrity protected | Normal | Allowed | Product policy |
| Internal | Architecture/operations | Encrypted | Workforce least privilege | Sanitized | Defined owner |
| Confidential | Business/customer data | Encrypted | Explicit role/tenant, audited | Redacted | Contract/policy |
| Restricted | Credentials/high-risk PII | Managed secret/KMS | Minimum privilege, audited | Never | Minimal, verified purge |

Derived projects must classify every persisted field/event before production use.
