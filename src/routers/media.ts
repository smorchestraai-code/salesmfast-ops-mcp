/**
 * ghl-media-reader + ghl-media-updater routers (slice 9).
 *
 * 3 ops: 1 read (get-files) + 2 write (upload-file, delete-file).
 * `MediaTools.executeTool` (standard).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const MEDIA_READER_DESCRIPTION =
  "Read-only access to GoHighLevel media library files. " +
  "Operations: `get-files`. " +
  "Idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-media-reader", operation: "<name>" } }` for the full schema.';

const MEDIA_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel media library: upload + delete files. " +
  "Operations: `upload-file`, `delete-file`. " +
  "Both mutate state — gate behind explicit confirmation. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-media-updater", operation: "<name>" } }` for the full schema.';

export function createMediaReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-media-reader",
    description: MEDIA_READER_DESCRIPTION,
    category: "media",
    ops: operations.media.reader,
    deniedOps,
    dispatch: (op, params) => upstream.mediaTools.executeTool(op, params),
  });
}

export function createMediaUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-media-updater",
    description: MEDIA_UPDATER_DESCRIPTION,
    category: "media",
    ops: operations.media.updater,
    deniedOps,
    dispatch: (op, params) => upstream.mediaTools.executeTool(op, params),
  });
}
