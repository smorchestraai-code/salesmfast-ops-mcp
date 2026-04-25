# Operation mapping

Auto-generated from `src/operations.ts` by `scripts/gen-mapping-doc.ts`.
Do not edit by hand. Re-run with `npm run docs:mapping` (also runs as
`prebuild` before `tsc`, so the doc cannot drift from the manifest).

Each operation maps to one upstream tool name. The router exposes the
operation as `<router-name>.<operation>` via the `selectSchema` discriminated union.

## calendars

### `ghl-calendars-reader` (6 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list-groups` | `get_calendar_groups` | List all calendar groups in the location. |
| `list` | `get_calendars` | List calendars, optionally filtered to a group. |
| `get` | `get_calendar` | Get a single calendar by id. |
| `list-events` | `get_calendar_events` | List events for a calendar in a date range. |
| `list-free-slots` | `get_free_slots` | List free slots in a calendar for a date range. |
| `get-appointment` | `get_appointment` | Get a single appointment by id. |

---

## Totals

- Reader operations: **6**
- Updater operations: **0**
- Total: **6**

Phase 1 vertical slice ships only `ghl-calendars-reader`. Other categories register
when their per-category slice lands in a subsequent PR.
