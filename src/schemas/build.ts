/**
 * Schema builder — generates the MCP `inputSchema` (selectSchema oneOf shape)
 * from the operations manifest. Pure, deterministic.
 *
 * Output shape (BRD section 6.1):
 *   {
 *     type: "object",
 *     required: ["selectSchema"],
 *     properties: {
 *       selectSchema: { oneOf: [<one entry per operation>] }
 *     }
 *   }
 */

import type { OperationsMap, ParamDescriptor } from "../operations.js";

export interface JsonSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  oneOf?: JsonSchema[];
  const?: unknown;
  enum?: readonly unknown[];
  items?: JsonSchema;
  description?: string;
  default?: unknown;
  additionalProperties?: boolean | JsonSchema;
}

function paramSchema(p: ParamDescriptor): JsonSchema {
  if (p.type === "array") {
    return {
      type: "array",
      items: { type: p.items?.type ?? "string" },
      description: p.description,
    };
  }
  const prop: JsonSchema = { type: p.type, description: p.description };
  if (p.default !== undefined) prop.default = p.default;
  return prop;
}

function paramsSchema(
  params: readonly ParamDescriptor[],
  additionalProperties: boolean,
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const p of params) {
    properties[p.name] = paramSchema(p);
    if (p.required) required.push(p.name);
  }
  const schema: JsonSchema = {
    type: "object",
    additionalProperties,
    properties,
  };
  if (required.length > 0) schema.required = required;
  return schema;
}

/**
 * Build the per-router `inputSchema` (one oneOf entry per operation).
 *
 * Per-op `additionalProperties: true` (set in operations.ts manifest) loosens
 * the params object for ops with many GHL-documented optional fields
 * (create, update, search, etc.) so the manifest doesn't have to enumerate
 * every one. Default is strict (`false`).
 */
export function buildRouterSchema(operations: OperationsMap): JsonSchema {
  const oneOf: JsonSchema[] = Object.entries(operations).map(
    ([opName, spec]) => {
      const ps = paramsSchema(spec.params, spec.additionalProperties === true);
      const required: string[] = ["operation"];
      const hasRequiredParam = spec.params.some((p) => p.required);
      if (hasRequiredParam) required.push("params");
      return {
        type: "object",
        required,
        additionalProperties: false,
        properties: {
          operation: { const: opName, description: spec.description },
          params: ps,
        },
      };
    },
  );
  return {
    type: "object",
    required: ["selectSchema"],
    additionalProperties: false,
    properties: {
      selectSchema: { oneOf },
    },
  };
}

/**
 * Build the help-tool input schema (three operations: list-categories,
 * list-operations, describe-operation). Hand-rolled because the help
 * tool's operations don't live in the manifest.
 */
export function buildHelpSchema(
  activeCategories: readonly string[],
): JsonSchema {
  return {
    type: "object",
    required: ["selectSchema"],
    additionalProperties: false,
    properties: {
      selectSchema: {
        oneOf: [
          {
            type: "object",
            required: ["operation"],
            additionalProperties: false,
            properties: {
              operation: { const: "list-categories" },
            },
          },
          {
            type: "object",
            required: ["operation", "params"],
            additionalProperties: false,
            properties: {
              operation: { const: "list-operations" },
              params: {
                type: "object",
                required: ["category"],
                additionalProperties: false,
                properties: {
                  category: { type: "string", enum: [...activeCategories] },
                },
              },
            },
          },
          {
            type: "object",
            required: ["operation", "params"],
            additionalProperties: false,
            properties: {
              operation: { const: "describe-operation" },
              params: {
                type: "object",
                required: ["router", "operation"],
                additionalProperties: false,
                properties: {
                  router: { type: "string" },
                  operation: { type: "string" },
                },
              },
            },
          },
        ],
      },
    },
  };
}
