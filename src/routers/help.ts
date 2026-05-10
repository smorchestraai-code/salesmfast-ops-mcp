/**
 * ghl-toolkit-help — discovery router.
 *
 * Three operations:
 *   - list-categories            → string[] of active category names
 *   - list-operations { cat }    → reader+updater op listings for that category
 *   - describe-operation { ... } → full schema + worked example for one op
 *
 * The description string is locked in the plan's §Verbatim strings (≥600
 * chars, lists every active router) — AC-3.4.
 */

import {
  buildHelpSchema,
  buildRouterSchema,
  type JsonSchema,
} from "../schemas/build.js";
import {
  ALL_CATEGORIES,
  operations,
  type CategoryName,
  type OperationsMap,
} from "../operations.js";
import { invalidParams, methodNotFound } from "../errors.js";
import type { RouterDef } from "./types.js";
import type { ParsedEnv } from "../env.js";
import type { Upstream } from "../upstream.js";

const HELP_DESCRIPTION =
  "Discovery + diagnostics tool for the SalesMfast Ops GoHighLevel facade. " +
  "Always call this first when working with an unfamiliar GHL category. " +
  "Operations: `list-categories` (lists all active categories with router names), " +
  "`list-operations { category }` (lists every operation in a category with its JSON schema), " +
  "`describe-operation { router, operation }` (returns full input schema and a worked example for one operation), " +
  "`token-status` (decodes the bearer token, surfaces iat/exp/scopes if it's a JWT, runs a lightweight read against `/locations/{id}` to confirm auth works — call this BEFORE filing 401 bug reports). " +
  "Active categories register their routers under `ghl-{category}-reader` (read-only, idempotent, safe to auto-approve) " +
  "and `ghl-{category}-updater` (write, mutating, gate behind explicit confirmation). " +
  "Full upstream coverage plus a forms reader: contacts, conversations, calendars, opportunities, location, workflow, email, social-media, survey, forms, invoice, products, payments, store, blog, media, custom-field-v2, object, association. " +
  'Auto-inject (v1.1.1+): `locationId` is auto-injected from `GHL_LOCATION_ID` for location/products routers; `altId`+`altType: "location"` for payments/store. Caller-supplied values override. ' +
  "Pre-blocks (v1.1.1+): `ghl-location-reader.search` is agency-only and rejected under PIT auth; `ghl-custom-field-v2-reader.get-by-object-key` rejects SYSTEM_DEFINED keys (`contact`, `opportunity`, `business`) — use `ghl-location-reader.list-custom-fields` for contacts or `ghl-opportunities-reader.search` for opportunity custom fields. " +
  "The set of registered routers is controlled by the `GHL_TOOL_CATEGORIES` and `GHL_TOOL_DENY` env vars at boot — " +
  "call `list-categories` to see the active set in the running server.";

const VALID_HELP_OPS = [
  "list-categories",
  "list-operations",
  "describe-operation",
  "token-status",
] as const;

interface HelpSelect {
  operation?: string;
  params?: Record<string, unknown>;
}

