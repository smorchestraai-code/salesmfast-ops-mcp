/**
 * ghl-calendars-reader router — Phase 1 vertical slice headline router.
 *
 * Description verbatim from plan §Verbatim strings; if it drifts, the help
 * tool's manifest (which references router names) and the probe's assertion
 * 6 (stderr boot-log line) can fall out of sync.
 *
 * Logic lives in routers/factory.ts. This file is config + description.
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
