/**
 * ghl-custom-field-v2-reader + ghl-custom-field-v2-updater routers (slice 10).
 * `CustomFieldV2Tools.executeCustomFieldV2Tool` (quirk).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const READER_DESCRIPTION =
  "Read-only access to GoHighLevel custom-field v2 API: get a field by id or list fields by object key. " +
  "Operations: `get-by-id`, `get-by-object-key`. " +
  "Idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-custom-field-v2-reader", operation: "<name>" } }` for the full schema.';

const UPDATER_DESCRIPTION =
  "Write access to GoHighLevel custom-field v2: field CRUD + folder CRUD. " +
  "Operations: `create-field`, `update-field`, `delete-field`, `create-folder`, `update-folder`, `delete-folder`. " +
  "All operations mutate state — gate behind explicit confirmation. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-custom-field-v2-updater", operation: "<name>" } }` for the full schema.';

export function createCustomFieldV2Reader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-custom-field-v2-reader",
    description: READER_DESCRIPTION,
    category: "custom-field-v2",
    ops: operations["custom-field-v2"].reader,
    deniedOps,
    dispatch: (op, params) =>
      upstream.customFieldV2Tools.executeCustomFieldV2Tool(op, params),
  });
}

export function createCustomFieldV2Updater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-custom-field-v2-updater",
    description: UPDATER_DESCRIPTION,
    category: "custom-field-v2",
    ops: operations["custom-field-v2"].updater,
    deniedOps,
    dispatch: (op, params) =>
      upstream.customFieldV2Tools.executeCustomFieldV2Tool(op, params),
  });
}