export function createHelp(
  activeCategories: readonly CategoryName[],
  env: ParsedEnv,
  upstream: Upstream,
): RouterDef {
  const inputSchema = buildHelpSchema(activeCategories);
  return {
    name: "ghl-toolkit-help",
    description: HELP_DESCRIPTION,
    inputSchema,
    handler: async (input: unknown) => {
      const select = (input as { selectSchema?: HelpSelect }).selectSchema;
      const operation = select?.operation;
      if (!operation) {
        throw invalidParams(
          "selectSchema.operation is required",
          "/selectSchema/operation",
        );
      }

      switch (operation) {
        case "list-categories":
          return wrap([...activeCategories]);

        case "token-status":
          return wrap(await tokenStatus(env, upstream));

        case "list-operations": {
          const category = select?.params?.["category"];
          if (typeof category !== "string") {
            throw invalidParams(
              "category is required and must be a string",
              "/selectSchema/params/category",
            );
          }
          if (!ALL_CATEGORIES.includes(category as CategoryName)) {
            throw invalidParams(
              `unknown category "${category}"`,
              "/selectSchema/params/category",
            );
          }
          if (!activeCategories.includes(category as CategoryName)) {
            throw invalidParams(
              `category "${category}" is not active in this build`,
              "/selectSchema/params/category",
            );
          }
          const cat = category as CategoryName;
          return wrap({
            category: cat,
            reader: {
              router: `ghl-${cat}-reader`,
              operations: serializeOps(operations[cat].reader),
            },
            updater: {
              router: `ghl-${cat}-updater`,
              operations: serializeOps(operations[cat].updater),
            },
          });
        }

        case "describe-operation": {
          const router = select?.params?.["router"];
          const op = select?.params?.["operation"];
          if (typeof router !== "string" || typeof op !== "string") {
            throw invalidParams("router and operation are required strings");
          }
          const m = /^ghl-(.+)-(reader|updater)$/.exec(router);
          if (!m || m.length < 3) {
            throw invalidParams(
              `router "${router}" not in form ghl-{category}-{reader|updater}`,
              "/selectSchema/params/router",
            );
          }
          const cat = m[1] as CategoryName;
          const dir = m[2] as "reader" | "updater";
          if (!ALL_CATEGORIES.includes(cat)) {
            throw invalidParams(
              `unknown category "${cat}"`,
              "/selectSchema/params/router",
            );
          }
          if (!activeCategories.includes(cat)) {
            throw invalidParams(
              `category "${cat}" is not active in this build`,
              "/selectSchema/params/router",
            );
          }
          const ops = operations[cat][dir];
          const opSpec = ops[op];
          if (!opSpec) {
            throw methodNotFound(op, Object.keys(ops));
          }
          return wrap({
            router,
            operation: op,
            description: opSpec.description,
            upstream: opSpec.upstream,
            inputSchema: buildRouterSchema({ [op]: opSpec }),
          });
        }

        default:
          throw methodNotFound(operation, [...VALID_HELP_OPS]);
      }
    },
  };
}

