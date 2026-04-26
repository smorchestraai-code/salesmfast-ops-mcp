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

**Phase 1 closed 2026-04-26.** All 10 stories ✅. AC-6.4 (write-path probe) closed in Phase 1.5 (`v0.2.1-phase-1.5`).

**Phase 2 closed 2026-04-26.** All 19 upstream tool classes wrapped, 259 ops behind 35 facade tools (`v0.3.4-phase-2`). Slices 7–11 covered: GTM (social + email + survey + invoice) → Revenue (products + payments + store) → Content (blog + media) → Custom Data (custom-field-v2 + objects + associations) → Phase 1 cleanup (48 missing ops in covered classes).

## Slices

| Slice | Category | Routers | Ops | Composite | PR | Tag |
|---|---|---:|---:|---:|---|---|
| 1 | calendars (reader) | 1 | 6 | 9.9 | [#1](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/1) | v0.1.0-vertical-slice |
| 2 | contacts (R+U) + factory + data-driven probe | 2 | 27 | 9.8 | #2 | v0.2.0-phase-1 |
| 3 | conversations (R+U) | 2 | 15 | 9.8 | #2 | v0.2.0-phase-1 |
| 4 | opportunities (R+U) | 2 | 8 | 9.8 | #2 | v0.2.0-phase-1 |
| 5 | location (R+U) | 2 | 14 | 9.6 | #2 | v0.2.0-phase-1 |
| 6 | workflow (R) + calendars-updater cleanup | 2 | 7 | 10.0 | #2 | v0.2.0-phase-1 |
| **Phase 1.5** | write-path probe (AC-6.4) + MIGRATION.md | 0 | 0 | 10.0 | [#3](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/3) | v0.2.1-phase-1.5 |
| 7 | GTM (social + email + survey + invoice) | 7 | 46 | 10.0 | [#4](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/4) | v0.3.0-slice-7-gtm |
| 8 | Revenue (products + payments + store) | 6 | 48 | 9.6 | [#5](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/5) | v0.3.1-slice-8-revenue |
| 9 | Content (blog + media) | 4 | 10 | 9.5 | [#6](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/6) | v0.3.2-slice-9-content |
| 10 | Custom Data (custom-field-v2 + object + association) | 6 | 27 | 9.5 | [#7](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/7) | v0.3.3-slice-10-custom-data |
| 11 | Phase 1 cleanup (calendars + contacts + conversations + location + opportunities) | 0 | 48 | 9.5 | [#8](https://github.com/smorchestraai-code/salesmfast-ops-mcp/pull/8) | v0.3.4-phase-2 |

**Totals (Phase 2 close):** 34 routers + 1 help = **35 facade tools** vs upstream's 256 case-statement ops. **259 ops behind facade. 19/19 upstream classes wrapped.** Cap thesis fully proven (~7.3× collapse, well under 128 host cap). Composite avg across 12 PRs: **9.7 / 10**.

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

## Open follow-ups (post handover)

- ✅ **L-SMO-009 PIT-scope re-enables** — DONE 2026-04-26 (handover). Full-scope PIT in `.env` unlocked location / payments / media / blog / custom-field-v2 live-reads. Probe is now **22/22 GREEN with all 18 categories live-verified** (`v1.0.0-handover-ready`).
- **Skill propagation** — smorch-brain PR #13 (ghl-operator SKILL.md migration to facade) is OPEN awaiting review per branch protection on the canonical brain repo. Slice 7-11 router additions (28 new tools) need a follow-up SKILL.md amendment after PR #13 merges.
- **`locationId` / `altId` UX wart** — operators must pass these explicitly to location + payments ops (upstream doesn't auto-inject). Documented in `docs/MIGRATION.md` "Param-passing quirk" section. Phase 2.5 cleanup: factory-level `paramInjections` to auto-merge.
- **Manifest size** — `src/operations.ts` is now ~2200 lines. Phase 2.5 cleanup: split per-category files under `src/operations/<category>.ts` with a barrel export.
- **Op-level live-reads for write paths** — Phase 1.5 covered AC-6.4 on contacts (create→get→delete). Other write paths (send-sms, create-invoice, create-social-post, etc.) are router-only verified. Per-client opt-in probes recommended.
