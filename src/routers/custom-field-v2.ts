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
 * v1.1.1 / v1.1.2 — pre-block invalid objectKey values on the v2 endpoint.
 *
 * The upstream rejects SYSTEM_DEFINED keys with a cryptic 400 ("Api does
 * not support objectKey of type contact or opportunity"). v1.1.2 widens
 * the catch from {contact, opportunity} to an allowlist: only
 * `custom_objects.*` keys are accepted by the v2 API. This catches the
 * Company schema (`business`) and any other future SYSTEM_DEFINED key
 * before they hit the upstream and return cryptic 400s.
 *
 * Surface a useful redirect: contact custom fields live on the v1
 * endpoint (ghl-location-reader.list-custom-fields); opportunity
 * customFields ship inline on each opportunity record.
 */
function v2ObjectKeyPreValidate(
  operation: string,
  params: Record<string, unknown>,
): void {
  // Only applies to ops where objectKey is a top-level string param.
  if (!("objectKey" in params)) return;
  const raw = params.objectKey;
  if (typeof raw !== "string") return; // ajv catches type mismatch upstream
  const key = raw.trim();
  if (key === "") return; // ajv catches required-but-empty
  // Accept anything in the custom_objects.* namespace (the only valid
  // input shape per upstream docs at custom-field-v2-tools.ts).
  if (key.startsWith("custom_objects.")) return;
  // Otherwise: SYSTEM_DEFINED or malformed — pre-block with redirect.
  const lc = key.toLowerCase();
  const redirect =
    lc === "contact"
      ? "For contact custom fields use ghl-location-reader.list-custom-fields (v1 endpoint)."
      : lc === "opportunity"
        ? "For opportunity custom fields use ghl-opportunities-reader.search and read the customFields array on each opportunity."
        : lc === "business"
          ? "The Company schema's key 'business' is SYSTEM_DEFINED and not supported here. For Company custom fields use ghl-object-reader.get-record / search-records."
          : `Key "${key}" is not in the custom_objects.* namespace (likely SYSTEM_DEFINED).`;
  throw invalidParams(
    `objectKey "${key}" is not supported by the custom-field-v2 API. ` +
      redirect +
      ` For USER_DEFINED custom objects (e.g. webinars) use the prefixed key like "custom_objects.webinars" — list available keys via ghl-object-reader.list.`,
    "/selectSchema/params/objectKey",
  );
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
