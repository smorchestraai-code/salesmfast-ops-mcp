/**
 * Auto-generate `docs/operation-mapping.md` from `src/operations.ts`.
 *
 * Wired into `prebuild` in package.json so the doc cannot drift from the
 * manifest (AC-10.2). Also runnable directly via `npm run docs:mapping`.
 *
 * Pure read of the manifest → markdown emit. No side effects beyond the
 * single fs write.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_CATEGORIES,
  operations,
  type CategoryOps,
  type OperationsMap,
} from "../src/operations.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "docs", "operation-mapping.md");

function emitTable(
  direction: "reader" | "updater",
  category: string,
  ops: OperationsMap,
): string[] {
  const count = Object.keys(ops).length;
  if (count === 0) return [];
  const lines: string[] = [];
  lines.push(
    `### \`ghl-${category}-${direction}\` (${count} operation${count === 1 ? "" : "s"})`,
  );
  lines.push("");
  lines.push("| Operation | Upstream tool | Description |");
  lines.push("|-----------|---------------|-------------|");
  for (const [op, spec] of Object.entries(ops)) {
    lines.push(`| \`${op}\` | \`${spec.upstream}\` | ${spec.description} |`);
  }
  lines.push("");
  return lines;
}

function build(): string {
  const lines: string[] = [];
  lines.push("# Operation mapping");
  lines.push("");
  lines.push(
    "Auto-generated from `src/operations.ts` by `scripts/gen-mapping-doc.ts`.",
  );
  lines.push(
    "Do not edit by hand. Re-run with `npm run docs:mapping` (also runs as",
  );
  lines.push(
    "`prebuild` before `tsc`, so the doc cannot drift from the manifest).",
  );
  lines.push("");
  lines.push(
    "Each operation maps to one upstream tool name. The router exposes the",
  );
  lines.push(
    "operation as `<router-name>.<operation>` via the `selectSchema` discriminated union.",
  );
  lines.push("");

  let totalReader = 0;
  let totalUpdater = 0;

  for (const cat of ALL_CATEGORIES) {
    const catOps: CategoryOps = operations[cat];
    const readerCount = Object.keys(catOps.reader).length;
    const updaterCount = Object.keys(catOps.updater).length;
    totalReader += readerCount;
    totalUpdater += updaterCount;
    if (readerCount === 0 && updaterCount === 0) continue;

    lines.push(`## ${cat}`);
    lines.push("");
    lines.push(...emitTable("reader", cat, catOps.reader));
    lines.push(...emitTable("updater", cat, catOps.updater));
  }

  lines.push("---");
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- Reader operations: **${totalReader}**`);
  lines.push(`- Updater operations: **${totalUpdater}**`);
  lines.push(`- Total: **${totalReader + totalUpdater}**`);
  lines.push("");
  lines.push(
    "Phase 1 vertical slice ships only `ghl-calendars-reader`. Other categories register",
  );
  lines.push("when their per-category slice lands in a subsequent PR.");
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, build(), "utf8");
  // eslint-disable-next-line no-console
  console.log(`[gen-mapping-doc] wrote ${OUT_PATH}`);
}

main();
