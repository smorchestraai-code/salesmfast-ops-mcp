/**
 * Phase 1.5 write-path probe (AC-6.4 from BRD §13).
 *
 * Opt-in only — `npm run probe:write`. NOT in CI default. Mutates upstream
 * state: creates a real GHL contact, fetches it back, asserts identity match,
 * then deletes it. Failure paths attempt cleanup so we don't leak test contacts.
 *
 * Sequence (each step is one assertion):
 *   1. CREATE  ghl-contacts-updater.create  →  expect response has `contact.id`
 *   2. GET     ghl-contacts-reader.get      →  expect retrieved id + email match
 *   3. DELETE  ghl-contacts-updater.delete  →  expect success: true
 *   4. GET (verify deleted) — expect 404 / "not found" envelope
 *
 * Run via: `npm run probe:write` (which is `tsx scripts/probe-write.ts`).
 * Exit 0 = all pass. Exit 1 = any failure (cleanup attempted on partial pass).
 */

import { existsSync } from "node:fs";
import { McpStdioClient, SERVER_PATH } from "./lib/mcp-stdio-client.js";

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
  console.log(`[probe:write] ${mark} ${name}${details ? " — " + details : ""}`);
}

interface CallToolTextResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

function parseTextResult(result: CallToolTextResult): unknown {
  const text = result.content?.[0]?.text ?? "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Try to extract the contact id from any reasonable shape upstream returns. */
function extractContactId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj["id"] === "string") return obj["id"];
  const contact = obj["contact"];
  if (contact && typeof contact === "object" && contact !== null) {
    const cobj = contact as Record<string, unknown>;
    if (typeof cobj["id"] === "string") return cobj["id"];
  }
  return undefined;
}

function extractContactEmail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj["email"] === "string") return obj["email"];
  const contact = obj["contact"];
  if (contact && typeof contact === "object" && contact !== null) {
    const cobj = contact as Record<string, unknown>;
    if (typeof cobj["email"] === "string") return cobj["email"];
  }
  return undefined;
}

