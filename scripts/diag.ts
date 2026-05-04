/**
 * Diagnostic — capture real error envelopes for v1.1.2 defects (D-01..D-06).
 * Local-only; not part of CI.
 */
import "dotenv/config";
import { McpStdioClient } from "./lib/mcp-stdio-client.js";

async function probe(
  client: McpStdioClient,
  label: string,
  call: () => Promise<unknown>,
): Promise<void> {
  try {
    const r = await call();
    console.log(`\n=== ${label} ===\n✓ OK\n${JSON.stringify(r).slice(0, 600)}`);
  } catch (e) {
    console.log(`\n=== ${label} ===\n✗ ERROR\n${(e as Error).message}`);
  }
}

async function main(): Promise<void> {
  const c = new McpStdioClient({});
  try {
    await c.initialize();

    await probe(c, "D-01 create-tag", () =>
      c.request("tools/call", {
        name: "ghl-location-updater",
        arguments: {
          selectSchema: {
            operation: "create-tag",
            params: { name: "v113-diag-tmp-tag" },
          },
        },
      }),
    );

    await probe(c, "D-02 list-tags (no params, auto-inject)", () =>
      c.request("tools/call", {
        name: "ghl-location-reader",
        arguments: { selectSchema: { operation: "list-tags" } },
      }),
    );

    await probe(c, "D-03a list-submissions (no params)", () =>
      c.request("tools/call", {
        name: "ghl-survey-reader",
        arguments: { selectSchema: { operation: "list-submissions" } },
      }),
    );

    await probe(c, "D-03b list-submissions (limit:5)", () =>
      c.request("tools/call", {
        name: "ghl-survey-reader",
        arguments: {
          selectSchema: {
            operation: "list-submissions",
            params: { limit: 5 },
          },
        },
      }),
    );

    await probe(c, "D-03c list-submissions (surveyId)", () =>
      c.request("tools/call", {
        name: "ghl-survey-reader",
        arguments: {
          selectSchema: {
            operation: "list-submissions",
            params: { surveyId: "7stMLpd9UTdEviokFW7y", limit: 5 },
          },
        },
      }),
    );

    await probe(c, "D-04 search with nested filters", () =>
      c.request("tools/call", {
        name: "ghl-contacts-reader",
        arguments: {
          selectSchema: {
            operation: "search",
            params: { filters: { tags: ["customer"] }, limit: 5 },
          },
        },
      }),
    );

    await probe(c, "D-05 search with pageLimit:50", () =>
      c.request("tools/call", {
        name: "ghl-contacts-reader",
        arguments: {
          selectSchema: {
            operation: "search",
            params: { query: "CEO", pageLimit: 50 },
          },
        },
      }),
    );
  } finally {
    await c.close();
  }
}

main().catch((err) => {
  console.error("[diag] fatal:", err);
  process.exit(1);
});
