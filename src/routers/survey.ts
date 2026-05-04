/**
 * ghl-survey-reader router (slice 7).
 *
 * 2 ops, both reads. No updater — upstream's SurveyTools doesn't expose
 * write paths in this version. Forms are NOT exposed by SurveyTools (the
 * GHL forms API isn't wrapped by the upstream — only Survey ops are).
 *
 * `SurveyTools.executeSurveyTool` (quirk — not `executeTool`).
 *
 * v1.1.3: `list-submissions` is dispatched directly via axios — upstream's
 * `ghl-api-client.getSurveySubmissions` builds the wrong endpoint URL
 * (`/locations/{id}/surveys/submissions` returns 404; correct shape is
 * `/surveys/submissions?locationId=...`). The facade routes around it.
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";
import type { ParsedEnv } from "../env.js";

const SURVEY_READER_DESCRIPTION =
  "Read-only access to GoHighLevel surveys (NOT forms — GHL forms API is not wrapped by upstream). " +
  "Operations: `list` (paginated; supports `skip`/`limit`/`type`), `list-submissions` (paginated submission records with optional `surveyId`, `q`, `startAt`, `endAt`, `page`, `limit` filters). " +
  "v1.1.3: `list-submissions` calls the correct GHL v2 endpoint directly — upstream's wrapper hits a 404'ing path. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-survey-reader", operation: "<name>" } }` for the full schema.';

/**
 * v1.1.3 — direct-axios fallback for survey-submissions.
 *
 * Upstream's `ghl-api-client.getSurveySubmissions` (line 3149) builds the URL
 * `/locations/{locationId}/surveys/submissions` which returns
 * `404 Cannot GET ...` from GHL. The correct v2 endpoint is
 * `/surveys/submissions?locationId={id}` (locationId as query param,
 * NOT a path segment). The api-client's axiosInstance is pre-configured
 * with auth headers + base URL, so we call it directly here.
 *
 * If/when upstream fixes the URL we can revert to the wrapper, but until
 * then this is the only working path.
 */
async function dispatchSurveyListSubmissions(
  upstream: Upstream,
  params: Record<string, unknown>,
  env: ParsedEnv,
): Promise<unknown> {
  const queryParams: Record<string, unknown> = {
    locationId:
      typeof params.locationId === "string" && params.locationId !== ""
        ? params.locationId
        : env.locationId,
  };
  // Optional filters — pass through any user-supplied values.
  for (const k of ["surveyId", "page", "limit", "q", "startAt", "endAt"]) {
    if (params[k] !== undefined) queryParams[k] = params[k];
  }
  try {
    const response = await upstream.client.axiosInstance.get<unknown>(
      "/surveys/submissions",
      { params: queryParams },
    );
    return response.data;
  } catch (e) {
    const err = e as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = err.response?.status ?? 500;
    const msg =
      err.response?.data?.message ??
      err.message ??
      "Failed to list survey submissions";
    const wrapped = new Error(msg) as Error & { status?: number };
    wrapped.status = status;
    throw wrapped;
  }
}

export function createSurveyReader(
  upstream: Upstream,
  deniedOps: readonly string[],
  env: ParsedEnv,
): RouterDef {
  return createCategoryRouter({
    name: "ghl-survey-reader",
    description: SURVEY_READER_DESCRIPTION,
    category: "survey",
    ops: operations.survey.reader,
    deniedOps,
    dispatch: (op, params) => {
      // v1.1.3: route around upstream's wrong-URL impl for list-submissions.
      if (op === "ghl_get_survey_submissions") {
        return dispatchSurveyListSubmissions(upstream, params, env);
      }
      // Quirk: SurveyTools method is executeSurveyTool, not executeTool.
      return upstream.surveyTools.executeSurveyTool(op, params);
    },
  });
}
