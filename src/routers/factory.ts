/**
 * Shared category-router factory — extracts the common router pattern so each
 * per-category file is a 5-line config, not a copy-pasted handler.
 *
 * Pattern (from L-SMO-003 + L-SMO-007):
 *   1. manifest lookup BEFORE ajv (helpful methodNotFound)
 *   2. ajv validation (shape errors → invalidParams)
 *   3. dispatch via injected callable (lets each category use its upstream
 *      class's executeTool / executeXTool method without coupling here)
 *   4. error mapping (McpError passes through; everything else →
 *      upstreamError with [upstream <category>] prefix)
 */

import { Ajv, type ErrorObject } from "ajv";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { invalidParams, methodNotFound, upstreamError } from "../errors.js";
import { buildRouterSchema } from "../schemas/build.js";
import type { OperationsMap } from "../operations.js";
import type { RouterDef } from "./types.js";

export interface CategoryRouterConfig {
  /** Tool name as registered with the host, e.g. "ghl-contacts-reader". */
  readonly name: string;
  /** Verbatim description (locked at design time per slice). */
  readonly description: string;
  /** Used as the `[upstream <category>]` prefix in error envelopes. */
  readonly category: string;
  /** Operations manifest slice (e.g., operations.contacts.reader). */
  readonly ops: OperationsMap;
  /** Comma-list from GHL_TOOL_DENY env var. Stripped from manifest at construction. */
  readonly deniedOps: readonly string[];
  /** Calls the upstream class's executeTool/executeXTool (decoupled per category). */
  readonly dispatch: (
    upstreamName: string,
    params: Record<string, unknown>,
  ) => Promise<unknown>;
  /**
   * Auto-injected params merged into `params` AFTER ajv validation, ONLY for
   * keys the user did not supply. Eliminates the "must pass locationId on
   * every call" friction (v1.1.1). Lazy thunks → reads env at call time.
   *
   * Example for location router:
   *   contextDefaults: { locationId: () => env.locationId }
   * Example for payments router:
   *   contextDefaults: {
   *     altId: () => env.locationId,
   *     altType: () => "location",
   *   }
   */
  readonly contextDefaults?: Readonly<Record<string, () => string>>;
  /**
   * Operations that always 403 with a location-scoped PIT (agency-only).
   * Pre-rejected at the router with a clear message before dispatch.
   * v1.1.1 fix.
   */
  readonly agencyOnlyOps?: readonly string[];
  /**
   * Optional per-op pre-validation hook. Throws an `McpError` to short-circuit
   * with a helpful message before the upstream API rejects with a cryptic 4xx.
   * Returns void on pass. Receives the merged params (after contextDefaults).
   */
  readonly preValidate?: (
    operation: string,
    params: Record<string, unknown>,
  ) => void;
}

interface SelectInput {
  selectSchema?: {
    operation?: string;
    params?: Record<string, unknown>;
  };
}

