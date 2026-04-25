/**
 * ghl-calendars-reader router.
 *
 * Read-only access to GoHighLevel calendars. 6 operations, all idempotent.
 * Schema is generated from the operations manifest; validation uses ajv;
 * dispatch is a single call into upstream.calendarTools.executeTool().
 *
 * Description string is verbatim from the plan's §Verbatim strings —
 * if it drifts, the help-tool description (which lists routers) and the
 * probe assertion that grep this string can fall out of sync.
 */

// ajv 8 exports both default and named `Ajv`; the named import is unambiguous
// for NodeNext ESM consumers (no synthetic-default interop dance needed).
import { Ajv, type ErrorObject } from "ajv";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { invalidParams, methodNotFound, upstreamError } from "../errors.js";
import { buildRouterSchema, type JsonSchema } from "../schemas/build.js";
import { operations, type OperationsMap } from "../operations.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const CALENDARS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel calendars (groups, calendars, events, free slots, appointments). " +
  "Operations: `list-groups`, `list`, `get`, `list-events`, `list-free-slots`, `get-appointment`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-calendars-reader", operation: "<name>" } }` for the full schema.';

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

interface SelectInput {
  selectSchema?: {
    operation?: string;
    params?: Record<string, unknown>;
  };
}

export function createCalendarsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  const ops = applyDeniedOps(operations.calendars.reader, deniedOps);
  const inputSchema = buildRouterSchema(ops);
  const validOps = Object.keys(ops);

  // ajv validates the discriminated union via oneOf. We compile against the
  // full schema once at construction time — runtime hot path is just a call.
  const ajv = new Ajv({ allErrors: false, strict: false, useDefaults: true });
  // ajv's compile signature is permissive; cast to its expected type.
  const validate = ajv.compile(
    inputSchema as unknown as Record<string, unknown>,
  );

  return {
    name: "ghl-calendars-reader",
    description: CALENDARS_READER_DESCRIPTION,
    inputSchema,
    handler: async (input: unknown) => {
      // 1. Manifest lookup FIRST (AC-4.3, AC-8.3) — runs before schema
      //    validation so a typo'd operation gets a helpful "Valid operations:
      //    list-groups, list, get, ..." error instead of a generic schema
      //    "must be equal to constant" rejection from the oneOf discriminator.
      const select = (input as SelectInput)?.selectSchema;
      const operation = select?.operation;
      if (typeof operation === "string" && !(operation in ops)) {
        throw methodNotFound(operation, validOps);
      }

      // 2. Schema validation (AC-4.1, AC-4.2, AC-8.1) — catches missing
      //    operation, bad params shape, additionalProperties, etc.
      if (!validate(input)) {
        const err =
          (validate.errors?.[0] as ErrorObject | undefined) ?? undefined;
        const msg = err?.message ?? "validation failed";
        const path = err?.instancePath ?? "";
        // ajv reports additionalProperties as the parent path; surface the bad key
        const bad =
          err?.params && typeof err.params === "object"
            ? (err.params as Record<string, unknown>)["additionalProperty"]
            : undefined;
        const detail = bad ? `${msg}: "${bad}"` : msg;
        throw invalidParams(detail, path);
      }

      // 3. Re-resolve after validation (operation is guaranteed valid here)
      const params = select?.params ?? {};
      const opSpec = operation ? ops[operation] : undefined;
      if (!opSpec) {
        // Defensive — should be unreachable post-validation
        throw methodNotFound(operation ?? "(missing)", validOps);
      }

      // 3. Dispatch to upstream (AC-2.3) with error mapping (AC-8.2)
      try {
        const result = await upstream.calendarTools.executeTool(
          opSpec.upstream,
          params,
        );
        return {
          content: [{ type: "text" as const, text: safeStringify(result) }],
        };
      } catch (e) {
        // McpError thrown by validation/lookup above already propagated;
        // here we only see exceptions from the upstream call itself.
        if (e instanceof McpError) throw e;
        const err = e as {
          status?: number;
          statusCode?: number;
          message?: string;
        };
        const status = err.status ?? err.statusCode ?? 500;
        const message = err.message ?? String(e);
        throw upstreamError("calendars", status, message);
      }
    },
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Re-export for tests / external consumers that need the schema type
export type { JsonSchema };
