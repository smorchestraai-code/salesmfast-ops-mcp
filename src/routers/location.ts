/**
 * ghl-location-reader + ghl-location-updater routers (slice 5).
 *
 * 14 ops total: 11 read (search, get, list-tags, get-tag, search-tasks,
 * list/get custom-fields, list/get custom-values, list-templates,
 * list-timezones) + 3 write (create-tag, update-tag, delete-tag).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const LOCATION_READER_DESCRIPTION =
  "Read-only access to GoHighLevel location-level data: locations, tags, tasks, custom fields and values, templates, timezones. " +
  "Operations: `search`, `get`, `list-tags`, `get-tag`, `search-tasks`, `list-custom-fields`, `get-custom-field`, " +
  "`list-custom-values`, `get-custom-value`, `list-templates`, `list-timezones`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-location-reader", operation: "<name>" } }` for the full schema.';

const LOCATION_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel location-level data: tag CRUD only in Phase 1 (custom fields/values/templates managed elsewhere). " +
  "Operations: `create-tag`, `update-tag`, `delete-tag`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-location-updater", operation: "<name>" } }` for the full schema.';

export function createLocationReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-location-reader",
    description: LOCATION_READER_DESCRIPTION,
    category: "location",
    ops: operations.location.reader,
    deniedOps,
    dispatch: (op, params) => upstream.locationTools.executeTool(op, params),
  });
}

export function createLocationUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-location-updater",
    description: LOCATION_UPDATER_DESCRIPTION,
    category: "location",
    ops: operations.location.updater,
    deniedOps,
    dispatch: (op, params) => upstream.locationTools.executeTool(op, params),
  });
}
