---
schema_version: 1
id: task-2026-11-04-p5-art-pass-reference
status: blocked
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T07:24:16.0583132Z
started_at: 2026-11-04T07:24:16.0583132Z
updated_at: 2026-11-04T07:50:00.0000000Z
base_commit: 183d6ac44b81afde77d590c57a88817d4ad6b748
owned_paths:
  - packages/radio-ui/tools/art
  - packages/radio-ui/assets/sprites
  - packages/radio-ui/assets/manifest.json
  - packages/radio-ui/src/scene
  - packages/radio-ui/test/assets.test.ts
  - docs/specs/p5-radio-room-presentation
  - memory/tasks/active/2026-11-04-p5-art-pass-reference.md
plan: null
handoff: null
---

# Task: p5-art-pass-reference

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: detailed art-pass request with process steps 1-6 and acceptance list
- Outcome and acceptance criteria: Rework P5 radio-room art/UI toward the user's reference screenshot (texture, portrait, submarine, machine, paper) without touching gameplay/sim; deliver a reviewable visual slice first
- In scope / out of scope: in = tools/art generator, sprites + manifest, scene CSS tokens, sprite-coupled positions in scene/machine.ts and scene/boat.ts, waveform colours in scene/receiver.ts, spec tasks + evidence. Out = sim-core, store/controller/session/loop/audio, PWA icons, new dependencies, new animation.
- Material assumptions and risks: no image-generation or PixelLab tool in this session, so all art is code-drawn and stays TEMPORARY; aesthetic match to the reference is judged by the user, not claimed.

## Architecture linkage

Presentation only: tools/art (Node, deterministic) -> assets/sprites + manifest -> scene/* paint() backgrounds. No change to Watch.dispatch, EventBus, store or save/replay paths.

## Progress and decisions

- Synced main from origin (fast-forward 3dc0081..183d6ac, clean tree before).
- Audit: uniform noise from wear()/dither()/vgrad() over every surface; glasses filled as white discs; boat = rectangle with 7 identical bays; purple 9-slice buttons.
- New palette tools/art/tone.ts; P palette kept for PWA icons (icons unchanged). New helpers in pix.ts (stamp, shade, tint, rrect, outline).
- New portrait.ts, boat.ts, machine.ts; sprites.ts/sprites2.ts rewired; scene CSS tokens de-purpled; machine window/nameplate/status positions and prop position follow the new art.
- Bug found and fixed in review: flow-layout indicator windows became dark-on-dark; given a cream background.
- Slice approved by the operator ("Approve, keep polishing"). Polish: desktop drawer header strip, summary card header, tablet banner crop shows the whole tower; reduced-motion checked via CDP emulation (no animation names on .bob/.prop/.sgrp/.scene).

## Verification

- Command/check: npx vitest run (radio-ui); npx tsc --noEmit; npm run build; npx vitest run (sim-core); git diff --stat packages/sim-core; git grep truthOf packages/radio-ui/src
- Result: passed (108/108, tsc 0, build 0, 70/70, sim-core diff empty, 0 truthOf matches)
- Evidence/reason: docs/specs/p5-radio-room-presentation/evidence/artpass-*.png

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless Edge over CDP against vite dev: normal (1920), typing a copy (1280), accept forged order -> ASDIC -> BRIDGE ALERT (1280), tablet 1024, mobile 390 keys tab, mobile 320.
- Health/readiness/log/error inspection: console had only vite connect debug lines; no errors.
- Integration/dependency/config/migration check: no dependency change; manifest regenerated, asset test passes.
- Remaining issue or reason not verified: aesthetic fidelity vs reference (user judgement); Firefox/Safari; real touch device; real reduced-motion preference on an OS (checked only through CDP emulation).

## Security, observability, risk, and rollback

- Security impact: none (static art, no new inputs; text still via textContent).
- Observability impact: none.
- Residual risk: art remains TEMPORARY placeholder quality; tablet banner crop hides the tower top (pre-existing crop).
- Rollback: git checkout -- packages/radio-ui and delete the four new tools/art files, then node tools/art/generate.ts.
- Next safe action: user reviews the slice; on approval continue polish (drawers, summary, extra frames) or accept; commit only when authorised.
