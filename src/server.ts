/**
 * MCP server boot. Reads env, instantiates upstream, builds routers,
 * registers MCP request handlers, connects stdio transport.
 *
 * AC-5.4: emits exactly one boot-log line to stderr in the form:
 *   [salesmfast-ops] active_categories=... active_routers=... denied_ops=...
 * Probe assertion #6 greps for the prefix; format is locked.
 */

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  type CallToolResult,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { parseEnv } from "./env.js";
import { createUpstream } from "./upstream.js";
import { buildRouters } from "./routers/index.js";
import { methodNotFound } from "./errors.js";

async function main(): Promise<void> {
  const env = parseEnv(process.env);
  const upstream = createUpstream(env);
  const { routers, activeCategories } = buildRouters(env, upstream);

  // Boot-log line (AC-5.4) — single grep-friendly line, key=value pairs.
  // Format locked in plan §Verbatim strings; probe assertion #6 depends on it.
  const activeRouters = routers.map((r) => r.name).join(",");
  const denied = env.deniedOps.join(",");
  process.stderr.write(
    `[salesmfast-ops] active_categories=${activeCategories.join(",")} ` +
      `active_routers=${activeRouters} ` +
      `denied_ops=${denied}\n`,
  );

  const server = new Server(
    { name: "salesmfast-ops-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: routers.map((r) => ({
      name: r.name,
      description: r.description,
      inputSchema: r.inputSchema as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const router = routers.find((r) => r.name === request.params.name);
      if (!router) {
        throw methodNotFound(
          request.params.name,
          routers.map((r) => r.name),
        );
      }
      const result = await router.handler(request.params.arguments);
      // RouterContent matches the plain CallToolResult shape; cast through unknown
      // to pass the SDK's union-narrowing return-type check (the union also
      // includes a task-aware variant with a required `task` property we don't use).
      return result as unknown as CallToolResult;
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[salesmfast-ops] fatal: ${msg}\n`);
  process.exit(1);
});
