/**
 * Manifest-vs-upstream audit (v1.1.4 follow-up).
 *
 * Cross-checks every operation in src/operations.ts against the upstream
 * tool class's `getToolDefinitions()` schema and reports drift. Driven by
 * the May-2026 audit which surfaced two manifest/upstream mismatches
 * (`list-events` startDate→startTime, `get-schema` schemaId→key) that
 * presented as cryptic ajv "must be equal to constant" errors. There are
 * almost certainly more — this script finds them all in one pass.
 *
 * Categories of finding (severity in [brackets]):
 *   [BUG-A] Manifest declares a required param the upstream does not have
 *           → call would always fail with "unknown property" upstream
 *   [BUG-B] Upstream requires a param the manifest does not declare AND
 *           the router doesn't auto-inject it
 *           → ajv passes, upstream rejects with cryptic error
 *   [BUG-C] Manifest declares required:true for a param the upstream
 *           treats as optional. Not a bug, but unnecessarily strict.
 *   [WARN]  Manifest declares a param under a name that's NOT in the
 *           upstream's properties at all (likely a rename / typo)
 *
 * The `additionalProperties: true` flag silences ajv but does NOT silence
 * the upstream — drift still bites. Findings under [BUG-A]/[BUG-B] are
 * the high-value ones; [BUG-C]/[WARN] are quality-of-life polish.
 */

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

interface UpstreamSchema {
  name: string;
  properties: Record<string, { default?: unknown } & Record<string, unknown>>;
  required: string[];
}

// Auto-injected at the router layer (factory.ts contextDefaults). The audit
// must NOT flag a missing-required-from-manifest finding when the router
// already supplies it transparently.
const AUTO_INJECTED_BY_ROUTER = new Set([
  "locationId",
  "altId",
  "altType",
  "companyId",
]);

// Some upstream tool wrappers ALWAYS receive a fixed value from the upstream
// implementation regardless of caller params (e.g., the upstream pulls
// `locationId` from its own config) — the schema may declare them required,
// but they are not the caller's responsibility.
const UPSTREAM_ALWAYS_PROVIDES = new Set(["locationId"]);

// Sentinels we set in operations.ts when the upstream's tool wrapper is
// broken, absent, or needs router-side discriminator injection. These have
// no direct upstream definition to diff against — skip them.
const DIRECT_AXIOS_SENTINELS = /(_DIRECT_AXIOS|_ALWAYS_403|_PLATFORM_[a-z-]+)$/;

function dummyClient(): GHLApiClient {
  return new GHLApiClient({
    accessToken: "dummy",
    baseUrl: "https://services.leadconnectorhq.com",
    version: "2021-07-28",
    locationId: "dummy",
  });
}

