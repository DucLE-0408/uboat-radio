# Sanitized diagnostic log

Raw logs are ignored because they can contain PII, tokens, paths, and operational noise. Commit only concise, sanitized evidence that supports a decision, incident, or reproducible defect. Use [the incident template](incident-template.md).

- Redact at collection/export, then review before commit.
- Record source, time range, correlation ID when safe, retention owner, and deletion date.
- Prefer hashes/counts/short excerpts over full payloads.
- Never store access tokens, authorization headers, cookies, request bodies, customer identifiers, internal keys, or raw dumps.
