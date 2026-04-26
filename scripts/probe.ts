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

import { existsSync } from "node:fs";
import {
  EXPECTED_BOOT_LOG_PREFIX,
  McpStdioClient,
  SERVER_PATH,
} from "./lib/mcp-stdio-client.js";

// ─── Live-data fixtures (BRD §10.3 + 2026-04-26 capture) ────────────────
const EXPECTED_LIVE_GROUP_ID = "FKQpu4dGBFauC28DQfSP"; //    calendars list-groups
const EXPECTED_CONTACT_ID = "uHDvdJ5uiaX2TAwa9LH9"; //       contacts search
const EXPECTED_CONVERSATION_ID = "Bh1aXpcKJOmhEMw1UeZa"; //  conversations search
const EXPECTED_PIPELINE_ID = "Zf2Lv61fAmm4JliTRsxI"; //      opportunities list-pipelines (CLAUDE.md baseline)
// Location live-read disabled: dev PIT lacks locations.readonly scope (slice 5).
// Both list-tags and list-timezones return 403 via the upstream — the facade is
// correct (clean upstreamError envelope) but the data path is gated. Re-enable
// when a higher-scoped PIT is available.

const EXPECTED_WORKFLOW_ID = "8c0aed9f-db60-437f-9127-2a67d7b8620b"; // workflow list (Funnel Engineering, captured 2026-04-26)

// Slice 7 (GTM) live-data fixtures — preflight-verified 2026-04-26
const EXPECTED_EMAIL_TEMPLATE_NAME = "weekly email test"; //  email get-templates (template name in builders[])
const EXPECTED_SURVEY_ID = "7stMLpd9UTdEviokFW7y"; //         survey list ("score card")
// social: no specific id fixture — accounts list can be empty for new locations.
//   Assertion checks for the "accounts" envelope key.
const EXPECTED_SOCIAL_ENVELOPE_KEY = '"accounts"';
// invoice: no specific id fixture for the dev location — assertion checks the
//   "invoices" envelope key (or "data" for some upstream shapes).
const EXPECTED_INVOICE_ENVELOPE_KEY = "invoices";

