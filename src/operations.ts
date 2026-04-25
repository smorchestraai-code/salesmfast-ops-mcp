/**
 * Operation manifest — single source of truth for router → operation →
 * upstream tool name mapping. Used by:
 *   - schemas/build.ts to generate the oneOf JSON Schema
 *   - routers/calendars.ts to look up the upstream tool name
 *   - routers/help.ts to power list-operations + describe-operation
 *   - scripts/gen-mapping-doc.ts to emit docs/operation-mapping.md
 *
 * Phase 1 vertical slice: only `calendars.reader` is filled in.
 * Other categories are declared as empty stubs so the typing scales
 * without manifest churn when subsequent slices add them.
 */

export interface ParamDescriptor {
  readonly name: string;
  readonly type: "string" | "boolean";
  readonly required: boolean;
  readonly default?: string | boolean;
  readonly description: string;
}

export interface OperationSpec {
  readonly upstream: string;
  readonly description: string;
  readonly params: readonly ParamDescriptor[];
}

export type OperationsMap = Readonly<Record<string, OperationSpec>>;

export interface CategoryOps {
  readonly reader: OperationsMap;
  readonly updater: OperationsMap;
}

export const ALL_CATEGORIES = [
  "contacts",
  "conversations",
  "calendars",
  "opportunities",
  "location",
  "workflow",
] as const;

export type CategoryName = (typeof ALL_CATEGORIES)[number];

export type Manifest = Readonly<Record<CategoryName, CategoryOps>>;

export const operations: Manifest = {
  contacts: { reader: {}, updater: {} },
  conversations: { reader: {}, updater: {} },
  calendars: {
    reader: {
      "list-groups": {
        upstream: "get_calendar_groups",
        description: "List all calendar groups in the location.",
        params: [],
      },
      list: {
        upstream: "get_calendars",
        description: "List calendars, optionally filtered to a group.",
        params: [
          {
            name: "groupId",
            type: "string",
            required: false,
            description: "Filter to one calendar group.",
          },
          {
            name: "showDrafted",
            type: "boolean",
            required: false,
            default: true,
            description: "Include drafted calendars.",
          },
        ],
      },
      get: {
        upstream: "get_calendar",
        description: "Get a single calendar by id.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar id.",
          },
        ],
      },
      "list-events": {
        upstream: "get_calendar_events",
        description: "List events for a calendar in a date range.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar id.",
          },
          {
            name: "startDate",
            type: "string",
            required: true,
            description: "ISO 8601 start date.",
          },
          {
            name: "endDate",
            type: "string",
            required: true,
            description: "ISO 8601 end date.",
          },
        ],
      },
      "list-free-slots": {
        upstream: "get_free_slots",
        description: "List free slots in a calendar for a date range.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar id.",
          },
          {
            name: "startDate",
            type: "string",
            required: true,
            description: "ISO 8601 start date.",
          },
          {
            name: "endDate",
            type: "string",
            required: true,
            description: "ISO 8601 end date.",
          },
          {
            name: "timezone",
            type: "string",
            required: false,
            description: "IANA timezone for slot times.",
          },
        ],
      },
      "get-appointment": {
        upstream: "get_appointment",
        description: "Get a single appointment by id.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment id.",
          },
        ],
      },
    },
    updater: {},
  },
  opportunities: { reader: {}, updater: {} },
  location: { reader: {}, updater: {} },
  workflow: { reader: {}, updater: {} },
} as const;
