/**
 * ghl-object-reader + ghl-object-updater routers (slice 10).
 * `ObjectTools.executeTool` (standard).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const READER_DESCRIPTION =
  "Read-only access to GoHighLevel custom objects: schemas + records. " +
  "Operations: `list` (all schemas), `get-schema`, `get-record`, `search-records`. " +
  "Idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-object-reader", operation: "<name>" } }` for the full schema.';

const UPDATER_DESCRIPTION =
  "Write access to GoHighLevel custom objects: schema CRUD + record CRUD. " +
  "Operations: `create-schema`, `update-schema`, `create-record`, `update-record`, `delete-record`. " +
  "All operations mutate state — gate behind explicit confirmation. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-object-updater", operation: "<name>" } }` for the full schema.';

export function createObjectReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-object-reader",
    description: READER_DESCRIPTION,
    category: "object",
    ops: operations.object.reader,
    deniedOps,
    dispatch: (op, params) => upstream.objectTools.executeTool(op, params),
  });
}

export function createObjectUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-object-updater",
    description: UPDATER_DESCRIPTION,
    category: "object",
    ops: operations.object.updater,
    deniedOps,
    dispatch: (op, params) => upstream.objectTools.executeTool(op, params),
  });
}
