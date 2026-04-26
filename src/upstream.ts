/**
 * Upstream factory — wraps the upstream `ghl-mcp-upstream` package as a
 * typed library. Single export: `createUpstream(env)` returns a record of
 * instantiated tool classes the routers call into.
 *
 * Factory function (not module-level singleton) so:
 *   - env parsing stays in src/env.ts
 *   - tests/probe can spawn the server fresh per assertion without
 *     stale state leaking across instances
 */

import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
import { CalendarTools } from "ghl-mcp-upstream/dist/tools/calendar-tools.js";
import { ContactTools } from "ghl-mcp-upstream/dist/tools/contact-tools.js";
import { ConversationTools } from "ghl-mcp-upstream/dist/tools/conversation-tools.js";
import type { ParsedEnv } from "./env.js";

const GHL_API_VERSION = "2021-07-28";

export interface Upstream {
  readonly calendarTools: CalendarTools;
  readonly contactTools: ContactTools;
  readonly conversationTools: ConversationTools;
}

export function createUpstream(env: ParsedEnv): Upstream {
  const client = new GHLApiClient({
    accessToken: env.apiKey,
    baseUrl: env.baseUrl,
    version: GHL_API_VERSION,
    locationId: env.locationId,
  });
  return {
    calendarTools: new CalendarTools(client),
    contactTools: new ContactTools(client),
    conversationTools: new ConversationTools(client),
  };
}
