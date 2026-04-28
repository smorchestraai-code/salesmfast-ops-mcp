/**
 * ghl-custom-field-v2-reader + ghl-custom-field-v2-updater routers (slice 10).
 * `CustomFieldV2Tools.executeCustomFieldV2Tool` (quirk).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";
import { invalidParams } from "../errors.js";

/**
 * v1.1.1 — pre-block contact/opportunity objectKey on the v2 endpoint.
 * The upstream rejects with a cryptic 400 ("Api does not support objectKey of
 * type contact or opportunity"). Surface a useful redirect instead: contact
 * custom fields live on the v1 endpoint (ghl-location-reader.list-custom-fields).
 */
function v2ObjectKeyPreValidate(
  operation: string,
  params: Record<string, unknown>,
): void {
  // Only applies to ops where objectKey is a top-level param.
  if (!("objectKey" in params)) return;
  const key = String(params.objectKey ?? "")
    .trim()
    .toLowerCase();
  if (key === "contact" || key === "opportunity") {
    throw invalidParams(
      `objectKey "${key}" is not supported by the custom-field-v2 API. ` +
        `For contact custom fields use ghl-location-reader.list-custom-fields (v1 endpoint). ` +
        `For opportunity custom fields use ghl-opportunities-reader.search and read the customFields array on each opportunity. ` +
        `For USER_DEFINED custom objects (e.g. webinars) use the prefixed key like "custom_objects.webinars" — list available keys via ghl-object-reader.list.`,
      "/selectSchema/params/objectKey",
    );
  }
}

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
    preValidate: v2ObjectKeyPreValidate,
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
    preValidate: v2ObjectKeyPreValidate,
  });
}
