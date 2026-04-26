/**
 * ghl-association-reader + ghl-association-updater routers (slice 10).
 * `AssociationTools.executeAssociationTool` (quirk).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const READER_DESCRIPTION =
  "Read-only access to GoHighLevel custom-object associations + relations. " +
  "Operations: `list`, `get-by-id`, `get-by-key`, `get-by-object-key`, `get-relations-by-record`. " +
  "Idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-association-reader", operation: "<name>" } }` for the full schema.';

const UPDATER_DESCRIPTION =
  "Write access to GoHighLevel custom-object associations + relations: association CRUD + relation create/delete. " +
  "Operations: `create-association`, `update-association`, `delete-association`, `create-relation`, `delete-relation`. " +
  "All operations mutate state — gate behind explicit confirmation. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-association-updater", operation: "<name>" } }` for the full schema.';

export function createAssociationReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-association-reader",
    description: READER_DESCRIPTION,
    category: "association",
    ops: operations.association.reader,
    deniedOps,
    dispatch: (op, params) =>
      upstream.associationTools.executeAssociationTool(op, params),
  });
}

export function createAssociationUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-association-updater",
    description: UPDATER_DESCRIPTION,
    category: "association",
    ops: operations.association.updater,
    deniedOps,
    dispatch: (op, params) =>
      upstream.associationTools.executeAssociationTool(op, params),
  });
}
