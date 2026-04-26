/**
 * ghl-store-reader + ghl-store-updater routers (slice 8).
 *
 * 18 ops, all about shipping config: 8 read (zones, rates, carriers,
 * available-rates, store-setting) + 10 write (zone/rate/carrier CRUD,
 * store-setting create).
 *
 * `StoreTools.executeStoreTool` (quirk — not `executeTool`).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const STORE_READER_DESCRIPTION =
  "Read-only access to GoHighLevel store / shipping config: zones, rates, carriers, available-rates, store settings. " +
  "Operations: `list-shipping-zones`, `get-shipping-zone`, `list-shipping-rates`, `get-shipping-rate`, `list-shipping-carriers`, `get-shipping-carrier`, `get-available-rates`, `get-store-setting`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-store-reader", operation: "<name>" } }` for the full schema.';

const STORE_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel store / shipping: zone, rate, and carrier CRUD + store-setting create. " +
  "Operations: `create-shipping-zone`, `update-shipping-zone`, `delete-shipping-zone`, `create-shipping-rate`, `update-shipping-rate`, `delete-shipping-rate`, `create-shipping-carrier`, `update-shipping-carrier`, `delete-shipping-carrier`, `create-store-setting`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-store-updater", operation: "<name>" } }` for the full schema.';

export function createStoreReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-store-reader",
    description: STORE_READER_DESCRIPTION,
    category: "store",
    ops: operations.store.reader,
    deniedOps,
    // Quirk: StoreTools method is executeStoreTool, not executeTool.
    dispatch: (op, params) => upstream.storeTools.executeStoreTool(op, params),
  });
}

export function createStoreUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-store-updater",
    description: STORE_UPDATER_DESCRIPTION,
    category: "store",
    ops: operations.store.updater,
    deniedOps,
    dispatch: (op, params) => upstream.storeTools.executeStoreTool(op, params),
  });
}
