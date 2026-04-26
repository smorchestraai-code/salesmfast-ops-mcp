# Phase 1 status

Living tracker for the 10 BRD stories. Updated each slice. Closes BRD §11 DoD item 7.

**Legend:** ✅ done · 🟡 partial · ⬜ not started · ➖ deferred to Phase 2

## Ship gates

Locked in `.smorch/project.json`:

| Gate | Value | Notes |
|---|---|---|
| Composite minimum | **95** / 100 | Raised from 92 by CEO directive 2026-04-26 (see L-SMO-008). Slice 1 shipped at 99 (composite 9.9). |
| Hat floor | 8.5 / 10 | No individual hat may dip below this. |
| Security floor | 9.0 / 10 | Engineering Q6 + Architecture Q3 are non-negotiable. |
| BRD AC-test traceability | ≥ 90% | Each in-scope AC has a matching test or assertion. |

Each slice commit message must include the 5-hat composite. If a slice scores below 95, run `/smo-bridge-gaps`, fix, re-score, then commit.

## Stories

| # | Story | Status | Notes |
|---|---|---|---|
| 1 | Surface fits under host cap | 🟡 | AC-1.3 ✅ (every tool prefixed). AC-1.1 / AC-1.2 (13-tool count) flip to ✅ at slice 6. |
| 2 | Every upstream operation reachable | 🟡 | AC-2.1 / AC-2.2 / AC-2.3 fill in per slice. Calendars-reader covered. |
| 3 | Discovery via help tool | 🟡 | AC-3.1 ✅. AC-3.3 ✅. AC-3.4 ✅. AC-3.2 grows per slice. |
| 4 | Discriminated-union schemas | ✅ | AC-4.1 / AC-4.2 / AC-4.3 covered for calendars-reader; pattern replicates. |
| 5 | Env-var category and operation gating | 🟡 | AC-5.1 / AC-5.3 / AC-5.4 ✅. AC-5.2 (deny by op name) — code path implemented, tested per slice. |
| 6 | Probe test passes | ✅ | AC-6.1 / AC-6.2 / AC-6.3 ✅. AC-6.4 (write-path probe) ➖ Phase 1.5. |
| 7 | Drop-in replacement | ✅ | AC-7.1 / AC-7.2 ✅. AC-7.3 ✅ verified live host smoke-test 2026-04-26 (`mcp__salesmfast-ops__ghl-calendars-reader { "list-groups" }` returned `FKQpu4dGBFauC28DQfSP` + `JV14FPsJByKLVYQWFGDG` from inside Cowork). |
| 8 | Error transparency | ✅ | AC-8.1 / AC-8.2 / AC-8.3 covered for calendars-reader; helpers in `src/errors.ts` reused per slice. |
| 9 | TypeScript strict, zero compile errors | ✅ | AC-9.1 / AC-9.2 / AC-9.3 ✅. tsconfig split: `tsconfig.json` (build, src only) + `tsconfig.scripts.json` (lint scripts). |
| 10 | Documentation | 🟡 | AC-10.1 (full README) — Phase 1 close. AC-10.2 (operation-mapping.md auto-gen) ✅ via `prebuild`. AC-10.3 (CLAUDE.md decisions log) ✅ 11 entries. |

## Slices

| Slice | Category | Routers | Ops | PR | Tag | Date |
|---|---|---|---|---|---|---|
| 1 | calendars | reader | 6 | [#1](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/1) | v0.1.0-vertical-slice | 2026-04-26 |
| 2 | contacts | reader + updater | 9 + 18 | _pending_ | _pending_ | _pending_ |
| 3 | conversations | reader + updater | 6 + 9 | _pending_ | _pending_ | _pending_ |
| 4 | opportunities | reader + updater | 3 + 5 | _pending_ | _pending_ | _pending_ |
| 5 | location | reader + updater | 11 + 3 | _pending_ | _pending_ | _pending_ |
| 6 | workflow | reader | 1 | _pending_ | _pending_ | _pending_ |

**Phase 1 close target tag:** `v0.2.0-phase-1` (lights up all 10 stories ✅).

## DoD (BRD §11)

| # | Item | Status |
|---|---|---|
| 1 | `npm run build` exit 0, no warnings | ✅ |
| 2 | `npm run probe` exit 0, all assertions green | ✅ (6/6 today; grows per slice) |
| 3 | `git status` clean | ✅ |
| 4 | README.md + CLAUDE.md exist + reflect layout | ✅ |
| 5 | docs/operation-mapping.md auto-generated, checked in | ✅ |
| 6 | Claude Desktop swap verified live | ✅ 2026-04-26 |
| 7 | All 10 stories' ACs in STATUS.md | ✅ (this file) |
