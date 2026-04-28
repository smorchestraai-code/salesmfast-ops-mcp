/**
 * ghl-products-reader + ghl-products-updater routers (slice 8).
 *
 * 10 ops: 5 read (list, get, list-prices, list-collections, list-inventory)
 * + 5 write (create + update + delete product, create-price, create-collection).
 *
 * `ProductsTools.executeProductsTool` (quirk — not `executeTool`).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";
import type { ParsedEnv } from "../env.js";

const PRODUCTS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel products, prices, collections, and inventory. " +
  "Operations: `list`, `get`, `list-prices`, `list-collections`, `list-inventory`. " +
  "v1.1.1: `locationId` is auto-injected from `GHL_LOCATION_ID` env — omit unless overriding. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-products-reader", operation: "<name>" } }` for the full schema.';

const PRODUCTS_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel products: create / update / delete products, create prices and collections. " +
  "Operations: `create`, `update`, `delete`, `create-price`, `create-collection`. " +
  "v1.1.1: `locationId` is auto-injected from `GHL_LOCATION_ID` env — omit unless overriding. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-products-updater", operation: "<name>" } }` for the full schema.';

export function createProductsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
  env: ParsedEnv,
): RouterDef {
  return createCategoryRouter({
    name: "ghl-products-reader",
    description: PRODUCTS_READER_DESCRIPTION,
    category: "products",
    ops: operations.products.reader,
    deniedOps,
    // Quirk: ProductsTools method is executeProductsTool, not executeTool.
    dispatch: (op, params) =>
      upstream.productsTools.executeProductsTool(op, params),
    // v1.1.1: products uses locationId on every op (some ops also accept
    // altId/altType for cross-context queries; user can override).
    contextDefaults: { locationId: () => env.locationId },
  });
}

export function createProductsUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
  env: ParsedEnv,
): RouterDef {
  return createCategoryRouter({
    name: "ghl-products-updater",
    description: PRODUCTS_UPDATER_DESCRIPTION,
    category: "products",
    ops: operations.products.updater,
    deniedOps,
    dispatch: (op, params) =>
      upstream.productsTools.executeProductsTool(op, params),
    contextDefaults: { locationId: () => env.locationId },
  });
}