function indexUpstream(): Map<string, UpstreamSchema> {
  const c = dummyClient();
  // Some upstream classes expose `getTools()`, others `getToolDefinitions()`
  // — both return the same `Tool[]` shape. Try both per instance.
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
          /* continue */
        }
      }
    }
    if (!Array.isArray(defs)) continue;
    for (const def of defs) {
      const t = def as {
        name?: string;
        inputSchema?: {
          properties?: Record<string, unknown>;
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

interface Finding {
  severity: "BUG-A" | "BUG-B" | "BUG-C" | "WARN";
  router: string;
  op: string;
  upstreamName: string;
  detail: string;
}

function audit(): Finding[] {
  const upstream = indexUpstream();
  const findings: Finding[] = [];

  for (const cat of Object.keys(operations) as CategoryName[]) {
    for (const dir of ["reader", "updater"] as const) {
      const ops = operations[cat][dir];
      const router = `ghl-${cat}-${dir}`;
      for (const [opName, spec] of Object.entries(ops)) {
        const upstreamName = spec.upstream;
        if (DIRECT_AXIOS_SENTINELS.test(upstreamName)) continue;

        const u = upstream.get(upstreamName);
        if (!u) {
          findings.push({
            severity: "WARN",
            router,
            op: opName,
            upstreamName,
            detail: `upstream tool "${upstreamName}" not found in any tool class — likely a typo or stale name in operations.ts`,
          });
          continue;
        }

        const manifestRequired = new Set(
          spec.params.filter((p) => p.required).map((p) => p.name),
        );
        const manifestAll = new Set(spec.params.map((p) => p.name));
        const upstreamRequired = new Set(u.required);
        const upstreamAll = new Set(Object.keys(u.properties));

        // BUG-B: upstream requires X, manifest doesn't declare it (and not
        // auto-injected). Skip when the upstream property declares its own
        // `default:` value — the upstream client substitutes the default
        // when the caller omits, so promoting it to manifest required would
        // make ajv reject calls the upstream would otherwise accept.
        for (const req of upstreamRequired) {
          if (manifestRequired.has(req)) continue;
          if (UPSTREAM_ALWAYS_PROVIDES.has(req)) continue;
          if (AUTO_INJECTED_BY_ROUTER.has(req)) continue;
          const propSpec = u.properties[req] as
            | { default?: unknown }
            | undefined;
          if (propSpec && propSpec.default !== undefined) continue;
          findings.push({
            severity: "BUG-B",
            router,
            op: opName,
            upstreamName,
            detail: `upstream requires "${req}" — manifest does not declare it required (and router does not auto-inject). Caller will see ajv pass then upstream reject with cryptic error.`,
          });
        }

        // BUG-A: manifest declares a required param the upstream doesn't have
        for (const req of manifestRequired) {
          if (upstreamAll.has(req)) continue;
          findings.push({
            severity: "BUG-A",
            router,
            op: opName,
            upstreamName,
            detail: `manifest requires "${req}" but upstream tool has no such property. This call ALWAYS fails (or silently drops the value).`,
          });
        }

        // WARN: manifest declares a param (any required-ness) by a name not in upstream's properties
        for (const name of manifestAll) {
          if (upstreamAll.has(name)) continue;
          if (manifestRequired.has(name)) continue; // covered by BUG-A
          findings.push({
            severity: "WARN",
            router,
            op: opName,
            upstreamName,
            detail: `manifest declares optional "${name}" but upstream has no such property — likely renamed/removed. Value will be silently dropped.`,
          });
        }

        // BUG-C: required: true in manifest but optional in upstream
        for (const req of manifestRequired) {
          if (upstreamAll.has(req) && !upstreamRequired.has(req)) {
            findings.push({
              severity: "BUG-C",
              router,
              op: opName,
              upstreamName,
              detail: `manifest marks "${req}" required but upstream lists it optional — unnecessarily strict; callers can't omit even when GHL would accept.`,
            });
          }
        }
      }
    }
  }
  return findings;
}

function main(): void {
  const findings = audit();
  const bySeverity = new Map<Finding["severity"], Finding[]>();
  for (const f of findings) {
    const arr = bySeverity.get(f.severity) ?? [];
    arr.push(f);
    bySeverity.set(f.severity, arr);
  }
  const order: Finding["severity"][] = ["BUG-A", "BUG-B", "WARN", "BUG-C"];
  for (const sev of order) {
    const arr = bySeverity.get(sev) ?? [];
    if (arr.length === 0) continue;
    console.log(`\n=== ${sev} (${arr.length}) ===`);
    for (const f of arr) {
      console.log(`  ${f.router} ${f.op} → ${f.upstreamName}\n    ${f.detail}`);
    }
  }
  console.log(
    `\nTotal: ${findings.length} (BUG-A: ${(bySeverity.get("BUG-A") ?? []).length}, BUG-B: ${(bySeverity.get("BUG-B") ?? []).length}, WARN: ${(bySeverity.get("WARN") ?? []).length}, BUG-C: ${(bySeverity.get("BUG-C") ?? []).length})`,
  );
}

main();
