/**
 * Auto-patch operations.ts to declare upstream-required fields as
 * `required: true` in the manifest. Closes the BUG-B class of findings
 * from `scripts/audit-manifest.ts`: ops where the manifest declares
 * `params: []` (or missing requireds), ajv passes, and the upstream
 * rejects with a cryptic 422.
 *
 * Strategy:
 *   1. Index each upstream tool's `required: string[]` from its
 *      `getToolDefinitions()` / `getTools()` response.
 *   2. For every operation in `operations`, look up the upstream spec.
 *   3. For every upstream-required prop the manifest doesn't already
 *      declare required (and isn't auto-injected by the router), emit
 *      a synthetic ParamDescriptor with required: true and a generic
 *      description sourced from the upstream's property schema.
 *   4. Read operations.ts as text, find each op block, and splice the
 *      new required descriptors into the existing `params: [...]` array
 *      at the top (so they appear first, ahead of optional params).
 *
 * Idempotent: if a required name is already in the manifest's params,
 * skip it. Safe to re-run after upstream changes — only new gaps get
 * patched.
 *
 * NOTE: this script does NOT rewrite descriptions of existing params,
 * touch additionalProperties, or reformat unrelated lines. It only
 * inserts new required-param blocks.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { GHLApiClient } from "ghl-mcp-upstream/dist/clients/ghl-api-client.js";
import { CalendarTools } from "ghl-mcp-upstream/dist/tools/calendar-tools.js";
import { ContactTools } from "ghl-mcp-upstream/dist/tools/contact-tools.js";
import { ConversationTools } from "ghl-mcp-upstream/dist/tools/conversation-tools.js";
import { LocationTools } from "ghl-mcp-upstream/dist/tools/location-tools.js";
import { OpportunityTools } from "ghl-mcp-upstream/dist/tools/opportunity-tools.js";
import { WorkflowTools } from "ghl-mcp-upstream/dist/tools/workflow-tools.js";
import { SocialMediaTools } from "ghl-mcp-upstream/dist/tools/social-media-tools.js";
import { EmailTools } from "ghl-mcp-upstream/dist/tools/email-tools.js";
import { EmailISVTools } from "ghl-mcp-upstream/dist/tools/email-isv-tools.js";
import { SurveyTools } from "ghl-mcp-upstream/dist/tools/survey-tools.js";
import { InvoicesTools } from "ghl-mcp-upstream/dist/tools/invoices-tools.js";
import { ProductsTools } from "ghl-mcp-upstream/dist/tools/products-tools.js";
import { PaymentsTools } from "ghl-mcp-upstream/dist/tools/payments-tools.js";
import { StoreTools } from "ghl-mcp-upstream/dist/tools/store-tools.js";
import { BlogTools } from "ghl-mcp-upstream/dist/tools/blog-tools.js";
import { MediaTools } from "ghl-mcp-upstream/dist/tools/media-tools.js";
import { CustomFieldV2Tools } from "ghl-mcp-upstream/dist/tools/custom-field-v2-tools.js";
import { ObjectTools } from "ghl-mcp-upstream/dist/tools/object-tools.js";
import { AssociationTools } from "ghl-mcp-upstream/dist/tools/association-tools.js";

import { operations, type CategoryName } from "../src/operations.js";

interface PropSchema {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: { type?: string };
  default?: unknown;
}

interface UpstreamSchema {
  name: string;
  properties: Record<string, PropSchema>;
  required: string[];
}

const AUTO_INJECTED = new Set(["locationId", "altId", "altType", "companyId"]);
const UPSTREAM_PROVIDES = new Set(["locationId"]);
const SENTINELS = /(_DIRECT_AXIOS|_ALWAYS_403|_PLATFORM_[a-z-]+)$/;

function dummy(): GHLApiClient {
  return new GHLApiClient({
    accessToken: "x",
    baseUrl: "https://services.leadconnectorhq.com",
    version: "2021-07-28",
    locationId: "x",
  });
}

function indexUpstream(): Map<string, UpstreamSchema> {
  const c = dummy();
  const sources: Array<unknown> = [
    new CalendarTools(c),
    new ContactTools(c),
    new ConversationTools(c),
    new LocationTools(c),
    new OpportunityTools(c),
    new WorkflowTools(c),
    new SocialMediaTools(c),
    new EmailTools(c),
    new EmailISVTools(c),
    new SurveyTools(c),
    new InvoicesTools(c),
    new ProductsTools(c),
    new PaymentsTools(c),
    new StoreTools(c),
    new BlogTools(c),
    new MediaTools(c),
    new CustomFieldV2Tools(c),
    new ObjectTools(c),
    new AssociationTools(c),
  ];
  const map = new Map<string, UpstreamSchema>();
  for (const s of sources) {
    const obj = s as Record<string, unknown>;
    let defs: unknown[] | undefined;
    for (const fn of ["getToolDefinitions", "getTools"] as const) {
      const m = obj[fn];
      if (typeof m === "function") {
        try {
          defs = (m as () => unknown[]).call(s);
          if (Array.isArray(defs)) break;
        } catch {
          /* */
        }
      }
    }
    if (!Array.isArray(defs)) continue;
    for (const def of defs) {
      const t = def as {
        name?: string;
        inputSchema?: {
          properties?: Record<string, PropSchema>;
          required?: string[];
        };
      };
      if (typeof t.name !== "string") continue;
      map.set(t.name, {
        name: t.name,
        properties: t.inputSchema?.properties ?? {},
        required: Array.isArray(t.inputSchema?.required)
          ? (t.inputSchema?.required as string[])
          : [],
      });
    }
  }
  return map;
}