// Slice 8 (Revenue) live-data fixtures — preflight-verified 2026-04-26
const EXPECTED_PRODUCT_ID = "69ccba7986a44520522c56cc"; //    products list (first product on dev location)
// payments: dev PIT lacks payments.readonly scope via the upstream path (curl
//   to /payments/orders returns 200 but upstream's executeTool path returns
//   403 — same situation as location, see L-SMO-009). Router-only assertion.
// store: upstream wraps the GHL API response in an MCP-style content array
//   with formatted markdown text. For dev location with no shipping zones,
//   the response includes the literal phrase "Shipping Zones" — that's the
//   success indicator (proves the dispatch path works).
const EXPECTED_STORE_FRAGMENT = "Shipping Zones";

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
    expectedRouters: ["ghl-calendars-reader", "ghl-calendars-updater"],
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
  // ─── Slice 7 (GTM) ────────────────────────────────────────────────────
  {
    category: "email",
    expectedRouters: ["ghl-email-reader", "ghl-email-updater"],
    liveRead: {
      router: "ghl-email-reader",
      operation: "get-templates",
      expectFragment: EXPECTED_EMAIL_TEMPLATE_NAME,
      label: `ghl-email-reader get-templates includes "${EXPECTED_EMAIL_TEMPLATE_NAME}"`,
    },
  },
  {
    category: "social-media",
    expectedRouters: ["ghl-social-reader", "ghl-social-updater"],
    liveRead: {
      router: "ghl-social-reader",
      operation: "get-accounts",
      expectFragment: EXPECTED_SOCIAL_ENVELOPE_KEY,
      label: `ghl-social-reader get-accounts returns "accounts" envelope`,
    },
  },
  {
    category: "survey",
    expectedRouters: ["ghl-survey-reader"],
    liveRead: {
      router: "ghl-survey-reader",
      operation: "list",
      expectFragment: EXPECTED_SURVEY_ID,
      label: `ghl-survey-reader list returned ${EXPECTED_SURVEY_ID}`,
    },
  },
  {
    category: "invoice",
    expectedRouters: ["ghl-invoice-reader", "ghl-invoice-updater"],
    liveRead: {
      router: "ghl-invoice-reader",
      operation: "list",
      expectFragment: EXPECTED_INVOICE_ENVELOPE_KEY,
      label: `ghl-invoice-reader list returns "invoices" envelope`,
    },
  },
  // ─── Slice 8 (Revenue) ────────────────────────────────────────────────
  {
    category: "products",
    expectedRouters: ["ghl-products-reader", "ghl-products-updater"],
    liveRead: {
      router: "ghl-products-reader",
      operation: "list",
      expectFragment: EXPECTED_PRODUCT_ID,
      label: `ghl-products-reader list returned ${EXPECTED_PRODUCT_ID}`,
    },
  },
  {
    category: "payments",
    expectedRouters: ["ghl-payments-reader", "ghl-payments-updater"],
    // No liveRead: dev PIT lacks payments.readonly scope via upstream path
    // (direct curl to /payments/orders returned 200 but upstream's
    // handleToolCall returned 403). Same situation as location/L-SMO-009.
    // Router still verified via tools/list + help.list-categories.
  },
  {
    category: "store",
    expectedRouters: ["ghl-store-reader", "ghl-store-updater"],
    liveRead: {
      router: "ghl-store-reader",
      operation: "list-shipping-zones",
      expectFragment: EXPECTED_STORE_FRAGMENT,
      label: `ghl-store-reader list-shipping-zones returns "${EXPECTED_STORE_FRAGMENT}" success text`,
    },
  },
  // ─── Slice 9 (Content) ────────────────────────────────────────────────
  {
    category: "blog",
    expectedRouters: ["ghl-blog-reader", "ghl-blog-updater"],
    // No liveRead: blog endpoints in dev location may be empty/unconfigured.
    // Router-only assertion; full verification waits for blog-active client.
  },
  {
    category: "media",
    expectedRouters: ["ghl-media-reader", "ghl-media-updater"],
    // No liveRead: media `get_media_files` requires `type` param; assertion
    // would either need a known fixture (none on dev) or accept the upstream
    // validation envelope. Router-only for now; verify via opt-in probe later.
  },
  // ─── Slice 10 (Custom Data) ───────────────────────────────────────────
  {
    category: "custom-field-v2",
    expectedRouters: [
      "ghl-custom-field-v2-reader",
      "ghl-custom-field-v2-updater",
    ],
    // No liveRead: get-by-id needs an id; get-by-object-key needs a custom
    // object key. Router-only on dev; use opt-in probe per Company-keyed call.
  },
  {
    category: "object",
    expectedRouters: ["ghl-object-reader", "ghl-object-updater"],
    liveRead: {
      router: "ghl-object-reader",
      operation: "list",
      // Preflight-verified: dev location has Company schema id 67cec41d11ea7017a8c72a33
      expectFragment: "67cec41d11ea7017a8c72a33",
      label: "ghl-object-reader list returned 67cec41d11ea7017a8c72a33",
    },
  },
  {
    category: "association",
    expectedRouters: ["ghl-association-reader", "ghl-association-updater"],
    liveRead: {
      router: "ghl-association-reader",
      operation: "list",
      // Preflight-verified: dev location has association id 69300cf3543a0284b8fe70f5
      expectFragment: "69300cf3543a0284b8fe70f5",
      label: "ghl-association-reader list returned 69300cf3543a0284b8fe70f5",
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
  {
    category: "workflow",
    expectedRouters: ["ghl-workflow-reader"],
    liveRead: {
      router: "ghl-workflow-reader",
      operation: "list",
      expectFragment: EXPECTED_WORKFLOW_ID,
      label: `ghl-workflow-reader list returned ${EXPECTED_WORKFLOW_ID}`,
    },
  },
];

const ALL_EXPECTED_ROUTERS: readonly string[] = [
  "ghl-toolkit-help",
  ...CATEGORY_PROBES.flatMap((c) => c.expectedRouters),
].sort();

const ALL_EXPECTED_CATEGORIES: readonly string[] = CATEGORY_PROBES.map(
  (c) => c.category,
);

// JSON-RPC types + McpStdioClient now live in scripts/lib/mcp-stdio-client.ts
// (extracted in Phase 1.5 to share with probe-write.ts).

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
    const expected = [
      "ghl-calendars-reader",
      "ghl-calendars-updater",
      "ghl-toolkit-help",
    ].sort();
    const toolsOk =
      names.length === expected.length &&
      names.every((n, i) => n === expected[i]);
    const stderrOk = b.stderr.includes(EXPECTED_BOOT_LOG_PREFIX);
    record(
      `env-filter (GHL_TOOL_CATEGORIES=calendars) registered ${expected.length} tools, stderr line matched`,
      toolsOk && stderrOk,
      toolsOk && stderrOk
        ? `tools=${expected.length}, stderr ok`
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
