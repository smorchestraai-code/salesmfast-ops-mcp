# CLAUDE.md — `salesmfast-ops-mcp`

You are working on a TypeScript MCP server that wraps an existing 280-tool GoHighLevel MCP into 13 facade-router tools, sized to fit under host tool caps.

## Read in this order

1. **`BRD.md`** — full requirements with AC-tagged stories. Source of truth. Read it once, fully, before writing any code.
2. **`/Users/mamounalamouri/GoHighLevel-MCP/src/server.ts`** — the upstream you're wrapping. Pay attention to the `is<Category>Tool(name)` methods; those are the operation lists per category.
3. **`/Users/mamounalamouri/GoHighLevel-MCP/src/tools/<category>-tools.ts`** for each in-scope category — the classes you'll instantiate and route to. The public method that matters is `executeTool(name, args)` on each class (some are named differently like `executeAssociationTool`; verify per class).
4. **This file** — operating rules, do-not-touch list, common pitfalls.

## Project context (compressed)

- **Owner**: Mamoun Alamouri, SMOrchestra.ai (Dubai). Operating in Strategic Advisor / Growth Partner modes per his preferences.
- **Why this exists**: We hit a host tool-count cap of ~128 with the upstream MCP's 280 tools. Patched it down to ~76 via env-var slim mode (already in the upstream `src/server.ts`), but the host's per-tool permission hook is still hostile at scale. This MCP cuts the surface to 13.
- **Host targets**: Claude Desktop (Cowork) primary, Claude Code secondary, any MCP host eventually.
- **Reference precedent**: Netlify's MCP (6 facade tools with `selectSchema` discriminated unions). Mirror its pattern.

## Build order (do not skip steps)

1. Scaffold the project: `package.json`, `tsconfig.json` (strict + `noUncheckedIndexedAccess`), `.gitignore`, `.env.example`.
2. `src/upstream.ts` — import + instantiate the 7 upstream tool classes. Decide between `file:../GoHighLevel-MCP` package dependency or relative path import. Document the choice in this file under "Architecture decisions" once made.
3. `src/operations.ts` — the manifest. Use BRD Section 7 verbatim. This is the only place where router operation names map to upstream tool names.
4. `src/schemas/build.ts` — generates `oneOf` JSON Schema from the operation manifest. One schema per router.
5. `src/routers/index.ts` + per-category routers. Each router is a small handler `(input) => upstream.executeTool(mappedName, input.params)`.
6. `src/routers/help.ts` — the discovery tool. Implements `list-categories`, `list-operations`, `describe-operation`.
7. `src/server.ts` — MCP boot, registers all routers from `src/routers/index.ts`, applies `GHL_TOOL_CATEGORIES` and `GHL_TOOL_DENY` filters at registration time.
8. `scripts/probe.ts` — the Story 6 probe test. Spawn the server, send the JSON-RPC sequence in BRD §9.2.
9. `scripts/gen-mapping-doc.ts` — emits `docs/operation-mapping.md` from `src/operations.ts`. Run it as part of `npm run build` so the doc cannot drift.
10. `README.md` — install steps, env vars, Claude Desktop config snippet (BRD §9.3).

After step 9: `npm run build && npm run probe`. Both must exit 0.

## Definition of Done

See BRD §11. Binary checklist of 7 items. Do not declare success until every item is true.

## Do not

- Do not reimplement `GHLApiClient`, retry logic, or any tool method body. Wrap; do not fork.
- Do not invent operation names that don't appear in BRD §7. If a name needs to change for clarity, update §7 first and document the rename in `docs/operation-mapping.md`.
- Do not register out-of-scope categories (blog, social, payments, invoices, products, store, media, custom-objects, associations, custom-field-v2, surveys). Phase 2 territory.
- Do not add `any` casts outside the routing layer. The upstream returns `Promise<any>`; that's the only acceptable place.
- Do not let the help tool's description balloon past 1500 chars. Detail goes in `list-operations` result, not the description.
- Do not commit `dist/` or `node_modules/` (already gitignored).
- Do not break the env-var contract: `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_BASE_URL`, `GHL_TOOL_CATEGORIES`, `GHL_TOOL_DENY` must keep working with the same semantics as in the upstream slim-mode patch.

