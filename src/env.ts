/**
 * Environment parsing — single source of truth.
 *
 * No other file in this project should read process.env directly.
 * Pass ParsedEnv around instead.
 */

export interface ParsedEnv {
  readonly apiKey: string;
  readonly locationId: string;
  readonly baseUrl: string;
  readonly categories: "all" | readonly string[];
  readonly deniedOps: readonly string[];
}

export function parseEnv(env: NodeJS.ProcessEnv): ParsedEnv {
  const apiKey = (env["GHL_API_KEY"] ?? "").trim();
  const locationId = (env["GHL_LOCATION_ID"] ?? "").trim();
  if (!apiKey) {
    throw new Error(
      "GHL_API_KEY is required. Copy .env.example to .env and fill in values from BRD section 10.2.",
    );
  }
  if (!locationId) {
    throw new Error(
      "GHL_LOCATION_ID is required. Copy .env.example to .env and fill in values from BRD section 10.2.",
    );
  }
  const baseUrl =
    (env["GHL_BASE_URL"] ?? "").trim() ||
    "https://services.leadconnectorhq.com";
  const rawCategories = (env["GHL_TOOL_CATEGORIES"] ?? "").trim();
  const categories: "all" | string[] =
    rawCategories === "" || rawCategories === "all"
      ? "all"
      : rawCategories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  const rawDeny = (env["GHL_TOOL_DENY"] ?? "").trim();
  const deniedOps = rawDeny
    ? rawDeny
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return { apiKey, locationId, baseUrl, categories, deniedOps };
}
