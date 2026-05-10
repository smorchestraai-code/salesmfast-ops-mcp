/**
 * ghl-forms-reader router (v1.1.4 — bug-fix slice).
 *
 * Upstream's SurveyTools wraps SURVEYS only — GHL forms (Pre-Call Qualifier,
 * Newsletter, scorecard intake, etc.) live behind a different set of v2
 * endpoints and are NOT in upstream's tool surface. We dispatch via direct
 * axios on `upstream.client.axiosInstance`, the same escape hatch the
 * contacts.search and survey.list-submissions routers use.
 *
 * GHL public API exposes only two read endpoints for forms:
 *   GET /forms/?locationId=...&limit=...&skip=...
 *   GET /forms/submissions?locationId=...&formId=...&page=...&limit=...&q=...
 * There is no /forms/{formId} get-by-id endpoint in GHL's public docs;
 * each form's schema (fields/questions) is included in the list payload.
 *
 * No updater — forms are GHL-UI-only (no v2 create/update/delete endpoints).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";
import type { ParsedEnv } from "../env.js";

const FORMS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel forms (Pre-Call Qualifier, Newsletter, scorecard intake, lead-gen forms). " +
  "Operations: `list` (returns each form with its full field schema), `list-submissions` (paginated submission records, optionally filtered by formId / date range / search). " +
  "Surveys are a separate surface — use `ghl-survey-reader` for those. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-forms-reader", operation: "<name>" } }` for the full schema.';

async function dispatchListForms(
  upstream: Upstream,
  params: Record<string, unknown>,
  env: ParsedEnv,
): Promise<unknown> {
  const queryParams: Record<string, unknown> = {
    locationId:
      typeof params["locationId"] === "string" && params["locationId"] !== ""
        ? params["locationId"]
        : env.locationId,
  };
  for (const k of ["limit", "skip"]) {
    if (params[k] !== undefined) queryParams[k] = params[k];
  }
  try {
    const response = await upstream.client.axiosInstance.get<unknown>(
      "/forms/",
      { params: queryParams },
    );
    return response.data;
  } catch (e) {
    throw mapAxiosError(e, "Failed to list forms");
  }
}

async function dispatchListFormSubmissions(
  upstream: Upstream,
  params: Record<string, unknown>,
  env: ParsedEnv,
): Promise<unknown> {
  // GHL's /forms/submissions endpoint validates `limit` server-side and
  // rejects requests with no limit ("limit must be a number conforming to
  // the specified constraints" + "limit must not be greater than 100").
  // Default to 20 + page 1 when caller omits — matches the audit's expected
  // operator UX (call with just formId, get a sensible page back).
  const queryParams: Record<string, unknown> = {
    locationId:
      typeof params["locationId"] === "string" && params["locationId"] !== ""
        ? params["locationId"]
        : env.locationId,
    page: params["page"] ?? 1,
    limit: params["limit"] ?? 20,
  };
  for (const k of ["formId", "q", "startAt", "endAt"]) {
    if (params[k] !== undefined) queryParams[k] = params[k];
  }
  try {
    const response = await upstream.client.axiosInstance.get<unknown>(
      "/forms/submissions",
      { params: queryParams },
    );
    return response.data;
  } catch (e) {
    throw mapAxiosError(e, "Failed to list form submissions");
  }
}

function mapAxiosError(e: unknown, fallback: string): Error {
  const err = e as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  const status = err.response?.status ?? 500;
  const msg = err.response?.data?.message ?? err.message ?? fallback;
  const wrapped = new Error(msg) as Error & { status?: number };
  wrapped.status = status;
  return wrapped;
}

export function createFormsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
  env: ParsedEnv,
): RouterDef {
  return createCategoryRouter({
    name: "ghl-forms-reader",
    description: FORMS_READER_DESCRIPTION,
    category: "forms",
    ops: operations.forms.reader,
    deniedOps,
    dispatch: (op, params) => {
      // Sentinel `upstream` strings (set in operations.ts) route to the
      // direct-axios dispatchers — there is no upstream tool class for forms.
      if (op === "ghl_list_forms_DIRECT_AXIOS") {
        return dispatchListForms(upstream, params, env);
      }
      if (op === "ghl_list_form_submissions_DIRECT_AXIOS") {
        return dispatchListFormSubmissions(upstream, params, env);
      }
      // Unreachable in practice — the manifest only declares the two ops above.
      return Promise.reject(new Error(`Unknown forms operation: ${op}`));
    },
  });
}