## Quick reference (smoke-test baseline)

Captured 2026-04-25 against location `UNw9DraGO3eyEa5l4lkJ`:

- Calendar groups: `FKQpu4dGBFauC28DQfSP` (Injectables & Cosmetic Treatments), `JV14FPsJByKLVYQWFGDG` (Laser Hair Removal).
- Calendars in `FKQpu4dGBFauC28DQfSP`: `J1GJwqH5dJZalEoWrjhV` (Botox), `xJsCmucamkgwjFxt9TMO` (Dermal fillers).
- Pipelines: `Zf2Lv61fAmm4JliTRsxI` (11/2 Webinar, 5 stages), `zb3QNPhlyD8BxdaifZzZ` (B2B Pipeline).

The probe's pass criterion (AC-6.2) is that `ghl-calendars-reader { operation: "list-groups" }` returns a payload containing `FKQpu4dGBFauC28DQfSP`. If it doesn't, your routing is broken.

## Common pitfalls

- The upstream classes have **inconsistent execute method names**: most are `executeTool(name, args)` but `AssociationTools` is `executeAssociationTool`, `CustomFieldV2Tools` is `executeCustomFieldV2Tool`, `WorkflowTools` is `executeWorkflowTool`, `SurveyTools` is `executeSurveyTool`, `StoreTools` is `executeStoreTool`, `ProductsTools` is `executeProductsTool`, `PaymentsTools` is `handleToolCall`, `InvoicesTools` is `handleToolCall`. **Verify the method name per class before wiring** — see upstream `src/server.ts` lines 233–270 for the canonical dispatch table.
- The MCP SDK ships ESM-first. If your `tsconfig` uses `module: commonjs`, expect import friction. Match the upstream's setup (`module: nodenext` or `node16`).
- Boot logs go to `stderr`, not `stdout`. `stdout` is reserved for the JSON-RPC channel.
- The `selectSchema` shape is **input**, not result. Result follows the standard MCP `{ content: [{ type: 'text', text: ... }] }` envelope.

## When you're stuck

1. Re-read BRD §3 (architecture) and BRD §7 (operation manifest). Most ambiguity dissolves.
2. Look at how the upstream `src/server.ts` dispatches: lines 222–298 are the canonical reference for `(toolName, args) → tool class method` routing.
3. Look at how Netlify shapes its `selectSchema` — there's a real-world example in `claude_desktop_config.json` and the `netlify-deploy-services-updater` schema we used on 2026-04-25 to deploy `rami-agency-doctors.netlify.app`.
4. The probe is your friend. If a tool isn't behaving, run `npm run probe` and read the assertion output.

## Architecture decisions (log)

Add entries here as you make irreversible choices. Format: `date — decision — rationale`.

- _2026-04-25 — BRD locked at v1.0 — composite self-score 99/100, single open question on AC-6.4 (write-path integration probe)_

## Hand-back to Cowork

When `npm run probe` is green and Definition of Done is met, the next agent (Cowork) takes over for integration smoke test:
1. Update `~/Library/Application Support/Claude/claude_desktop_config.json` to swap `ghl-mcp` for `salesmfast-ops`.
2. Restart Claude Desktop.
3. Call `ghl-calendars-reader { operation: "list-groups" }` from a Cowork session.
4. Confirm: 13 tools visible in Cowork's connector permissions UI; calendar group `FKQpu4dGBFauC28DQfSP` returned in the response; no "disabled in connector settings" errors.

Then: deprecate the upstream `ghl-mcp` from config and update `smorch-gtm-tools:ghl-operator` SKILL.md to use the new router shape. That's Phase 2.
