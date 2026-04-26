# Phase 1 status

Living tracker for the 10 BRD stories. Updated each slice. Closes BRD §11 DoD item 7.

**Legend:** ✅ done · 🟡 partial · ⬜ not started · ➖ deferred to Phase 2

## Ship gates

Locked in `.smorch/project.json`:

| Gate | Value | Notes |
|---|---|---|
| Composite minimum | **95** / 100 | Raised from 92 by CEO directive 2026-04-26 (see L-SMO-008). |
| Hat floor | 8.5 / 10 | No individual hat may dip below this. |
| Security floor | 9.0 / 10 | Engineering Q6 + Architecture Q3 are non-negotiable. |
| BRD AC-test traceability | ≥ 90% | Each in-scope AC has a matching test or assertion. |

Each slice commit message includes the 5-hat composite. Phase 1 average across slices 1–6: **9.78 / 10** (range 9.6–10.0; floor 9.6 on slice 5 due to documented PIT-scope gap).

## Stories

| # | Story | Status | Notes |
|---|---|---|---|
| 1 | Surface fits under host cap | ✅ | AC-1.1 ✅ (13 tools = 12 routers + help). AC-1.2 ✅ (env-filter probe). AC-1.3 ✅. |
| 2 | Every upstream operation reachable | ✅ | AC-2.1 ✅ (77+3 ops in manifest). AC-2.2 ✅ (full mapping). AC-2.3 ✅ (every router dispatches verbatim). |
| 3 | Discovery via help tool | ✅ | AC-3.1 ✅ (6 categories). AC-3.2 ✅ (list-operations per category). AC-3.3 ✅. AC-3.4 ✅ (description ≥ 600 chars listing every active router). |
| 4 | Discriminated-union schemas | ✅ | AC-4.1 / AC-4.2 / AC-4.3 covered for every router via shared `factory.ts`. |
| 5 | Env-var category and operation gating | ✅ | AC-5.1 / AC-5.3 / AC-5.4 ✅. AC-5.2 (deny by op name) — code path implemented; per-slice probe still uses calendars as representative. |
| 6 | Probe test passes | ✅ | AC-6.1 / AC-6.2 / AC-6.3 ✅. AC-6.4 (write-path probe) ➖ Phase 1.5. |
| 7 | Drop-in replacement | ✅ | AC-7.1 / AC-7.2 ✅. AC-7.3 ✅ verified live host smoke-test 2026-04-26 (slice 1) — calendar groups returned through Cowork. |
| 8 | Error transparency | ✅ | AC-8.1 / AC-8.2 / AC-8.3 covered for every router via shared `factory.ts` + `errors.ts`. AC-8.2 stress-tested by location's 4xx upstream response (clean envelope confirmed). |
| 9 | TypeScript strict, zero compile errors | ✅ | AC-9.1 / AC-9.2 / AC-9.3 ✅. tsconfig split: `tsconfig.json` (build) + `tsconfig.scripts.json` (lint scripts). |
| 10 | Documentation | ✅ | AC-10.1 ✅ (README). AC-10.2 ✅ (operation-mapping.md auto-gen via `prebuild`). AC-10.3 ✅ (CLAUDE.md decisions log, 11+ entries). |

**Phase 1 closed 2026-04-26.** All 10 stories ✅ except for AC-6.4 (write-path probe) which was deferred to Phase 1.5 in the original BRD §13.

## Slices

| Slice | Category | Routers | Ops | Composite | PR | Tag | Date |
|---|---|---|---|---|---|---|---|
| 1 | calendars (reader) | 1 | 6 | 9.9 | [#1](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/1) | v0.1.0-vertical-slice | 2026-04-26 |
| 2 | contacts (R+U) + factory + data-driven probe | 2 | 27 | 9.8 | _#2_ | _v0.2.0-phase-1_ | 2026-04-26 |
| 3 | conversations (R+U) | 2 | 15 | 9.8 | _#2_ | _v0.2.0-phase-1_ | 2026-04-26 |
| 4 | opportunities (R+U) | 2 | 8 | 9.8 | _#2_ | _v0.2.0-phase-1_ | 2026-04-26 |
| 5 | location (R+U) | 2 | 14 | 9.6 | _#2_ | _v0.2.0-phase-1_ | 2026-04-26 |
| 6 | workflow (R) + calendars-updater cleanup | 2 | 7 | 10.0 | _#2_ | _v0.2.0-phase-1_ | 2026-04-26 |

**Totals:** 12 routers (5 read-only + 5 read-write categories + workflow read-only) + 1 help = **13 facade tools** vs upstream's ~280. Cap thesis fully proven.

## DoD (BRD §11)

| # | Item | Status |
|---|---|---|
| 1 | `npm run build` exit 0, no warnings | ✅ |
| 2 | `npm run probe` exit 0, all assertions green | ✅ (10/10) |
| 3 | `git status` clean | ✅ |
| 4 | README.md + CLAUDE.md exist + reflect layout | ✅ |
| 5 | docs/operation-mapping.md auto-generated, checked in | ✅ |
| 6 | Claude Desktop swap verified live | ✅ slice 1 (2026-04-26) |
| 7 | All 10 stories' ACs in STATUS.md | ✅ (this file) |

## Open follow-ups

- **AC-6.4** — write-path probe (create→get→delete on a contact). Opt-in per BRD §13. Phase 1.5.
- **L-SMO-009** — re-enable location live-read assertion when a higher-scoped PIT is provisioned (current dev PIT lacks `locations.readonly`).
- **Skill update** — `smorch-gtm-tools:ghl-operator` SKILL.md needs to switch from upstream `ghl-mcp` tool names to the new `ghl-{category}-{reader|updater}` router shape. Phase 2.
- **Upstream `ghl-mcp` deprecation in `claude_desktop_config.json`** — already done for Mamoun's machine; document in README for other operators.
