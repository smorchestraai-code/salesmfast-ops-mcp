/**
 * ghl-email-reader + ghl-email-updater routers (slice 7).
 *
 * Spans TWO upstream classes: EmailTools (templates + campaigns) +
 * EmailISVTools (verify_email). Single category for operator simplicity.
 * The dispatch closure routes `verify-email` to EmailISVTools and
 * everything else to EmailTools.
 *
 * 6 ops total: 2 read (get-templates, get-campaigns) + 4 write
 * (create-template, update-template, delete-template, verify-email).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const EMAIL_READER_DESCRIPTION =
  "Read-only access to GoHighLevel email templates + campaigns. " +
  "Operations: `get-templates`, `get-campaigns`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-email-reader", operation: "<name>" } }` for the full schema.';

const EMAIL_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel email: template CRUD + ISV email-deliverability verification. " +
  "Operations: `create-template`, `update-template`, `delete-template`, `verify-email`. " +
  "All operations either mutate state (templates) or hit external ISV APIs (verify) — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-email-updater", operation: "<name>" } }` for the full schema.';

/**
 * Spans EmailTools + EmailISVTools. Routes `verify_email` upstream tool name
 * to EmailISVTools; everything else to EmailTools.
 */
function dispatchEmail(upstream: Upstream) {
  return (op: string, params: Record<string, unknown>) => {
    if (op === "verify_email") {
      return upstream.emailIsvTools.executeTool(op, params);
    }
    return upstream.emailTools.executeTool(op, params);
  };
}

export function createEmailReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-email-reader",
    description: EMAIL_READER_DESCRIPTION,
    category: "email",
    ops: operations.email.reader,
    deniedOps,
    dispatch: dispatchEmail(upstream),
  });
}

export function createEmailUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-email-updater",
    description: EMAIL_UPDATER_DESCRIPTION,
    category: "email",
    ops: operations.email.updater,
    deniedOps,
    dispatch: dispatchEmail(upstream),
  });
}
