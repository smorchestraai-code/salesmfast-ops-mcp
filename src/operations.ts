/**
 * Operation manifest — single source of truth for router → operation →
 * upstream tool name mapping. Used by:
 *   - schemas/build.ts to generate the oneOf JSON Schema
 *   - routers/factory.ts to look up the upstream tool name
 *   - routers/help.ts to power list-operations + describe-operation
 *   - scripts/gen-mapping-doc.ts to emit docs/operation-mapping.md
 *
 * Per-op `additionalProperties: true` lets ops with many documented optional
 * fields (create_contact, update_contact, search, etc.) accept any GHL-API
 * documented field without forcing us to enumerate every one. Required
 * fields are always explicit. ID-style ops keep additionalProperties: false
 * by omission (default) for tighter validation.
 */

export type ParamType = "string" | "boolean" | "number" | "array";

export interface ParamDescriptor {
  readonly name: string;
  readonly type: ParamType;
  readonly required: boolean;
  readonly default?: string | boolean | number;
  readonly description: string;
  /** Only used when type === "array" */
  readonly items?: { readonly type: "string" | "boolean" | "number" };
}

export interface OperationSpec {
  readonly upstream: string;
  readonly description: string;
  readonly params: readonly ParamDescriptor[];
  /** Default false (strict). Set true for ops with many optional GHL fields. */
  readonly additionalProperties?: boolean;
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

// ─── Common reusable param descriptors ──────────────────────────────────
const REQ_CONTACT_ID: ParamDescriptor = {
  name: "contactId",
  type: "string",
  required: true,
  description: "GHL contact id.",
};
const REQ_TASK_ID: ParamDescriptor = {
  name: "taskId",
  type: "string",
  required: true,
  description: "Task id.",
};
const REQ_NOTE_ID: ParamDescriptor = {
  name: "noteId",
  type: "string",
  required: true,
  description: "Note id.",
};
const REQ_TAGS_ARRAY: ParamDescriptor = {
  name: "tags",
  type: "array",
  items: { type: "string" },
  required: true,
  description: "Array of tag strings.",
};

export const operations: Manifest = {
  // ─── contacts ───────────────────────────────────────────────────────
  contacts: {
    reader: {
      search: {
        upstream: "search_contacts",
        description:
          "Search contacts in the location with optional filters (query, pageLimit, etc.). Returns paginated results.",
        params: [],
        additionalProperties: true,
      },
      get: {
        upstream: "get_contact",
        description: "Get a single contact by id.",
        params: [REQ_CONTACT_ID],
      },
      "get-by-business": {
        upstream: "get_contacts_by_business",
        description: "List contacts associated with a business id.",
        params: [
          {
            name: "businessId",
            type: "string",
            required: true,
            description: "GHL business id.",
          },
        ],
      },
      "get-duplicate": {
        upstream: "get_duplicate_contact",
        description:
          "Find a duplicate contact by email or phone in the location.",
        params: [],
        additionalProperties: true,
      },
      "list-tasks": {
        upstream: "get_contact_tasks",
        description: "List tasks attached to a contact.",
        params: [REQ_CONTACT_ID],
      },
      "get-task": {
        upstream: "get_contact_task",
        description: "Get a single task by id.",
        params: [REQ_CONTACT_ID, REQ_TASK_ID],
      },
      "list-notes": {
        upstream: "get_contact_notes",
        description: "List notes attached to a contact.",
        params: [REQ_CONTACT_ID],
      },
      "get-note": {
        upstream: "get_contact_note",
        description: "Get a single note by id.",
        params: [REQ_CONTACT_ID, REQ_NOTE_ID],
      },
      "list-appointments": {
        upstream: "get_contact_appointments",
        description: "List appointments attached to a contact.",
        params: [REQ_CONTACT_ID],
      },
    },
    updater: {
      create: {
        upstream: "create_contact",
        description:
          "Create a new contact. Many optional fields supported (firstName, lastName, email, phone, tags, customFields, etc.) — see GHL API docs.",
        params: [],
        additionalProperties: true,
      },
      update: {
        upstream: "update_contact",
        description: "Update fields on an existing contact.",
        params: [REQ_CONTACT_ID],
        additionalProperties: true,
      },
      upsert: {
        upstream: "upsert_contact",
        description:
          "Create-or-update a contact, matching by email or phone. Required matcher fields supplied in payload.",
        params: [],
        additionalProperties: true,
      },
      delete: {
        upstream: "delete_contact",
        description: "Delete a contact by id.",
        params: [REQ_CONTACT_ID],
      },
      "add-tags": {
        upstream: "add_contact_tags",
        description: "Add tags to a contact.",
        params: [REQ_CONTACT_ID, REQ_TAGS_ARRAY],
      },
      "remove-tags": {
        upstream: "remove_contact_tags",
        description: "Remove tags from a contact.",
        params: [REQ_CONTACT_ID, REQ_TAGS_ARRAY],
      },
      "create-task": {
        upstream: "create_contact_task",
        description:
          "Create a task on a contact. Title required; optional body, dueDate, completed, assignedTo.",
        params: [
          REQ_CONTACT_ID,
          {
            name: "title",
            type: "string",
            required: true,
            description: "Task title.",
          },
        ],
        additionalProperties: true,
      },
      "update-task": {
        upstream: "update_contact_task",
        description: "Update a task on a contact.",
        params: [REQ_CONTACT_ID, REQ_TASK_ID],
        additionalProperties: true,
      },
      "delete-task": {
        upstream: "delete_contact_task",
        description: "Delete a task from a contact.",
        params: [REQ_CONTACT_ID, REQ_TASK_ID],
      },
      "update-task-completion": {
        upstream: "update_task_completion",
        description: "Toggle a task's completion status.",
        params: [
          REQ_CONTACT_ID,
          REQ_TASK_ID,
          {
            name: "completed",
            type: "boolean",
            required: true,
            description: "True to mark complete; false to reopen.",
          },
        ],
      },
      "create-note": {
        upstream: "create_contact_note",
        description: "Create a note on a contact.",
        params: [
          REQ_CONTACT_ID,
          {
            name: "body",
            type: "string",
            required: true,
            description: "Note body text.",
          },
        ],
        additionalProperties: true,
      },
      "update-note": {
        upstream: "update_contact_note",
        description: "Update a note on a contact.",
        params: [
          REQ_CONTACT_ID,
          REQ_NOTE_ID,
          {
            name: "body",
            type: "string",
            required: true,
            description: "New note body text.",
          },
        ],
      },
      "delete-note": {
        upstream: "delete_contact_note",
        description: "Delete a note from a contact.",
        params: [REQ_CONTACT_ID, REQ_NOTE_ID],
      },
      "add-to-campaign": {
        upstream: "add_contact_to_campaign",
        description: "Add a contact to a campaign.",
        params: [
          REQ_CONTACT_ID,
          {
            name: "campaignId",
            type: "string",
            required: true,
            description: "Campaign id.",
          },
        ],
      },
      "remove-from-campaign": {
        upstream: "remove_contact_from_campaign",
        description: "Remove a contact from a single campaign.",
        params: [
          REQ_CONTACT_ID,
          {
            name: "campaignId",
            type: "string",
            required: true,
            description: "Campaign id.",
          },
        ],
      },
      "remove-from-all-campaigns": {
        upstream: "remove_contact_from_all_campaigns",
        description: "Remove a contact from every campaign in the location.",
        params: [REQ_CONTACT_ID],
      },
      "add-to-workflow": {
        upstream: "add_contact_to_workflow",
        description:
          "Add a contact to a workflow. Optional eventStartTime to schedule entry.",
        params: [
          REQ_CONTACT_ID,
          {
            name: "workflowId",
            type: "string",
            required: true,
            description: "Workflow id.",
          },
        ],
        additionalProperties: true,
      },
      "remove-from-workflow": {
        upstream: "remove_contact_from_workflow",
        description: "Remove a contact from a workflow.",
        params: [
          REQ_CONTACT_ID,
          {
            name: "workflowId",
            type: "string",
            required: true,
            description: "Workflow id.",
          },
        ],
      },
    },
  },

  // ─── conversations / opportunities / location / workflow ────────────
  // Filled in by slices 3-6.
  conversations: { reader: {}, updater: {} },

  // ─── calendars (slice 1) ────────────────────────────────────────────
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