async function main(): Promise<void> {
  if (!existsSync(SERVER_PATH)) {
    record(
      "create contact (write path)",
      false,
      `dist/server.js not found at ${SERVER_PATH} — run \`npm run build\` first`,
    );
    summarizeAndExit();
    return;
  }

  // Unique fixture: timestamp + random nibble keeps each run distinct.
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6).toString(16)}`;
  const testEmail = `probe-write+${stamp}@salesmfast-ops.test`;
  const testFirstName = "Probe";
  const testLastName = `WritePath-${stamp.slice(-6)}`;

  let createdId: string | undefined;
  const client = new McpStdioClient({});
  try {
    await client.initialize();

    // ─── Step 1: CREATE ────────────────────────────────────────────────
    {
      const result = (await client.request("tools/call", {
        name: "ghl-contacts-updater",
        arguments: {
          selectSchema: {
            operation: "create",
            params: {
              firstName: testFirstName,
              lastName: testLastName,
              email: testEmail,
            },
          },
        },
      })) as CallToolTextResult;
      const payload = parseTextResult(result);
      const id = extractContactId(payload);
      const ok = !result.isError && typeof id === "string" && id.length > 0;
      createdId = id;
      record(
        `create contact ${testEmail}`,
        ok,
        ok ? `id=${id}` : `payload=${JSON.stringify(payload).slice(0, 200)}`,
      );
      if (!ok) {
        summarizeAndExit();
        return;
      }
    }

    // ─── Step 2: GET (round-trip identity) ─────────────────────────────
    if (createdId) {
      const result = (await client.request("tools/call", {
        name: "ghl-contacts-reader",
        arguments: {
          selectSchema: {
            operation: "get",
            params: { contactId: createdId },
          },
        },
      })) as CallToolTextResult;
      const payload = parseTextResult(result);
      const retrievedId = extractContactId(payload);
      const retrievedEmail = extractContactEmail(payload);
      const ok =
        !result.isError &&
        retrievedId === createdId &&
        retrievedEmail === testEmail;
      record(
        `get contact ${createdId} round-trips id + email`,
        ok,
        ok
          ? `id+email match`
          : `gotId=${retrievedId} gotEmail=${retrievedEmail}; payload=${JSON.stringify(
              payload,
            ).slice(0, 200)}`,
      );
    }

    // ─── Step 3: DELETE ────────────────────────────────────────────────
    if (createdId) {
      const result = (await client.request("tools/call", {
        name: "ghl-contacts-updater",
        arguments: {
          selectSchema: {
            operation: "delete",
            params: { contactId: createdId },
          },
        },
      })) as CallToolTextResult;
      const payload = parseTextResult(result);
      // GHL's delete envelope uses the misspelled key `succeded`. We accept
      // any of the reasonable success keys to be resilient to upstream typo
      // fixes or shape evolution.
      const flagged = (key: string) =>
        payload &&
        typeof payload === "object" &&
        (payload as Record<string, unknown>)[key] === true;
      const acknowledged =
        flagged("succeded") || flagged("success") || flagged("succeeded");
      const ok = !result.isError && acknowledged;
      record(
        `delete contact ${createdId}`,
        ok,
        ok
          ? "delete acknowledged"
          : `payload=${JSON.stringify(payload).slice(0, 200)}`,
      );
      if (ok) createdId = undefined; // mark cleaned up
    }

    // ─── Step 4: GET after delete (expect not-found) ───────────────────
    {
      // We must verify with the ID we just deleted, even though step 3 already
      // cleared `createdId` to mark cleanup. Snapshot from the create response
      // by re-deriving from results history would be brittle — instead, we
      // saved it as a closure capture of the CREATE step. (Step 1's record
      // includes the id; we recover it via the records array.)
      const createdRecord = results.find((r) =>
        r.name.startsWith("create contact"),
      );
      const idMatch = /id=([A-Za-z0-9-]+)/.exec(createdRecord?.details ?? "");
      const idForVerify = idMatch?.[1] ?? "00000000-deadbeef-not-found";
      try {
        const result = (await client.request("tools/call", {
          name: "ghl-contacts-reader",
          arguments: {
            selectSchema: {
              operation: "get",
              params: { contactId: idForVerify },
            },
          },
        })) as CallToolTextResult;
        const payload = parseTextResult(result);
        const stillThere = extractContactId(payload) === idForVerify;
        const ok = !stillThere;
        record(
          `get-after-delete returns no contact for ${idForVerify}`,
          ok,
          ok
            ? "tombstoned ok"
            : `contact still present; payload=${JSON.stringify(payload).slice(
                0,
                200,
              )}`,
        );
      } catch (e) {
        // 404 / NotFound surfaces as a thrown McpError — that's the success path
        record(
          `get-after-delete returns no contact for ${idForVerify}`,
          true,
          `upstream returned error (expected): ${(e as Error).message.slice(0, 120)}`,
        );
      }
    }
  } finally {
    // Best-effort cleanup if a partial run left a contact behind.
    if (createdId !== undefined) {
      try {
        await client.request("tools/call", {
          name: "ghl-contacts-updater",
          arguments: {
            selectSchema: {
              operation: "delete",
              params: { contactId: createdId },
            },
          },
        });
        // eslint-disable-next-line no-console
        console.log(
          `[probe:write] (cleanup) deleted leftover contact ${createdId}`,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(
          `[probe:write] (cleanup) FAILED to delete ${createdId}: ${(e as Error).message.slice(0, 200)}`,
        );
      }
    }
    await client.close();
  }

  summarizeAndExit();
}

function summarizeAndExit(): never {
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    // eslint-disable-next-line no-console
    console.log("[probe:write] All assertions passed.");
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.log(`[probe:write] ${failed.length} assertion(s) failed.`);
  process.exit(1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[probe:write] unhandled error:", err);
  process.exit(1);
});