interface Patch {
  router: string;
  op: string;
  upstreamName: string;
  newParams: string; // formatted TS lines to insert
}

function paramType(p: PropSchema): string {
  if (p.type === "boolean") return "boolean";
  if (p.type === "number" || p.type === "integer") return "number";
  if (p.type === "array") return "array";
  return "string";
}

function escTs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildParamBlock(name: string, p: PropSchema, indent: string): string {
  const desc =
    p.description?.trim() ||
    `Required by upstream — see GHL API docs for "${name}".`;
  const lines: string[] = [];
  lines.push(`${indent}{`);
  lines.push(`${indent}  name: "${name}",`);
  lines.push(`${indent}  type: "${paramType(p)}",`);
  if (p.type === "array") {
    const itemType = p.items?.type === "number" ? "number" : "string";
    lines.push(`${indent}  items: { type: "${itemType}" },`);
  }
  lines.push(`${indent}  required: true,`);
  lines.push(`${indent}  description: "${escTs(desc)}",`);
  lines.push(`${indent}},`);
  return lines.join("\n");
}

function audit(): Patch[] {
  const upstream = indexUpstream();
  const patches: Patch[] = [];

  for (const cat of Object.keys(operations) as CategoryName[]) {
    for (const dir of ["reader", "updater"] as const) {
      const ops = operations[cat][dir];
      const router = `ghl-${cat}-${dir}`;
      for (const [opName, spec] of Object.entries(ops)) {
        if (SENTINELS.test(spec.upstream)) continue;
        const u = upstream.get(spec.upstream);
        if (!u) continue;

        const declared = new Set(spec.params.map((p) => p.name));
        const missingReqs: string[] = [];
        for (const r of u.required) {
          if (declared.has(r)) continue;
          if (UPSTREAM_PROVIDES.has(r)) continue;
          if (AUTO_INJECTED.has(r)) continue;
          const propSpec = u.properties[r];
          if (!propSpec) continue; // require listed but no schema → skip
          // If upstream declares a default, the underlying client substitutes
          // it when the caller omits — promoting it to required: true would
          // make ajv reject calls that the upstream would otherwise accept
          // (regression caught by probe on list_invoices: limit=10 default).
          if (propSpec.default !== undefined) continue;
          missingReqs.push(r);
        }
        if (missingReqs.length === 0) continue;

        const blocks = missingReqs
          .map((r) =>
            buildParamBlock(r, u.properties[r] as PropSchema, "          "),
          )
          .join("\n");
        patches.push({
          router,
          op: opName,
          upstreamName: spec.upstream,
          newParams: blocks,
        });
      }
    }
  }
  return patches;
}

function applyPatches(patches: Patch[]): number {
  const path = new URL("../src/operations.ts", import.meta.url).pathname;
  let text = readFileSync(path, "utf8");
  let applied = 0;

  // Disambiguate by `upstream: "<exact-name>"` inside the same block. The
  // regex matches:
  //   <op-key>: { …upstream: "<upstream-name>"…params: [
  // op-key may be quoted (`"create-post":`) or JS shorthand (`create:`).
  // The body between `{` and `params: [` is matched non-greedily AND must
  // contain `upstream: "<upstream-name>"` — this guarantees we patch the
  // exact (op, upstream) pair, never a same-named op in another category.
  for (const patch of patches) {
    const opKeyAlt = isValidIdentifier(patch.op)
      ? `(?:"${escapeRegex(patch.op)}"|${escapeRegex(patch.op)})`
      : `"${escapeRegex(patch.op)}"`;
    const re = new RegExp(
      `(${opKeyAlt}:\\s*\\{[^}]*?upstream:\\s*"${escapeRegex(patch.upstreamName)}"[\\s\\S]*?params:\\s*\\[)`,
    );
    const before = text;
    text = text.replace(re, (match) => {
      applied++;
      return `${match}\n${patch.newParams}`;
    });
    if (before === text) {
      console.warn(
        `[sync-required] WARN: could not locate block for ${patch.router} ${patch.op} (upstream=${patch.upstreamName})`,
      );
    }
  }

  writeFileSync(path, text, "utf8");
  return applied;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidIdentifier(s: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
}

function main(): void {
  const patches = audit();
  if (patches.length === 0) {
    console.log("[sync-required] No missing requireds — manifest is in sync.");
    return;
  }
  console.log(`[sync-required] Found ${patches.length} ops missing requireds:`);
  for (const p of patches) {
    console.log(`  ${p.router} ${p.op}`);
  }
  console.log("[sync-required] Applying patches...");
  const applied = applyPatches(patches);
  console.log(
    `[sync-required] Applied ${applied} patch insertions. Run \`npm run build\` to regenerate docs.`,
  );
}

main();
