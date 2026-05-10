/**
 * ghl-blog-reader + ghl-blog-updater routers (slice 9).
 *
 * 7 ops: 5 read (sites, posts, authors, categories, slug-check) + 2 write
 * (create + update post). `BlogTools.executeTool` (standard).
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const BLOG_READER_DESCRIPTION =
  "Read-only access to GoHighLevel blog: sites, posts, authors, categories, URL-slug availability check. " +
  "Operations: `get-sites`, `get-posts`, `get-authors`, `get-categories`, `check-url-slug`. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-blog-reader", operation: "<name>" } }` for the full schema.';

const BLOG_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel blog posts. " +
  "Operations: `create-post`, `update-post`. " +
  "Both mutate state — gate behind explicit confirmation; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-blog-updater", operation: "<name>" } }` for the full schema.';

export function createBlogReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-blog-reader",
    description: BLOG_READER_DESCRIPTION,
    category: "blog",
    ops: operations.blog.reader,
    deniedOps,
    // ajv `useDefaults` is ignored inside `oneOf` branches, so the
    // manifest-level `default: "PUBLISHED"` on `get-posts.status` does NOT
    // auto-inject. Apply it here instead. GHL silently returns zero results
    // when no status filter is passed; PUBLISHED matches operator intent
    // ("show me my live posts") — callers can override.
    preValidate: (operation, params) => {
      if (
        operation === "get-posts" &&
        (params["status"] === undefined ||
          params["status"] === null ||
          params["status"] === "")
      ) {
        params["status"] = "PUBLISHED";
      }
    },
    dispatch: (op, params) => upstream.blogTools.executeTool(op, params),
  });
}

export function createBlogUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-blog-updater",
    description: BLOG_UPDATER_DESCRIPTION,
    category: "blog",
    ops: operations.blog.updater,
    deniedOps,
    dispatch: (op, params) => upstream.blogTools.executeTool(op, params),
  });
}
