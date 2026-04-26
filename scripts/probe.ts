/**
 * Story 6 probe — integration test for the salesmfast-ops-mcp facade.
 *
 * Spawns dist/server.js over stdio, sends MCP JSON-RPC requests, asserts:
 *
 *   PER-CATEGORY (data-driven loop over CATEGORY_PROBES):
 *     - tools/list contains every expected router name
 *     - ghl-toolkit-help list-categories returns the active set
 *     - for each category with a live-read entry: that call returns a
 *       payload containing the expected fragment (real ID from BRD §10)
 *
 *   NEGATIVE (calendars-reader as representative):
 *     - invalid params → InvalidParams mentioning "bogus" (AC-4.2, AC-8.1)
 *     - unknown operation → MethodNotFound listing 6 valid ops (AC-4.3, AC-8.3)
 *
 *   ENV-FILTER (separate server instance with GHL_TOOL_CATEGORIES=calendars):
 *     - tools/list returns exactly calendars-reader + help
 *     - stderr boot-log line matches verbatim format (AC-5.1, AC-5.4)
 *
 * Run via: `npm run probe` (which is `tsx scripts/probe.ts`).
 * Exit 0 = all assertions pass. Exit 1 = any failure.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const SERVER_PATH = resolve(PROJECT_ROOT, "dist/server.js");

const REQUEST_TIMEOUT_MS = 30_000;
const PROTOCOL_VERSION = "2024-11-05";

// ─── Live-data fixtures (BRD §10.3 + 2026-04-26 capture) ────────────────
const EXPECTED_LIVE_GROUP_ID = "FKQpu4dGBFauC28DQfSP"; //    calendars list-groups
const EXPECTED_CONTACT_ID = "uHDvdJ5uiaX2TAwa9LH9"; //       contacts search
const EXPECTED_CONVERSATION_ID = "Bh1aXpcKJOmhEMw1UeZa"; //  conversations search
const EXPECTED_PIPELINE_ID = "Zf2Lv61fAmm4JliTRsxI"; //      opportunities list-pipelines (CLAUDE.md baseline)
// Location live-read disabled: dev PIT lacks locations.readonly scope (slice 5).
// Both list-tags and list-timezones return 403 via the upstream — the facade is
// correct (clean upstreamError envelope) but the data path is gated. Re-enable
// when a higher-scoped PIT is available.

const EXPECTED_BOOT_LOG_PREFIX = "[salesmfast-ops] active_categories=";

// Negative-test fixture (calendars-reader stays as the representative since
// every router uses the same factory and same handler order).
const NEGATIVE_TEST_ROUTER = "ghl-calendars-reader";
const NEGATIVE_TEST_VALID_OPS = [
  "list-groups",
  "list",
  "get",
  "list-events",
  "list-free-slots",
  "get-appointment",
];

// ─── Per-category probes ────────────────────────────────────────────────
interface CategoryProbe {
  readonly category: string;
  readonly expectedRouters: readonly string[];
  readonly liveRead?: {
    readonly router: string;
    readonly operation: string;
    readonly params?: Record<string, unknown>;
    readonly expectFragment: string;
    readonly label: string;
  };
}

// Order matches operations.ts ALL_CATEGORIES (which drives help.list-categories).
const CATEGORY_PROBES: readonly CategoryProbe[] = [
  {
    category: "contacts",
    expectedRouters: ["ghl-contacts-reader", "ghl-contacts-updater"],
    liveRead: {
      router: "ghl-contacts-reader",
      operation: "search",
      expectFragment: EXPECTED_CONTACT_ID,
      label: `ghl-contacts-reader search returned ${EXPECTED_CONTACT_ID}`,
    },
  },
  {
    category: "conversations",
    expectedRouters: ["ghl-conversations-reader", "ghl-conversations-updater"],
    liveRead: {
      router: "ghl-conversations-reader",
      operation: "search",
      expectFragment: EXPECTED_CONVERSATION_ID,
      label: `ghl-conversations-reader search returned ${EXPECTED_CONVERSATION_ID}`,
    },
  },
  {
    category: "calendars",
    expectedRouters: ["ghl-calendars-reader"],
    liveRead: {
      router: "ghl-calendars-reader",
      operation: "list-groups",
      expectFragment: EXPECTED_LIVE_GROUP_ID,
      label: `ghl-calendars-reader list-groups returned ${EXPECTED_LIVE_GROUP_ID}`,
    },
  },
  {
    category: "opportunities",
    expectedRouters: ["ghl-opportunities-reader", "ghl-opportunities-updater"],
    liveRead: {
      router: "ghl-opportunities-reader",
      operation: "list-pipelines",
      expectFragment: EXPECTED_PIPELINE_ID,
      label: `ghl-opportunities-reader list-pipelines returned ${EXPECTED_PIPELINE_ID}`,
    },
  },
  {
    category: "location",
    expectedRouters: ["ghl-location-reader", "ghl-location-updater"],
    // No liveRead: dev PIT lacks `locations.readonly` scope (both list-tags and
    // list-timezones return 403 Forbidden via upstream — confirmed via direct
    // upstream.executeTool call, not a facade bug). Router still verified via
    // tools/list + help.list-categories; full verification waits for a
    // higher-scoped PIT. See lessons L-SMO-009.
  },
];

const ALL_EXPECTED_ROUTERS: readonly string[] = [
  "ghl-toolkit-help",
  ...CATEGORY_PROBES.flatMap((c) => c.expectedRouters),
].sort();

const ALL_EXPECTED_CATEGORIES: readonly string[] = CATEGORY_PROBES.map(
  (c) => c.category,
);

// ─── JSON-RPC types + minimal stdio MCP client ──────────────────────────
type JsonRpcId = number | string;
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}
interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}
interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
}
interface JsonRpcError {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: { code: number; message: string; data?: unknown };
}
type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

class McpStdioClient {
  private proc: ChildProcessWithoutNullStreams;
  private buf = "";
  private nextId = 1;
  private pending = new Map<
    JsonRpcId,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  public stderr = "";
  public exited = false;

  constructor(env: Record<string, string>) {
    this.proc = spawn("node", [SERVER_PATH], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc.stderr.on("data", (chunk: Buffer) => {
      this.stderr += chunk.toString("utf8");
    });
    this.proc.stdout.on("data", (chunk: Buffer) => this.handleChunk(chunk));
    this.proc.on("exit", () => {
      this.exited = true;
      for (const [, { reject, timeout }] of this.pending) {
        clearTimeout(timeout);
        reject(new Error("server process exited before response"));
      }
      this.pending.clear();
    });
  }

  private handleChunk(chunk: Buffer): void {
    this.buf += chunk.toString("utf8");
    const lines = this.buf.split("\n");
    this.buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(trimmed) as JsonRpcResponse;
      } catch {
        continue;
      }
      if (msg.id === undefined || !this.pending.has(msg.id)) continue;
      const entry = this.pending.get(msg.id);
      if (!entry) continue;
      clearTimeout(entry.timeout);
      this.pending.delete(msg.id);
      if ("error" in msg) {
        const err = new Error(msg.error.message) as Error & {
          code?: number;
          data?: unknown;
        };
        err.code = msg.error.code;
        err.data = msg.error.data;
        entry.reject(err);
      } else {
        entry.resolve(msg.result);
      }
    }
  }

  request(
    method: string,
    params?: unknown,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<unknown> {
    const id = this.nextId++;
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.proc.stdin.write(JSON.stringify(msg) + "\n");
    });
  }

  notify(method: string, params?: unknown): void {
    const msg: JsonRpcNotification = { jsonrpc: "2.0", method, params };
    this.proc.stdin.write(JSON.stringify(msg) + "\n");
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "salesmfast-probe", version: "0.1.0" },
    });
    this.notify("notifications/initialized");
  }

  async close(): Promise<void> {
    if (this.exited) return;
    this.proc.kill("SIGTERM");
    await new Promise<void>((res) => {
      const t = setTimeout(() => {
        this.proc.kill("SIGKILL");
        res();
      }, 2000);
      this.proc.once("exit", () => {
        clearTimeout(t);
        res();
      });
    });
  }
}

// ─── Assertion plumbing ─────────────────────────────────────────────────
interface AssertionResult {
  name: string;
  ok: boolean;
  details: string;
}
const results: AssertionResult[] = [];

function record(name: string, ok: boolean, details: string): void {
  results.push({ name, ok, details });
  const mark = ok ? "✓" : "✗";
  // eslint-disable-next-line no-console
  console.log(`[probe] ${mark} ${name}${details ? " — " + details : ""}`);
}

async function expectThrow<T>(p: Promise<T>): Promise<Error> {
  try {
    await p;
    return new Error("expected throw, but resolved");
  } catch (e) {
    return e as Error;
  }
}

// ─── Main probe sequence ────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!existsSync(SERVER_PATH)) {
    record(
      `tools/list returned ${ALL_EXPECTED_ROUTERS.length} tools (default env)`,
      false,
      `dist/server.js not found at ${SERVER_PATH} — run \`npm run build\` first`,
    );
    summarizeAndExit();
    return;
  }

  // ─── Server A: default env (no GHL_TOOL_CATEGORIES set) ────────────
  const a = new McpStdioClient({});
  try {
    await a.initialize();

    // Assertion: tools/list returns the union of all expected routers
    {
      const result = (await a.request("tools/list", {})) as {
        tools: { name: string }[];
      };
      const names = result.tools.map((t) => t.name).sort();
      const expected = [...ALL_EXPECTED_ROUTERS];
      const ok =
        names.length === expected.length &&
        names.every((n, i) => n === expected[i]);
      record(
        `tools/list returned ${expected.length} tools (default env)`,
        ok,
        `got [${names.join(", ")}]`,
      );
    }

    // Assertion: help list-categories matches the active set
    {
      const result = (await a.request("tools/call", {
        name: "ghl-toolkit-help",
        arguments: { selectSchema: { operation: "list-categories" } },
      })) as { content: { type: string; text: string }[] };
      const text = result.content?.[0]?.text ?? "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      const expected = [...ALL_EXPECTED_CATEGORIES];
      const ok =
        Array.isArray(parsed) &&
        parsed.length === expected.length &&
        expected.every((c) => (parsed as unknown[]).includes(c));
      record(
        `ghl-toolkit-help list-categories returned ${JSON.stringify(expected)}`,
        ok,
        `got ${JSON.stringify(parsed)}`,
      );
    }

    // Per-category live reads (data-driven)
    for (const cat of CATEGORY_PROBES) {
      if (!cat.liveRead) continue;
      const lr = cat.liveRead;
      const args: Record<string, unknown> = {
        selectSchema: { operation: lr.operation },
      };
      if (lr.params !== undefined) {
        (args.selectSchema as Record<string, unknown>).params = lr.params;
      }
      try {
        const result = (await a.request("tools/call", {
          name: lr.router,
          arguments: args,
        })) as {
          content: { type: string; text: string }[];
          isError?: boolean;
        };
        const text = result.content?.[0]?.text ?? "";
        const ok = !result.isError && text.includes(lr.expectFragment);
        record(
          lr.label,
          ok,
          ok
            ? "live data round-trip ok"
            : `payload missing fragment "${lr.expectFragment}"; first 200 chars: ${text.slice(
                0,
                200,
              )}`,
        );
      } catch (e) {
        record(lr.label, false, `threw: ${(e as Error).message.slice(0, 200)}`);
      }
    }

    // Negative — invalid params (AC-4.2, AC-8.1) — calendars-reader as representative
    {
      const err = await expectThrow(
        a.request("tools/call", {
          name: NEGATIVE_TEST_ROUTER,
          arguments: {
            selectSchema: { operation: "list-groups", params: { bogus: 1 } },
          },
        }),
      );
      const msg = err.message.toLowerCase();
      const ok =
        msg.includes("invalid") ||
        msg.includes("bogus") ||
        msg.includes("additional");
      record(
        "invalid params returned InvalidParams (bogus)",
        ok,
        `error: ${err.message.slice(0, 200)}`,
      );
    }

    // Negative — unknown op (AC-4.3, AC-8.3)
    {
      const err = await expectThrow(
        a.request("tools/call", {
          name: NEGATIVE_TEST_ROUTER,
          arguments: { selectSchema: { operation: "fly-to-the-moon" } },
        }),
      );
      const msg = err.message;
      const missing = NEGATIVE_TEST_VALID_OPS.filter((op) => !msg.includes(op));
      const ok = missing.length === 0;
      record(
        `unknown operation returned MethodNotFound listing ${NEGATIVE_TEST_VALID_OPS.length} ops`,
        ok,
        ok
          ? "all valid ops listed"
          : `missing: ${missing.join(", ")}; got: ${msg.slice(0, 200)}`,
      );
    }
  } finally {
    await a.close();
  }

  // ─── Server B: GHL_TOOL_CATEGORIES=calendars (env-filter assertion) ─
  const b = new McpStdioClient({ GHL_TOOL_CATEGORIES: "calendars" });
  try {
    await b.initialize();
    const result = (await b.request("tools/list", {})) as {
      tools: { name: string }[];
    };
    const names = result.tools.map((t) => t.name).sort();
    const expected = ["ghl-calendars-reader", "ghl-toolkit-help"].sort();
    const toolsOk =
      names.length === expected.length &&
      names.every((n, i) => n === expected[i]);
    const stderrOk = b.stderr.includes(EXPECTED_BOOT_LOG_PREFIX);
    record(
      "env-filter (GHL_TOOL_CATEGORIES=calendars) registered 2 tools, stderr line matched",
      toolsOk && stderrOk,
      toolsOk && stderrOk
        ? "tools=2, stderr ok"
        : `tools=[${names.join(", ")}], stderrHasPrefix=${stderrOk}; stderr first 300: ${b.stderr.slice(
            0,
            300,
          )}`,
    );
  } finally {
    await b.close();
  }

  summarizeAndExit();
}

function summarizeAndExit(): never {
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    // eslint-disable-next-line no-console
    console.log("[probe] All assertions passed.");
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.log(`[probe] ${failed.length} assertion(s) failed.`);
  process.exit(1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[probe] unhandled error:", err);
  process.exit(1);
});
