/**
 * ghl-invoice-reader + ghl-invoice-updater routers (slice 7).
 *
 * 18 ops total: 7 read (list invoices/estimates/templates/schedules,
 * get single + get-template + get-schedule) + 11 write (create
 * invoice/estimate, send, create-from-estimate, template CRUD,
 * schedule create, generate invoice/estimate numbers).
 *
 * `InvoicesTools.handleToolCall` (quirk — not `executeTool`).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const INVOICE_READER_DESCRIPTION =
  "Read-only access to GoHighLevel invoices, estimates, templates, and schedules. " +
  "Operations: `list`, `get`, `list-estimates`, `list-templates`, `get-template`, `list-schedules`, `get-schedule`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-invoice-reader", operation: "<name>" } }` for the full schema.';

const INVOICE_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel invoices + estimates: create / send invoices and estimates, convert estimate to invoice, " +
  "invoice-template CRUD, recurring invoice schedules, generate next invoice/estimate numbers. " +
  "Operations: `create`, `send-invoice`, `create-estimate`, `send-estimate`, `create-from-estimate`, `create-template`, " +
  "`update-template`, `delete-template`, `create-schedule`, `generate-invoice-number`, `generate-estimate-number`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. Note: `generate-*-number` reserves the next number from the sequence (also a mutation). " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-invoice-updater", operation: "<name>" } }` for the full schema.';

export function createInvoiceReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-invoice-reader",
    description: INVOICE_READER_DESCRIPTION,
    category: "invoice",
    ops: operations.invoice.reader,
    deniedOps,
    // Quirk: InvoicesTools method is handleToolCall, not executeTool.
    dispatch: (op, params) => upstream.invoicesTools.handleToolCall(op, params),
  });
}

export function createInvoiceUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-invoice-updater",
    description: INVOICE_UPDATER_DESCRIPTION,
    category: "invoice",
    ops: operations.invoice.updater,
    deniedOps,
    dispatch: (op, params) => upstream.invoicesTools.handleToolCall(op, params),
  });
}
