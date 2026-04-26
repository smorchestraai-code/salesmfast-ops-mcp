/**
 * Ambient type declarations for the upstream `ghl-mcp-upstream` package.
 *
 * The upstream is JS-only (no .d.ts shipped) and exports its tools as deep
 * imports under `dist/`. We declare only the surface this project actually
 * uses: GHLApiClient + CalendarTools.executeTool. If a future slice needs
 * additional categories (ContactTools, etc.), extend this file.
 */

declare module "ghl-mcp-upstream/dist/clients/ghl-api-client.js" {
  export interface GHLConfig {
    accessToken: string;
    baseUrl: string;
    version: string;
    locationId: string;
  }
  export class GHLApiClient {
    constructor(config: GHLConfig);
  }
}

declare module "ghl-mcp-upstream/dist/tools/calendar-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class CalendarTools {
    constructor(client: GHLApiClient);
    /**
     * Returns whatever the underlying upstream method returns. We pass it
     * through verbatim and serialize at the router boundary.
     */
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/contact-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class ContactTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/conversation-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class ConversationTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/opportunity-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class OpportunityTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/location-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class LocationTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/workflow-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class WorkflowTools {
    constructor(client: GHLApiClient);
    /**
     * NOTE: WorkflowTools uses `executeWorkflowTool`, NOT `executeTool`.
     * Per CLAUDE.md "Common pitfalls" — verify per upstream class.
     */
    executeWorkflowTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown>;
  }
}

// ─── Slice 7 (GTM) ──────────────────────────────────────────────────────

declare module "ghl-mcp-upstream/dist/tools/social-media-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class SocialMediaTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/email-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class EmailTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/email-isv-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class EmailISVTools {
    constructor(client: GHLApiClient);
    executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/survey-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class SurveyTools {
    constructor(client: GHLApiClient);
    /**
     * NOTE: SurveyTools uses `executeSurveyTool`, NOT `executeTool` (quirk).
     */
    executeSurveyTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/invoices-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class InvoicesTools {
    constructor(client: GHLApiClient);
    /**
     * NOTE: InvoicesTools uses `handleToolCall`, NOT `executeTool` (quirk).
     */
    handleToolCall(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown>;
  }
}

// ─── Slice 8 (Revenue) ──────────────────────────────────────────────────

declare module "ghl-mcp-upstream/dist/tools/products-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class ProductsTools {
    constructor(client: GHLApiClient);
    /**
     * NOTE: ProductsTools uses `executeProductsTool`, NOT `executeTool` (quirk).
     */
    executeProductsTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/payments-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class PaymentsTools {
    constructor(client: GHLApiClient);
    /**
     * NOTE: PaymentsTools uses `handleToolCall`, NOT `executeTool` (quirk).
     */
    handleToolCall(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown>;
  }
}

declare module "ghl-mcp-upstream/dist/tools/store-tools.js" {
  import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
  export class StoreTools {
    constructor(client: GHLApiClient);
    /**
     * NOTE: StoreTools uses `executeStoreTool`, NOT `executeTool` (quirk).
     */
    executeStoreTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown>;
  }
}
