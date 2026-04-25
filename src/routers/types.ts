/**
 * Shared router types — broken out into its own file to avoid a circular
 * import between routers/index.ts (which composes routers) and the
 * individual router files (which need RouterDef).
 */

import type { JsonSchema } from "../schemas/build.js";

export interface RouterContent {
  readonly content: ReadonlyArray<{
    readonly type: "text";
    readonly text: string;
  }>;
  readonly isError?: boolean;
}

export interface RouterDef {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly handler: (input: unknown) => Promise<RouterContent>;
}
