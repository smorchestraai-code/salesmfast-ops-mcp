/**
 * ghl-opportunities-reader + ghl-opportunities-updater routers (slice 4).
 *
 * 8 ops total: 3 read (search, get, list-pipelines) + 5 write
 * (create, update, update-status, upsert, delete).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const OPPORTUNITIES_READER_DESCRIPTION =
  "Read-only access to GoHighLevel opportunities and pipelines. " +
  "Operations: `search`, `get`, `list-pipelines`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-opportunities-reader", operation: "<name>" } }` for the full schema.';

const OPPORTUNITIES_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel opportunities: create, update, update-status (open/won/lost/abandoned), " +
  "upsert, delete. " +
  "Operations: `create`, `update`, `update-status`, `upsert`, `delete`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-opportunities-updater", operation: "<name>" } }` for the full schema.';

export function createOpportunitiesReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-opportunities-reader",
    description: OPPORTUNITIES_READER_DESCRIPTION,
    category: "opportunities",
    ops: operations.opportunities.reader,
    deniedOps,
    dispatch: (op, params) => upstream.opportunityTools.executeTool(op, params),
  });
}

export function createOpportunitiesUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-opportunities-updater",
    description: OPPORTUNITIES_UPDATER_DESCRIPTION,
    category: "opportunities",
    ops: operations.opportunities.updater,
    deniedOps,
    dispatch: (op, params) => upstream.opportunityTools.executeTool(op, params),
  });
}
