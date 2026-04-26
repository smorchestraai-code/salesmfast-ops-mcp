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
// ─── Slice 8 (Revenue) ───
import { ProductsTools } from "ghl-mcp-upstream/dist/tools/products-tools.js";
import { PaymentsTools } from "ghl-mcp-upstream/dist/tools/payments-tools.js";
import { StoreTools } from "ghl-mcp-upstream/dist/tools/store-tools.js";
// ─── Slice 9 (Content) ───
import { BlogTools } from "ghl-mcp-upstream/dist/tools/blog-tools.js";
import { MediaTools } from "ghl-mcp-upstream/dist/tools/media-tools.js";
// ─── Slice 10 (Custom Data) ───
import { CustomFieldV2Tools } from "ghl-mcp-upstream/dist/tools/custom-field-v2-tools.js";
import { ObjectTools } from "ghl-mcp-upstream/dist/tools/object-tools.js";
import { AssociationTools } from "ghl-mcp-upstream/dist/tools/association-tools.js";
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
  // ─── Slice 8 ───
  readonly productsTools: ProductsTools;
  readonly paymentsTools: PaymentsTools;
  readonly storeTools: StoreTools;
  // ─── Slice 9 ───
  readonly blogTools: BlogTools;
  readonly mediaTools: MediaTools;
  // ─── Slice 10 ───
  readonly customFieldV2Tools: CustomFieldV2Tools;
  readonly objectTools: ObjectTools;
  readonly associationTools: AssociationTools;
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
    productsTools: new ProductsTools(client),
    paymentsTools: new PaymentsTools(client),
    storeTools: new StoreTools(client),
    blogTools: new BlogTools(client),
    mediaTools: new MediaTools(client),
    customFieldV2Tools: new CustomFieldV2Tools(client),
    objectTools: new ObjectTools(client),
    associationTools: new AssociationTools(client),
  };
}
