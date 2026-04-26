/**
 * ghl-survey-reader router (slice 7).
 *
 * 2 ops, both reads. No updater — upstream's SurveyTools doesn't expose
 * write paths in this version. Note: GHL "forms" surface as surveys via
 * the API (named in description for operator clarity).
 *
 * `SurveyTools.executeSurveyTool` (quirk — not `executeTool`).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const SURVEY_READER_DESCRIPTION =
  "Read-only access to GoHighLevel surveys AND forms (GHL surfaces forms as surveys via API). " +
  "Operations: `list`, `list-submissions`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-survey-reader", operation: "<name>" } }` for the full schema.';

export function createSurveyReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-survey-reader",
    description: SURVEY_READER_DESCRIPTION,
    category: "survey",
    ops: operations.survey.reader,
    deniedOps,
    // Quirk: SurveyTools method is executeSurveyTool, not executeTool.
    dispatch: (op, params) =>
      upstream.surveyTools.executeSurveyTool(op, params),
  });
}
