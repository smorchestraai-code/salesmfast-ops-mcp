/**
 * ghl-calendars-reader + ghl-calendars-updater routers.
 *
 * Reader: 6 ops (Phase 1 slice 1 headline). Updater: 6 ops (slice 6 cleanup —
 * completes the calendars category to match BRD section 7.3 fully).
 *
 * Descriptions verbatim — if they drift, help tool + probe stderr-grep fall
 * out of sync. Logic lives in routers/factory.ts.
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const CALENDARS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel calendars (groups, calendars, events, free slots, appointments). " +
  "Operations: `list-groups`, `list`, `get`, `list-events`, `list-free-slots`, `get-appointment`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-calendars-reader", operation: "<name>" } }` for the full schema.';

const CALENDARS_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel calendars: create / update / delete calendars; create / update / delete appointments. " +
  "Operations: `create`, `update`, `delete`, `create-appointment`, `update-appointment`, `delete-appointment`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-calendars-updater", operation: "<name>" } }` for the full schema.';

export function createCalendarsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-calendars-reader",
    description: CALENDARS_READER_DESCRIPTION,
    category: "calendars",
    ops: operations.calendars.reader,
    deniedOps,
    dispatch: (op, params) => upstream.calendarTools.executeTool(op, params),
  });
}

export function createCalendarsUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-calendars-updater",
    description: CALENDARS_UPDATER_DESCRIPTION,
    category: "calendars",
    ops: operations.calendars.updater,
    deniedOps,
    dispatch: (op, params) => upstream.calendarTools.executeTool(op, params),
  });
}
