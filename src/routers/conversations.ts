/**
 * ghl-conversations-reader + ghl-conversations-updater routers (slice 3).
 *
 * 15 ops total: 6 read (search, get, message lookups, recordings) + 9 write
 * (send sms/email, create/update/delete conversations, attachments, status,
 * cancel scheduled).
 *
 * Same factory pattern as calendars + contacts.
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const CONVERSATIONS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel conversations and their messages. " +
  "Operations: `search`, `get`, `get-message`, `get-email-message`, `get-recent-messages`, `get-message-recording`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-conversations-reader", operation: "<name>" } }` for the full schema.';

const CONVERSATIONS_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel conversations: send SMS / email, create / update / delete conversations, " +
  "upload attachments, update message status, cancel scheduled sends. " +
  "Operations: `send-sms`, `send-email`, `create`, `update`, `delete`, `upload-attachments`, " +
  "`update-message-status`, `cancel-scheduled-message`, `cancel-scheduled-email`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-conversations-updater", operation: "<name>" } }` for the full schema.';

export function createConversationsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-conversations-reader",
    description: CONVERSATIONS_READER_DESCRIPTION,
    category: "conversations",
    ops: operations.conversations.reader,
    deniedOps,
    dispatch: (op, params) =>
      upstream.conversationTools.executeTool(op, params),
  });
}

export function createConversationsUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-conversations-updater",
    description: CONVERSATIONS_UPDATER_DESCRIPTION,
    category: "conversations",
    ops: operations.conversations.updater,
    deniedOps,
    dispatch: (op, params) =>
      upstream.conversationTools.executeTool(op, params),
  });
}
