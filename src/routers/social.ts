/**
 * ghl-social-reader + ghl-social-updater routers (slice 7).
 *
 * 20 ops total: 14 read (accounts, posts, tags, categories, per-platform
 * helpers for FB / IG / LinkedIn / TikTok / Twitter / Google) + 6 write
 * (post CRUD, bulk delete, account disconnect, oauth start).
 *
 * `SocialMediaTools.executeTool` (standard signature).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const SOCIAL_READER_DESCRIPTION =
  "Read-only access to GoHighLevel social media surface (Facebook, Instagram, LinkedIn, TikTok, Twitter, Google Business). " +
  "Operations: `get-accounts`, `get-platform-accounts`, `get-post`, `search-posts`, `get-tags`, `get-tags-by-ids`, " +
  "`get-categories`, `get-category`, `get-google-locations`, `get-facebook-pages`, `get-instagram-accounts`, " +
  "`get-linkedin-accounts`, `get-twitter-profile`, `get-tiktok-profile`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-social-reader", operation: "<name>" } }` for the full schema.';

const SOCIAL_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel social media: post CRUD + bulk delete, account disconnect, OAuth start. " +
  "Operations: `create-post`, `update-post`, `delete-post`, `bulk-delete-posts`, `delete-account`, `start-oauth`. " +
  "All operations mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-social-updater", operation: "<name>" } }` for the full schema.';

// v1.1.4 — the per-platform sentinels in operations.ts (e.g.
// `get_platform_accounts_PLATFORM_google`) all dispatch through the upstream's
// single `get_platform_accounts` tool with `platform` as a discriminator.
// Earlier manifest had upstream names like `google`/`facebook` which DON'T
// EXIST in the upstream switch — every per-platform call always failed.
const PLATFORM_SENTINEL = /^get_platform_accounts_PLATFORM_(.+)$/;

export function createSocialReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-social-reader",
    description: SOCIAL_READER_DESCRIPTION,
    category: "social-media",
    ops: operations["social-media"].reader,
    deniedOps,
    dispatch: (op, params) => {
      const m = PLATFORM_SENTINEL.exec(op);
      if (m) {
        const platform = m[1];
        return upstream.socialMediaTools.executeTool("get_platform_accounts", {
          ...params,
          platform,
        });
      }
      return upstream.socialMediaTools.executeTool(op, params);
    },
  });
}

export function createSocialUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-social-updater",
    description: SOCIAL_UPDATER_DESCRIPTION,
    category: "social-media",
    ops: operations["social-media"].updater,
    deniedOps,
    dispatch: (op, params) => upstream.socialMediaTools.executeTool(op, params),
  });
}
