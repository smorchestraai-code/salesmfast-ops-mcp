/**
 * MCP error helpers — wrap McpError + ErrorCode for the three error shapes
 * the routers throw. Centralized so error messages stay consistent and
 * AC-8.1, AC-8.2, AC-8.3 are testable from one place.
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * AC-4.2 / AC-8.1: input failed schema validation.
 * Includes the offending JSON Pointer path (instancePath) when available.
 */
export function invalidParams(message: string, path?: string): McpError {
  const detail = path && path.length > 0 ? `${path}: ${message}` : message;
  return new McpError(ErrorCode.InvalidParams, detail);
}

/**
 * AC-4.3 / AC-8.3: operation not in the manifest. Lists every valid op
 * so the LLM can self-correct without grepping source.
 */
export function methodNotFound(
  operation: string,
  validOps: readonly string[],
): McpError {
  return new McpError(
    ErrorCode.MethodNotFound,
    `Unknown operation "${operation}". Valid operations: ${validOps.join(", ")}`,
  );
}

/**
 * AC-8.2: upstream HTTP/REST call failed. Prefixes with the category for
 * grep-friendly logs and trims body to 200 chars to keep error envelopes small.
 */
export function upstreamError(
  category: string,
  status: number,
  bodyExcerpt: string,
): McpError {
  const body =
    bodyExcerpt.length > 200 ? bodyExcerpt.slice(0, 200) + "…" : bodyExcerpt;
  return new McpError(
    ErrorCode.InternalError,
    `[upstream ${category}] ${status} ${body}`,
  );
}
