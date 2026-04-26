/**
 * ghl-payments-reader + ghl-payments-updater routers (slice 8).
 *
 * 20 ops: 11 read (orders, fulfillments, subscriptions, transactions,
 * coupons, custom-provider config, whitelabel providers) + 9 write
 * (coupon CRUD, custom-provider config + integration mgmt, fulfillment
 * create, whitelabel create).
 *
 * `PaymentsTools.handleToolCall` (quirk — not `executeTool`).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const PAYMENTS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel payments: orders, subscriptions, transactions, coupons, fulfillments, custom-provider configs, whitelabel integrations. " +
  "Operations: `list-orders`, `get-order`, `list-fulfillments`, `list-subscriptions`, `get-subscription`, `list-transactions`, `get-transaction`, `list-coupons`, `get-coupon`, `get-custom-provider-config`, `list-whitelabel-providers`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-payments-reader", operation: "<name>" } }` for the full schema.';

const PAYMENTS_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel payments: order fulfillments + coupon CRUD + custom payment provider config + whitelabel integration. " +
  "Operations: `create-fulfillment`, `create-coupon`, `update-coupon`, `delete-coupon`, `create-custom-provider-config`, `disconnect-custom-provider-config`, `create-custom-provider-integration`, `delete-custom-provider-integration`, `create-whitelabel-provider`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-payments-updater", operation: "<name>" } }` for the full schema.';

export function createPaymentsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-payments-reader",
    description: PAYMENTS_READER_DESCRIPTION,
    category: "payments",
    ops: operations.payments.reader,
    deniedOps,
    // Quirk: PaymentsTools method is handleToolCall, not executeTool.
    dispatch: (op, params) => upstream.paymentsTools.handleToolCall(op, params),
  });
}

export function createPaymentsUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-payments-updater",
    description: PAYMENTS_UPDATER_DESCRIPTION,
    category: "payments",
    ops: operations.payments.updater,
    deniedOps,
    dispatch: (op, params) => upstream.paymentsTools.handleToolCall(op, params),
  });
}
