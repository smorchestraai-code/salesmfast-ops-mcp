/**
 * Router registry — composes the active routers from env config.
 *
 * AC-5.1, AC-5.3: GHL_TOOL_CATEGORIES filters which categories register.
 * AC-5.2: GHL_TOOL_DENY removes specific operations from each router's manifest.
 *
 * Phase 1: only `calendars` has a reader implementation. Other categories
 * declared in operations.ts as empty stubs are filtered out below — they
 * become available as we add per-category routers in subsequent slices.
 */

import type { ParsedEnv } from "../env.js";
import type { Upstream } from "../upstream.js";
import {
  ALL_CATEGORIES,
  operations,
  type CategoryName,
} from "../operations.js";
import { createCalendarsReader } from "./calendars.js";
import { createContactsReader, createContactsUpdater } from "./contacts.js";
import {
  createConversationsReader,
  createConversationsUpdater,
} from "./conversations.js";
import {
  createOpportunitiesReader,
  createOpportunitiesUpdater,
} from "./opportunities.js";
import { createHelp } from "./help.js";
import type { RouterDef } from "./types.js";

export type { RouterDef } from "./types.js";

export interface RouterRegistry {
  readonly routers: readonly RouterDef[];
  readonly activeCategories: readonly CategoryName[];
}

export function buildRouters(
  env: ParsedEnv,
  upstream: Upstream,
): RouterRegistry {
  // Resolve requested categories
  const requested: CategoryName[] =
    env.categories === "all"
      ? [...ALL_CATEGORIES]
      : env.categories.filter((c): c is CategoryName =>
          (ALL_CATEGORIES as readonly string[]).includes(c),
        );

  // A category is "active" if it has at least one reader OR updater op in
  // the manifest. (Empty-stub categories from operations.ts get filtered.)
  const activeCategories = requested.filter((c) => {
    const r = Object.keys(operations[c].reader).length;
    const u = Object.keys(operations[c].updater).length;
    return r > 0 || u > 0;
  });

  const routers: RouterDef[] = [];

  if (
    activeCategories.includes("calendars") &&
    Object.keys(operations.calendars.reader).length > 0
  ) {
    routers.push(createCalendarsReader(upstream, env.deniedOps));
  }

  if (activeCategories.includes("contacts")) {
    if (Object.keys(operations.contacts.reader).length > 0) {
      routers.push(createContactsReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.contacts.updater).length > 0) {
      routers.push(createContactsUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("conversations")) {
    if (Object.keys(operations.conversations.reader).length > 0) {
      routers.push(createConversationsReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.conversations.updater).length > 0) {
      routers.push(createConversationsUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("opportunities")) {
    if (Object.keys(operations.opportunities.reader).length > 0) {
      routers.push(createOpportunitiesReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.opportunities.updater).length > 0) {
      routers.push(createOpportunitiesUpdater(upstream, env.deniedOps));
    }
  }

  // Help is always registered, even if no other category is active
  routers.push(createHelp(activeCategories));

  // Stable, predictable ordering: help first, then alphabetical
  routers.sort((a, b) => {
    if (a.name === "ghl-toolkit-help") return -1;
    if (b.name === "ghl-toolkit-help") return 1;
    return a.name.localeCompare(b.name);
  });

  return { routers, activeCategories };
}
