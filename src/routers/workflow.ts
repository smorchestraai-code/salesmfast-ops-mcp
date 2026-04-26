/**
 * ghl-workflow-reader router (slice 6).
 *
 * 1 op: `list` → `ghl_get_workflows`. Reader-only — no write surface in
 * Phase 1 (BRD section 7.6).
 *
 * Note: WorkflowTools uses `executeWorkflowTool`, NOT `executeTool` (per
 * CLAUDE.md "Common pitfalls"). The factory's dispatch closure routes
 * around this seamlessly.
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const WORKFLOW_READER_DESCRIPTION =
  "Read-only access to GoHighLevel workflows. " +
  "Operations: `list`. " +
  "Idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-workflow-reader", operation: "<name>" } }` for the full schema.';

export function createWorkflowReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-workflow-reader",
    description: WORKFLOW_READER_DESCRIPTION,
    category: "workflow",
    ops: operations.workflow.reader,
    deniedOps,
    // Quirk: WorkflowTools method is executeWorkflowTool, not executeTool.
    dispatch: (op, params) =>
      upstream.workflowTools.executeWorkflowTool(op, params),
  });
}
