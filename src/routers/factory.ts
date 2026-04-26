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

      // 2. ajv schema validation
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

      // 3. Resolve op spec (operation guaranteed valid post-validation)
      const params = select?.params ?? {};
      const opSpec = operation ? ops[operation] : undefined;
      if (!opSpec) {
        throw methodNotFound(operation ?? "(missing)", validOps);
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
        const status = err.status ?? err.statusCode ?? 500;
        const message = err.message ?? String(e);
        throw upstreamError(config.category, status, message);
      }
    },
  };
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