function wrap(payload: unknown): {
  content: ReadonlyArray<{ type: "text"; text: string }>;
} {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function serializeOps(ops: OperationsMap): Array<{
  name: string;
  description: string;
  upstream: string;
  schema: JsonSchema;
}> {
  return Object.entries(ops).map(([name, spec]) => ({
    name,
    description: spec.description,
    upstream: spec.upstream,
    schema: buildRouterSchema({ [name]: spec }),
  }));
}

/**
 * v1.1.4 — token diagnostic.
 *
 * Triggered by the May-2026 "Invalid JWT" report (see Reported-bugs/
 * salesmfast_builder.md). The MCP holds a static bearer token; we cannot
 * refresh it (PITs don't refresh; OAuth refresh isn't wired). What we CAN
 * do cheaply: surface the token's shape, expiry (if it's a JWT), and a
 * one-shot live read against `/locations/{id}` to confirm whether the
 * token actually authenticates right now. Operators should call this
 * BEFORE filing an "MCP is broken" ticket.
 */
async function tokenStatus(
  env: ParsedEnv,
  upstream: Upstream,
): Promise<Record<string, unknown>> {
  const masked =
    env.apiKey.length <= 12
      ? "***"
      : `${env.apiKey.slice(0, 6)}...${env.apiKey.slice(-4)}`;

  const tokenShape = classifyToken(env.apiKey);
  const decoded = tokenShape === "jwt" ? decodeJwtPayload(env.apiKey) : null;

  // Live verify — single GET against a known-cheap endpoint. Captures the
  // exact upstream error envelope so the operator can see whether it's a
  // 401 (auth), 403 (scope), or something else.
  let verify: Record<string, unknown>;
  try {
    const response = await upstream.client.axiosInstance.get(
      `/locations/${env.locationId}`,
    );
    verify = {
      ok: true,
      status: response.status,
      message: "Live read against /locations/{id} succeeded — token is valid.",
    };
  } catch (e) {
    const err = e as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = err.response?.status;
    const upstreamMsg =
      err.response?.data?.message ?? err.message ?? "(no message)";
    verify = {
      ok: false,
      status: status ?? null,
      message: upstreamMsg,
      hint: hintFor(status, tokenShape),
    };
  }

  return {
    tokenShape,
    tokenMasked: masked,
    locationId: env.locationId,
    baseUrl: env.baseUrl,
    jwt: decoded,
    verify,
    notes: [
      "This MCP does NOT auto-refresh tokens. PITs are static (no expiry); OAuth refresh is not wired.",
      "If `verify.ok: false` with status 401: rotate the token in GHL (Private Integration Token in agency/location settings) and restart the MCP.",
      "If status 403 with a specific scope mentioned: the token lacks that scope — re-issue with the missing scope checked.",
    ],
  };
}

type TokenShape = "jwt" | "pit" | "unknown";

function classifyToken(token: string): TokenShape {
  if (!token) return "unknown";
  // JWTs always have exactly 2 dots; PITs are opaque random strings without dots.
  const parts = token.split(".");
  if (parts.length === 3 && parts.every((p) => p.length > 0)) return "jwt";
  if (parts.length === 1 && token.length > 20) return "pit";
  return "unknown";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    // base64url → base64
    const b64 =
      part.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (part.length % 4)) % 4);
    const json = Buffer.from(b64, "base64").toString("utf8");
    const obj = JSON.parse(json) as Record<string, unknown>;
    // Surface the keys operators care about, plus full payload at the end.
    const out: Record<string, unknown> = {};
    if (obj["iat"] !== undefined) {
      out["iat"] = obj["iat"];
      const iat = Number(obj["iat"]);
      if (!Number.isNaN(iat))
        out["iat_iso"] = new Date(iat * 1000).toISOString();
    }
    if (obj["exp"] !== undefined) {
      out["exp"] = obj["exp"];
      const exp = Number(obj["exp"]);
      if (!Number.isNaN(exp)) {
        out["exp_iso"] = new Date(exp * 1000).toISOString();
        out["expired"] = exp * 1000 < Date.now();
        out["expires_in_seconds"] = Math.round(
          (exp * 1000 - Date.now()) / 1000,
        );
      }
    }
    if (obj["authClass"] !== undefined) out["authClass"] = obj["authClass"];
    if (obj["authClassId"] !== undefined)
      out["authClassId"] = obj["authClassId"];
    if (obj["source"] !== undefined) out["source"] = obj["source"];
    if (obj["sourceId"] !== undefined) out["sourceId"] = obj["sourceId"];
    if (obj["oauthMeta"] !== undefined) out["oauthMeta"] = obj["oauthMeta"];
    out["raw"] = obj;
    return out;
  } catch {
    return null;
  }
}

function hintFor(status: number | undefined, shape: TokenShape): string {
  if (status === 401) {
    return shape === "pit"
      ? "PIT was rejected. Either it was rotated/revoked in GHL, or it was minted for a different location/agency. Re-issue from GHL settings → Integrations → Private Integrations and update GHL_API_KEY in .env, then restart."
      : "JWT was rejected. Check `jwt.expired` above; if true, mint a fresh one. If not expired, the token may have been revoked or never had the required scopes.";
  }
  if (status === 403) {
    return "Authentication succeeded but the token lacks scope for this endpoint. Re-issue with broader scopes (contacts.write, calendars.events.write, emails.template.write, social-media.account.read, etc. — see README required-scopes section).";
  }
  if (status === undefined) {
    return "Network or transport error — token state inconclusive. Check GHL_BASE_URL and connectivity.";
  }
  return `Unexpected status ${status}. See verify.message for the upstream payload.`;
}
