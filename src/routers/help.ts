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

const HELP_DESCRIPTION =
  "Discovery tool for the SalesMfast Ops GoHighLevel facade. " +
  "Always call this first when working with an unfamiliar GHL category. " +
  "Operations: `list-categories` (lists all active categories with router names), " +
  "`list-operations { category }` (lists every operation in a category with its JSON schema), " +
  "`describe-operation { router, operation }` (returns full input schema and a worked example for one operation). " +
  "Active categories register their routers under `ghl-{category}-reader` (read-only, idempotent, safe to auto-approve) " +
  "and `ghl-{category}-updater` (write, mutating, gate behind explicit confirmation). " +
  "Currently shipping ~35 facade tools across 18 categories — full upstream coverage: contacts, conversations, calendars, opportunities, location, workflow, email, social-media, survey, invoice, products, payments, store, blog, media, custom-field-v2, object, association. " +
  'Auto-inject (v1.1.1+): `locationId` is auto-injected from `GHL_LOCATION_ID` for location/products routers; `altId`+`altType: "location"` for payments/store. Caller-supplied values override. ' +
  "Pre-blocks (v1.1.1+): `ghl-location-reader.search` is agency-only and rejected under PIT auth; `ghl-custom-field-v2-reader.get-by-object-key` rejects SYSTEM_DEFINED keys (`contact`, `opportunity`, `business`) — use `ghl-location-reader.list-custom-fields` for contacts or `ghl-opportunities-reader.search` for opportunity custom fields. " +
  "The set of registered routers is controlled by the `GHL_TOOL_CATEGORIES` and `GHL_TOOL_DENY` env vars at boot — " +
  "call `list-categories` to see the active set in the running server.";

const VALID_HELP_OPS = [
  "list-categories",
  "list-operations",
  "describe-operation",
] as const;

interface HelpSelect {
  operation?: string;
  params?: Record<string, unknown>;
}

export function createHelp(
  activeCategories: readonly CategoryName[],
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
