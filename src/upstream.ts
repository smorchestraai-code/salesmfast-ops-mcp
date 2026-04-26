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
import { LocationTools } from "ghl-mcp-upstream/dist/tools/location-tools.js";
import { OpportunityTools } from "ghl-mcp-upstream/dist/tools/opportunity-tools.js";
import { WorkflowTools } from "ghl-mcp-upstream/dist/tools/workflow-tools.js";
// ─── Slice 7 (GTM) ───
import { SocialMediaTools } from "ghl-mcp-upstream/dist/tools/social-media-tools.js";
import { EmailTools } from "ghl-mcp-upstream/dist/tools/email-tools.js";
import { EmailISVTools } from "ghl-mcp-upstream/dist/tools/email-isv-tools.js";
import { SurveyTools } from "ghl-mcp-upstream/dist/tools/survey-tools.js";
import { InvoicesTools } from "ghl-mcp-upstream/dist/tools/invoices-tools.js";
import type { ParsedEnv } from "./env.js";

const GHL_API_VERSION = "2021-07-28";

export interface Upstream {
  readonly calendarTools: CalendarTools;
  readonly contactTools: ContactTools;
  readonly conversationTools: ConversationTools;
  readonly locationTools: LocationTools;
  readonly opportunityTools: OpportunityTools;
  readonly workflowTools: WorkflowTools;
  // ─── Slice 7 ───
  readonly socialMediaTools: SocialMediaTools;
  readonly emailTools: EmailTools;
  readonly emailIsvTools: EmailISVTools;
  readonly surveyTools: SurveyTools;
  readonly invoicesTools: InvoicesTools;
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
    locationTools: new LocationTools(client),
    opportunityTools: new OpportunityTools(client),
    workflowTools: new WorkflowTools(client),
    socialMediaTools: new SocialMediaTools(client),
    emailTools: new EmailTools(client),
    emailIsvTools: new EmailISVTools(client),
    surveyTools: new SurveyTools(client),
    invoicesTools: new InvoicesTools(client),
  };
}
