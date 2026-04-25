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