export function createCategoryRouter(config: CategoryRouterConfig): RouterDef {
  const ops = applyDeniedOps(config.ops, config.deniedOps);
  const inputSchema = buildRouterSchema(ops);
  const validOps = Object.keys(ops);

  const ajv = new Ajv({ allErrors: false, strict: false, useDefaults: true });
  const validate = ajv.compile(
    inputSchema as unknown as Record<string, unknown>,
  );

  return {
    name: config.name,
    description: config.description,
    inputSchema,
    handler: async (input: unknown) => {
      // 1. Manifest lookup BEFORE ajv (L-SMO-003 / L-SMO-007)
      const select = (input as SelectInput)?.selectSchema;
      const operation = select?.operation;
      if (typeof operation === "string" && !(operation in ops)) {
        throw methodNotFound(operation, validOps);
      }

      // 2. Pre-block agency-only ops BEFORE ajv (v1.1.4) — when an op is
      // agency-only, the schema-validation message ("must have required
      // property 'params'") would shadow the actually-actionable agency
      // diagnostic. Surface the agency message first; operators on PITs
      // can't call this op no matter what params they supply.
      if (
        typeof operation === "string" &&
        config.agencyOnlyOps?.includes(operation)
      ) {
        throw invalidParams(
          `Operation "${operation}" requires an agency OAuth token; PITs (Private Integration Tokens) are location-scoped and cannot call agency-level endpoints. ` +
            `For location-scoped equivalents see CLIENT-GUIDE.md → "Agency-only operations". ` +
            `Configure the location once via GHL_LOCATION_ID in .env and use the location-scoped read ops instead.`,
        );
      }

      // 3. ajv schema validation
      if (!validate(input)) {
        const err =
          (validate.errors?.[0] as ErrorObject | undefined) ?? undefined;
        const msg = err?.message ?? "validation failed";
        const path = err?.instancePath ?? "";
        const bad =
          err?.params && typeof err.params === "object"
            ? (err.params as Record<string, unknown>)["additionalProperty"]
            : undefined;
        const detail = bad ? `${msg}: "${bad}"` : msg;
        throw invalidParams(detail, path);
      }

      // 4. Resolve op spec (operation guaranteed valid post-validation)
      const userParams = select?.params ?? {};
      const opSpec = operation ? ops[operation] : undefined;
      if (!opSpec) {
        throw methodNotFound(operation ?? "(missing)", validOps);
      }

      // Operation is guaranteed string after step 1's manifest lookup, but
      // narrow explicitly to remove the cast (and to satisfy strict TS).
      if (typeof operation !== "string") {
        throw methodNotFound("(missing)", validOps);
      }

      // 5. Auto-inject context defaults from env (v1.1.1) — fills in
      // locationId / altId / altType when caller omitted them. User-supplied
      // values always win.
      //
      // Contract: contextDefaults values are string-only (locationId, altId,
      // altType). The "needs injection" check covers undefined / null / empty
      // string — anything else (including any non-empty caller value) is
      // treated as user-supplied and not overwritten. Errors from the getter
      // propagate intentionally — an invariant violation in env should not
      // be silently swallowed (env is validated at parseEnv).
      const params: Record<string, unknown> = { ...userParams };
      if (config.contextDefaults) {
        for (const [key, getter] of Object.entries(config.contextDefaults)) {
          const v = params[key];
          if (v === undefined || v === null || v === "") {
            params[key] = getter();
          }
        }
      }

      // 6. Per-op pre-validation hook (v1.1.1) — short-circuit common
      // upstream-cryptic errors with operator-friendly guidance.
      if (config.preValidate) {
        config.preValidate(operation, params);
      }

      // 4. Dispatch + error mapping (AC-2.3, AC-8.2)
      try {
        const result = await config.dispatch(opSpec.upstream, params);
        return {
          content: [{ type: "text" as const, text: safeStringify(result) }],
        };
      } catch (e) {
        if (e instanceof McpError) throw e;
        const err = e as {
          status?: number;
          statusCode?: number;
          message?: string;
        };
        const message = err.message ?? String(e);
        // Upstream's GHLApiClient.handleApiError throws plain Errors whose
        // message embeds `GHL API Error (NNN): ...` but does NOT set a
        // `status` field. Without parsing, we'd fall through to 500 and
        // the operator would see the misleading double-wrap
        // `[upstream X] 500 GHL API Error (401): Invalid JWT`. Extract
        // the real upstream status so the envelope reflects reality.
        const embedded = parseEmbeddedStatus(message);
        const status = err.status ?? err.statusCode ?? embedded ?? 500;
        const enriched = enrichForKnownStatuses(status, message);
        throw upstreamError(config.category, status, enriched);
      }
    },
  };
}

/**
 * Parse `GHL API Error (NNN): ...` (or nested forms like
 * `GHL API Error (500): GHL API Error (401): ...`) and return the
 * INNERMOST numeric status — that's the real upstream HTTP status.
 * Returns undefined if no embedded status is present.
 */
function parseEmbeddedStatus(message: string): number | undefined {
  const matches = [...message.matchAll(/GHL API Error \((\d+)\):/g)];
  if (matches.length === 0) return undefined;
  const last = matches[matches.length - 1];
  if (!last) return undefined;
  const captured = last[1];
  if (typeof captured !== "string") return undefined;
  const n = Number(captured);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Append actionable guidance to known auth-flavored failures. Triggered by
 * the May-2026 builder report: operators saw bare `Invalid JWT` with no
 * pointer to remediation. Surface the diagnostic op inline.
 */
function enrichForKnownStatuses(status: number, message: string): string {
  if (status === 401) {
    return (
      `${message} — bearer token rejected by GHL. ` +
      `Run \`ghl-toolkit-help { operation: "token-status" }\` to see token shape, expiry (if JWT), and a live verify result. ` +
      `Most common fix: rotate GHL_API_KEY (Private Integration Token in agency/location settings) and restart the MCP.`
    );
  }
  if (status === 403) {
    return (
      `${message} — token authenticates but lacks scope for this endpoint. ` +
      `Re-issue the PIT with the missing scope checked (see README "Required scopes"). ` +
      `Run \`ghl-toolkit-help { operation: "token-status" }\` to see decoded scopes if it's a JWT.`
    );
  }
  return message;
}

function applyDeniedOps(
  ops: OperationsMap,
  denied: readonly string[],
): OperationsMap {
  if (denied.length === 0) return ops;
  const out: Record<string, OperationsMap[string]> = {};
  for (const [k, v] of Object.entries(ops)) {
    if (!denied.includes(k)) out[k] = v;
  }
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
