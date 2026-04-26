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
import { createCalendarsReader, createCalendarsUpdater } from "./calendars.js";
import { createContactsReader, createContactsUpdater } from "./contacts.js";
import {
  createConversationsReader,
  createConversationsUpdater,
} from "./conversations.js";
import { createLocationReader, createLocationUpdater } from "./location.js";
import {
  createOpportunitiesReader,
  createOpportunitiesUpdater,
} from "./opportunities.js";
import { createWorkflowReader } from "./workflow.js";
// ─── Slice 7 (GTM) ───
import { createSocialReader, createSocialUpdater } from "./social.js";
import { createEmailReader, createEmailUpdater } from "./email.js";
import { createSurveyReader } from "./survey.js";
import { createInvoiceReader, createInvoiceUpdater } from "./invoice.js";
// ─── Slice 8 (Revenue) ───
import { createProductsReader, createProductsUpdater } from "./products.js";
import { createPaymentsReader, createPaymentsUpdater } from "./payments.js";
import { createStoreReader, createStoreUpdater } from "./store.js";
// ─── Slice 9 (Content) ───
import { createBlogReader, createBlogUpdater } from "./blog.js";
import { createMediaReader, createMediaUpdater } from "./media.js";
// ─── Slice 10 (Custom Data) ───
import {
  createCustomFieldV2Reader,
  createCustomFieldV2Updater,
} from "./custom-field-v2.js";
import { createObjectReader, createObjectUpdater } from "./object.js";
import {
  createAssociationReader,
  createAssociationUpdater,
} from "./association.js";
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

  if (activeCategories.includes("calendars")) {
    if (Object.keys(operations.calendars.reader).length > 0) {
      routers.push(createCalendarsReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.calendars.updater).length > 0) {
      routers.push(createCalendarsUpdater(upstream, env.deniedOps));
    }
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

  if (activeCategories.includes("location")) {
    if (Object.keys(operations.location.reader).length > 0) {
      routers.push(createLocationReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.location.updater).length > 0) {
      routers.push(createLocationUpdater(upstream, env.deniedOps));
    }
  }

  if (
    activeCategories.includes("workflow") &&
    Object.keys(operations.workflow.reader).length > 0
  ) {
    routers.push(createWorkflowReader(upstream, env.deniedOps));
  }

  // ─── Slice 7 (GTM) ────
  if (activeCategories.includes("social-media")) {
    if (Object.keys(operations["social-media"].reader).length > 0) {
      routers.push(createSocialReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations["social-media"].updater).length > 0) {
      routers.push(createSocialUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("email")) {
    if (Object.keys(operations.email.reader).length > 0) {
      routers.push(createEmailReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.email.updater).length > 0) {
      routers.push(createEmailUpdater(upstream, env.deniedOps));
    }
  }

  if (
    activeCategories.includes("survey") &&
    Object.keys(operations.survey.reader).length > 0
  ) {
    routers.push(createSurveyReader(upstream, env.deniedOps));
  }

  if (activeCategories.includes("invoice")) {
    if (Object.keys(operations.invoice.reader).length > 0) {
      routers.push(createInvoiceReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.invoice.updater).length > 0) {
      routers.push(createInvoiceUpdater(upstream, env.deniedOps));
    }
  }

  // ─── Slice 8 (Revenue) ────
  if (activeCategories.includes("products")) {
    if (Object.keys(operations.products.reader).length > 0) {
      routers.push(createProductsReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.products.updater).length > 0) {
      routers.push(createProductsUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("payments")) {
    if (Object.keys(operations.payments.reader).length > 0) {
      routers.push(createPaymentsReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.payments.updater).length > 0) {
      routers.push(createPaymentsUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("store")) {
    if (Object.keys(operations.store.reader).length > 0) {
      routers.push(createStoreReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.store.updater).length > 0) {
      routers.push(createStoreUpdater(upstream, env.deniedOps));
    }
  }

  // ─── Slice 9 (Content) ────
  if (activeCategories.includes("blog")) {
    if (Object.keys(operations.blog.reader).length > 0) {
      routers.push(createBlogReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.blog.updater).length > 0) {
      routers.push(createBlogUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("media")) {
    if (Object.keys(operations.media.reader).length > 0) {
      routers.push(createMediaReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.media.updater).length > 0) {
      routers.push(createMediaUpdater(upstream, env.deniedOps));
    }
  }

  // ─── Slice 10 (Custom Data) ────
  if (activeCategories.includes("custom-field-v2")) {
    if (Object.keys(operations["custom-field-v2"].reader).length > 0) {
      routers.push(createCustomFieldV2Reader(upstream, env.deniedOps));
    }
    if (Object.keys(operations["custom-field-v2"].updater).length > 0) {
      routers.push(createCustomFieldV2Updater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("object")) {
    if (Object.keys(operations.object.reader).length > 0) {
      routers.push(createObjectReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.object.updater).length > 0) {
      routers.push(createObjectUpdater(upstream, env.deniedOps));
    }
  }

  if (activeCategories.includes("association")) {
    if (Object.keys(operations.association.reader).length > 0) {
      routers.push(createAssociationReader(upstream, env.deniedOps));
    }
    if (Object.keys(operations.association.updater).length > 0) {
      routers.push(createAssociationUpdater(upstream, env.deniedOps));
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
