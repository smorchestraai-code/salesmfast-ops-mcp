/**
 * ghl-location-reader + ghl-location-updater routers (slice 5).
 *
 * Read ops (post-v1.1.1): get, list-tags, get-tag, search-tasks,
 * list/get custom-fields, list/get custom-values, list-templates,
 * list-timezones. (search is registered in the manifest but pre-blocked
 * at the router as agency-only — PITs are location-scoped.)
 * Write ops: create-tag, update-tag, delete-tag, custom-field/value CRUD.
 *
 * v1.1.1 auto-inject: locationId auto-fills from GHL_LOCATION_ID.
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";
import type { ParsedEnv } from "../env.js";

const LOCATION_READER_DESCRIPTION =
  "Read-only access to GoHighLevel location-level data: tags, tasks, custom fields and values, templates, timezones. " +
  "Operations: `get`, `list-tags`, `get-tag`, `search-tasks`, `list-custom-fields`, `get-custom-field`, " +
  "`list-custom-values`, `get-custom-value`, `list-templates`, `list-timezones`. " +
  "v1.1.1: `locationId` is auto-injected from `GHL_LOCATION_ID` env — omit it from params unless overriding. " +
  "Note: `search` is agency-only and intentionally pre-blocked under PIT auth (use `get` for the configured location instead). " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-location-reader", operation: "<name>" } }` for the full schema.';

const LOCATION_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel location-level data: tag CRUD + custom-field/value CRUD + template ops. " +
  "Operations include `create-tag`, `update-tag`, `delete-tag`, plus custom-field and custom-value writes. " +
  "v1.1.1: `locationId` is auto-injected from `GHL_LOCATION_ID` env — omit it from params unless overriding. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-location-updater", operation: "<name>" } }` for the full schema.';

export function createLocationReader(
  upstream: Upstream,
  deniedOps: readonly string[],
  env: ParsedEnv,
): RouterDef {
  return createCategoryRouter({
    name: "ghl-location-reader",
    description: LOCATION_READER_DESCRIPTION,
    category: "location",
    ops: operations.location.reader,
    deniedOps,
    dispatch: (op, params) => upstream.locationTools.executeTool(op, params),
    // v1.1.1: auto-inject locationId from env when caller omits it.
    contextDefaults: { locationId: () => env.locationId },
    // v1.1.1: location.search hits /locations/search which is agency-only.
    // PITs are location-scoped — pre-block with clear error rather than 403.
    agencyOnlyOps: ["search"],
  });
}

export function createLocationUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
  env: ParsedEnv,
): RouterDef {
  return createCategoryRouter({
    name: "ghl-location-updater",
    description: LOCATION_UPDATER_DESCRIPTION,
    category: "location",
    ops: operations.location.updater,
    deniedOps,
    dispatch: (op, params) => upstream.locationTools.executeTool(op, params),
    contextDefaults: { locationId: () => env.locationId },
    // v1.1.2: location create/update/delete (sub-account CRUD) require an
    // agency OAuth token (need `companyId`). Pre-block under PIT auth.
    agencyOnlyOps: ["create", "update", "delete"],
  });
}
