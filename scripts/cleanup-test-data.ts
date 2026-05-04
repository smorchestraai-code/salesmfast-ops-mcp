/**
 * v1.1.3 cleanup — delete test data from Mamoun's 2026-05-04 live session
 * + this session's diag tag.
 *
 * Targets:
 *   - Contact cV3qN6eskPwfkk1S5byt (cascades note + task)
 *   - Opportunity JHlOHdqoi19qI3lmKwOI
 *   - Tag "v113-diag-tmp-tag" (created by diag.ts, by id lookup via list-tags)
 *
 * Idempotent: re-runs are safe (404 = already deleted = ok).
 */
import "dotenv/config";
import { McpStdioClient } from "./lib/mcp-stdio-client.js";

interface CallResult {
  content?: { type: string; text: string }[];
  isError?: boolean;
}

async function tryCall(
  c: McpStdioClient,
  label: string,
  name: string,
  selectSchema: unknown,
): Promise<void> {
  try {
    const r = (await c.request("tools/call", {
      name,
      arguments: { selectSchema },
    })) as CallResult;
    const text = r.content?.[0]?.text ?? "";
    console.log(`✓ ${label} — ${text.slice(0, 200)}`);
  } catch (e) {
    const msg = (e as Error).message;
    if (/not found|404|already/i.test(msg)) {
      console.log(`✓ ${label} — already gone (${msg.slice(0, 80)})`);
    } else {
      console.log(`✗ ${label} — ${msg.slice(0, 200)}`);
    }
  }
}

async function main(): Promise<void> {
  const c = new McpStdioClient({});
  try {
    await c.initialize();

    // 1. Delete the test opportunity first (avoids dangling pipeline reference).
    await tryCall(
      c,
      "delete opportunity JHlOHdqoi19qI3lmKwOI",
      "ghl-opportunities-updater",
      {
        operation: "delete",
        params: { opportunityId: "JHlOHdqoi19qI3lmKwOI" },
      },
    );

    // 2. Delete the test contact (cascades notes + tasks).
    await tryCall(
      c,
      "delete contact cV3qN6eskPwfkk1S5byt",
      "ghl-contacts-updater",
      {
        operation: "delete",
        params: { contactId: "cV3qN6eskPwfkk1S5byt" },
      },
    );

    // 3. Find + delete the diag tag.
    try {
      const r = (await c.request("tools/call", {
        name: "ghl-location-reader",
        arguments: { selectSchema: { operation: "list-tags" } },
      })) as CallResult;
      const text = r.content?.[0]?.text ?? "";
      const parsed = JSON.parse(text) as {
        tags?: { id: string; name: string }[];
      };
      const target = parsed.tags?.find((t) => t.name === "v113-diag-tmp-tag");
      if (target) {
        await tryCall(
          c,
          `delete tag ${target.id} (v113-diag-tmp-tag)`,
          "ghl-location-updater",
          { operation: "delete-tag", params: { tagId: target.id } },
        );
      } else {
        console.log("✓ tag v113-diag-tmp-tag — not present");
      }
    } catch (e) {
      console.log(`✗ tag lookup — ${(e as Error).message.slice(0, 200)}`);
    }
  } finally {
    await c.close();
  }
}

main().catch((err) => {
  console.error("[cleanup] fatal:", err);
  process.exit(1);
});
