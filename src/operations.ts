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
  // ─── Slice 7 (GTM) ────
  "email",
  "social-media",
  "survey",
  "forms",
  "invoice",
  // ─── Slice 8 (Revenue) ────
  "products",
  "payments",
  "store",
  // ─── Slice 9 (Content) ────
  "blog",
  "media",
  // ─── Slice 10 (Custom Data) ────
  "custom-field-v2",
  "object",
  "association",
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
          "Search contacts in the configured location. Optional params: `query` (string fuzzy match), `pageLimit` (1-100, default 25), `startAfterId`+`startAfter` (cursor pagination — pass the last contact's id and dateUpdated millis from the prior page), `filters` object with keys `email` (string), `phone` (string), `tags` (string[]), `dateAdded` ({ startDate, endDate } ISO 8601). v1.1.3 also accepts those filter keys at the top level for convenience. Returns the full paginated payload from `/contacts/search`.",
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
        params: [
          {
            name: "email",
            type: "string",
            required: true,
            description: "Contact email address",
          },],
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
          {
            name: "dueDate",
            type: "string",
            required: true,
            description: "Due date (ISO format)",
          },
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
      // ─── Slice 11 cleanup (4 missing contacts ops) ─────────
      "add-followers": {
        upstream: "add_contact_followers",
        description: "Add follower users to a contact.",
        params: [
          {
            name: "followers",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of user IDs to add as followers",
          },REQ_CONTACT_ID],
        additionalProperties: true,
      },
      "remove-followers": {
        upstream: "remove_contact_followers",
        description: "Remove follower users from a contact.",
        params: [
          {
            name: "followers",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of user IDs to remove as followers",
          },REQ_CONTACT_ID],
        additionalProperties: true,
      },
      "bulk-update-business": {
        upstream: "bulk_update_contact_business",
        description: "Bulk-update the business on multiple contacts.",
        params: [
          {
            name: "contactIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of contact IDs",
          },],
        additionalProperties: true,
      },
      "bulk-update-tags": {
        upstream: "bulk_update_contact_tags",
        description: "Bulk add or remove tags on multiple contacts.",
        params: [
          {
            name: "contactIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of contact IDs",
          },
          {
            name: "tags",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Tags to add or remove",
          },
          {
            name: "operation",
            type: "string",
            required: true,
            description: "Operation to perform",
          },],
        additionalProperties: true,
      },
    },
  },

  // ─── conversations (slice 3) ────────────────────────────────────────
  conversations: {
    reader: {
      search: {
        upstream: "search_conversations",
        description:
          "Search conversations in the location. Optional filters: contactId, query, status, etc. Returns paginated results.",
        params: [],
        additionalProperties: true,
      },
      get: {
        upstream: "get_conversation",
        description: "Get a single conversation by id.",
        params: [
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "Conversation id.",
          },
        ],
      },
      "get-message": {
        upstream: "get_message",
        description: "Get a single message by id.",
        params: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "Message id.",
          },
        ],
      },
      "get-email-message": {
        upstream: "get_email_message",
        description: "Get a single email message by id.",
        params: [
          {
            name: "emailMessageId",
            type: "string",
            required: true,
            description: "Email message id.",
          },
        ],
      },
      "get-recent-messages": {
        upstream: "get_recent_messages",
        description:
          "List recent messages ACROSS conversations for the location (monitoring view, NOT scoped to a single conversation). Use `get { conversationId }` to fetch one conversation's full thread.",
        params: [
          {
            name: "limit",
            type: "number",
            required: false,
            default: 10,
            description:
              "Maximum number of conversations to scan (1–50, default 10).",
          },
          {
            name: "status",
            type: "string",
            required: false,
            description: 'Filter — "all" or "unread".',
          },
        ],
        additionalProperties: true,
      },
      "get-message-recording": {
        upstream: "get_message_recording",
        description: "Get the recording (binary URL) for a voice message.",
        params: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "Message id.",
          },
        ],
      },
      // ─── Slice 11 cleanup (2 conversation read ops) ───────
      "get-message-transcription": {
        upstream: "get_message_transcription",
        description: "Get the transcription text for a voice message.",
        params: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "Message id.",
          },
        ],
        additionalProperties: true,
      },
      "download-transcription": {
        upstream: "download_transcription",
        description: "Download the transcription file for a voice message.",
        params: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "Message id.",
          },
        ],
        additionalProperties: true,
      },
    },
    updater: {
      "send-sms": {
        upstream: "send_sms",
        description:
          "Send an SMS to a contact. Required: contactId + message. Optional: fromNumber, etc.",
        params: [
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "Recipient contact id.",
          },
          {
            name: "message",
            type: "string",
            required: true,
            description: "SMS body.",
          },
        ],
        additionalProperties: true,
      },
      "send-email": {
        upstream: "send_email",
        description:
          "Send an email to a contact. Required: contactId. Subject/body/html/template variants supported via optional fields.",
        params: [
          {
            name: "subject",
            type: "string",
            required: true,
            description: "Email subject line",
          },
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "Recipient contact id.",
          },
        ],
        additionalProperties: true,
      },
      create: {
        upstream: "create_conversation",
        description: "Create a new conversation for a contact.",
        params: [
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "Contact id.",
          },
        ],
        additionalProperties: true,
      },
      update: {
        upstream: "update_conversation",
        description: "Update fields on an existing conversation.",
        params: [
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "Conversation id.",
          },
        ],
        additionalProperties: true,
      },
      delete: {
        upstream: "delete_conversation",
        description: "Delete a conversation by id.",
        params: [
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "Conversation id.",
          },
        ],
      },
      "upload-attachments": {
        upstream: "upload_message_attachments",
        description: "Upload attachments to a conversation.",
        params: [
          {
            name: "attachmentUrls",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of file URLs to upload as attachments",
          },
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "Conversation id.",
          },
        ],
        additionalProperties: true,
      },
      "update-message-status": {
        upstream: "update_message_status",
        description: "Update a message's delivery status.",
        params: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "Message id.",
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "New status (delivered, read, failed, etc.).",
          },
        ],
        additionalProperties: true,
      },
      "cancel-scheduled-message": {
        upstream: "cancel_scheduled_message",
        description: "Cancel a previously-scheduled SMS or message.",
        params: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "Message id.",
          },
        ],
      },
      "cancel-scheduled-email": {
        upstream: "cancel_scheduled_email",
        description: "Cancel a previously-scheduled email.",
        params: [
          {
            name: "emailMessageId",
            type: "string",
            required: true,
            description: "Email message id.",
          },
        ],
      },
      // ─── Slice 11 cleanup (3 conversation write ops) ──────
      "add-inbound-message": {
        upstream: "add_inbound_message",
        description: "Manually log an inbound message in a conversation.",
        params: [
          {
            name: "type",
            type: "string",
            required: true,
            description: "Type of inbound message to add",
          },
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "The conversation to add the message to",
          },
          {
            name: "conversationProviderId",
            type: "string",
            required: true,
            description: "Conversation provider ID for the message",
          },],
        additionalProperties: true,
      },
      "add-outbound-call": {
        upstream: "add_outbound_call",
        description: "Manually log an outbound call in a conversation.",
        params: [
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "The conversation to add the call to",
          },
          {
            name: "conversationProviderId",
            type: "string",
            required: true,
            description: "Conversation provider ID for the call",
          },
          {
            name: "to",
            type: "string",
            required: true,
            description: "Called phone number",
          },
          {
            name: "from",
            type: "string",
            required: true,
            description: "Caller phone number",
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "Call completion status",
          },],
        additionalProperties: true,
      },
      "live-chat-typing": {
        upstream: "live_chat_typing",
        description: "Send a typing indicator in a live-chat conversation.",
        params: [
          {
            name: "visitorId",
            type: "string",
            required: true,
            description: "Unique visitor ID for the live chat session",
          },
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "The conversation ID for the live chat",
          },
          {
            name: "isTyping",
            type: "boolean",
            required: true,
            description: "Whether the agent is currently typing",
          },],
        additionalProperties: true,
      },
    },
  },

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
        description:
          "List events/appointments for a calendar in a date range. Date params accept ISO date (YYYY-MM-DD), full ISO 8601, or epoch milliseconds — upstream converts.",
        params: [
          {
            name: "startTime",
            type: "string",
            required: true,
            description:
              "Start of date range — ISO date (YYYY-MM-DD), ISO 8601 timestamp, or epoch milliseconds.",
          },
          {
            name: "endTime",
            type: "string",
            required: true,
            description:
              "End of date range — ISO date (YYYY-MM-DD), ISO 8601 timestamp, or epoch milliseconds.",
          },
          {
            name: "calendarId",
            type: "string",
            required: false,
            description: "Filter to a single calendar.",
          },
          {
            name: "userId",
            type: "string",
            required: false,
            description: "Filter to events assigned to a specific user.",
          },
          {
            name: "groupId",
            type: "string",
            required: false,
            description: "Filter to a calendar group.",
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
      // ─── Slice 11 cleanup (8 calendar read ops) ───────────
      "get-blocked-slots": {
        upstream: "get_blocked_slots",
        description: "List blocked-time slots on a calendar.",
        params: [
          {
            name: "startTime",
            type: "string",
            required: true,
            description: "Start time for the query range",
          },
          {
            name: "endTime",
            type: "string",
            required: true,
            description: "End time for the query range",
          },],
        additionalProperties: true,
      },
      "list-appointment-notes": {
        upstream: "get_appointment_notes",
        description: "List notes attached to an appointment.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment ID",
          },],
        additionalProperties: true,
      },
      "list-resources-rooms": {
        upstream: "get_calendar_resources_rooms",
        description: "List all room resources defined for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-resource-room": {
        upstream: "get_calendar_resource_room",
        description: "Get a single room resource by id.",
        params: [
          {
            name: "resourceId",
            type: "string",
            required: true,
            description: "Room resource ID",
          },],
        additionalProperties: true,
      },
      "list-resources-equipment": {
        upstream: "get_calendar_resources_equipments",
        description: "List all equipment resources for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-resource-equipment": {
        upstream: "get_calendar_resource_equipment",
        description: "Get a single equipment resource by id.",
        params: [
          {
            name: "resourceId",
            type: "string",
            required: true,
            description: "Equipment resource ID",
          },],
        additionalProperties: true,
      },
      "list-notifications": {
        upstream: "get_calendar_notifications",
        description: "List notification rules defined for a calendar.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar ID",
          },],
        additionalProperties: true,
      },
      "get-notification": {
        upstream: "get_calendar_notification",
        description: "Get a single calendar notification rule by id.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar ID",
          },
          {
            name: "notificationId",
            type: "string",
            required: true,
            description: "Notification ID",
          },],
        additionalProperties: true,
      },
    },
    updater: {
      create: {
        upstream: "create_calendar",
        description:
          "Create a new calendar in a calendar group. Required: groupId + name (typically) — see GHL API docs.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the calendar",
          },],
        additionalProperties: true,
      },
      update: {
        upstream: "update_calendar",
        description: "Update fields on an existing calendar.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar id.",
          },
        ],
        additionalProperties: true,
      },
      delete: {
        upstream: "delete_calendar",
        description: "Delete a calendar by id.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar id.",
          },
        ],
      },
      "create-appointment": {
        upstream: "create_appointment",
        description: "Create an appointment on a calendar.",
        params: [
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "The contact ID for whom to book the appointment",
          },
          {
            name: "startTime",
            type: "string",
            required: true,
            description: "Start time in ISO format (e.g., \"2024-01-15T10:00:00-05:00\")",
          },
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar id.",
          },
        ],
        additionalProperties: true,
      },
      "update-appointment": {
        upstream: "update_appointment",
        description: "Update an existing appointment.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-appointment": {
        upstream: "delete_appointment",
        description: "Delete an appointment by id.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment id.",
          },
        ],
      },
      // ─── Slice 11 cleanup (19 calendar write ops) ─────────
      "create-block-slot": {
        upstream: "create_block_slot",
        description: "Create a blocked-time slot on a calendar.",
        params: [
          {
            name: "startTime",
            type: "string",
            required: true,
            description: "Start time of the block in ISO format (e.g., \"2024-01-15T10:00:00-05:00\")",
          },
          {
            name: "endTime",
            type: "string",
            required: true,
            description: "End time of the block in ISO format (e.g., \"2024-01-15T12:00:00-05:00\")",
          },],
        additionalProperties: true,
      },
      "update-block-slot": {
        upstream: "update_block_slot",
        description: "Update a blocked-time slot.",
        params: [
          {
            name: "blockSlotId",
            type: "string",
            required: true,
            description: "The unique ID of the block slot to update",
          },],
        additionalProperties: true,
      },
      "create-group": {
        upstream: "create_calendar_group",
        description: "Create a new calendar group.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Group name",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Group description",
          },
          {
            name: "slug",
            type: "string",
            required: true,
            description: "URL slug for the group",
          },],
        additionalProperties: true,
      },
      "update-group": {
        upstream: "update_calendar_group",
        description: "Update an existing calendar group.",
        params: [
          {
            name: "groupId",
            type: "string",
            required: true,
            description: "Calendar group ID",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Group name",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Group description",
          },
          {
            name: "slug",
            type: "string",
            required: true,
            description: "URL slug for the group",
          },],
        additionalProperties: true,
      },
      "delete-group": {
        upstream: "delete_calendar_group",
        description: "Delete a calendar group.",
        params: [
          {
            name: "groupId",
            type: "string",
            required: true,
            description: "Calendar group ID",
          },],
        additionalProperties: true,
      },
      "disable-group": {
        upstream: "disable_calendar_group",
        description: "Disable a calendar group (without deleting).",
        params: [
          {
            name: "groupId",
            type: "string",
            required: true,
            description: "Calendar group ID",
          },
          {
            name: "isActive",
            type: "boolean",
            required: true,
            description: "Whether to enable (true) or disable (false) the group",
          },],
        additionalProperties: true,
      },
      "validate-group-slug": {
        upstream: "validate_group_slug",
        description: "Validate a calendar-group URL slug for availability.",
        params: [
          {
            name: "slug",
            type: "string",
            required: true,
            description: "Slug to validate",
          },],
        additionalProperties: true,
      },
      "create-appointment-note": {
        upstream: "create_appointment_note",
        description: "Create a note on an appointment.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment ID",
          },
          {
            name: "body",
            type: "string",
            required: true,
            description: "Note content",
          },],
        additionalProperties: true,
      },
      "update-appointment-note": {
        upstream: "update_appointment_note",
        description: "Update an existing appointment note.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment ID",
          },
          {
            name: "noteId",
            type: "string",
            required: true,
            description: "Note ID",
          },
          {
            name: "body",
            type: "string",
            required: true,
            description: "Updated note content",
          },],
        additionalProperties: true,
      },
      "delete-appointment-note": {
        upstream: "delete_appointment_note",
        description: "Delete an appointment note.",
        params: [
          {
            name: "appointmentId",
            type: "string",
            required: true,
            description: "Appointment ID",
          },
          {
            name: "noteId",
            type: "string",
            required: true,
            description: "Note ID",
          },],
        additionalProperties: true,
      },
      "create-resource-room": {
        upstream: "create_calendar_resource_room",
        description: "Create a room resource for calendar bookings.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Room name",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Room description",
          },
          {
            name: "quantity",
            type: "number",
            required: true,
            description: "Total quantity available",
          },
          {
            name: "outOfService",
            type: "number",
            required: true,
            description: "Number currently out of service",
          },
          {
            name: "capacity",
            type: "number",
            required: true,
            description: "Room capacity",
          },
          {
            name: "calendarIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Associated calendar IDs",
          },],
        additionalProperties: true,
      },
      "update-resource-room": {
        upstream: "update_calendar_resource_room",
        description: "Update a room resource.",
        params: [
          {
            name: "resourceId",
            type: "string",
            required: true,
            description: "Room resource ID",
          },],
        additionalProperties: true,
      },
      "delete-resource-room": {
        upstream: "delete_calendar_resource_room",
        description: "Delete a room resource.",
        params: [
          {
            name: "resourceId",
            type: "string",
            required: true,
            description: "Room resource ID",
          },],
        additionalProperties: true,
      },
      "create-resource-equipment": {
        upstream: "create_calendar_resource_equipment",
        description: "Create an equipment resource for calendar bookings.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Equipment name",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Equipment description",
          },
          {
            name: "quantity",
            type: "number",
            required: true,
            description: "Total quantity available",
          },
          {
            name: "outOfService",
            type: "number",
            required: true,
            description: "Number currently out of service",
          },
          {
            name: "capacity",
            type: "number",
            required: true,
            description: "Capacity per unit",
          },
          {
            name: "calendarIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Associated calendar IDs",
          },],
        additionalProperties: true,
      },
      "update-resource-equipment": {
        upstream: "update_calendar_resource_equipment",
        description: "Update an equipment resource.",
        params: [
          {
            name: "resourceId",
            type: "string",
            required: true,
            description: "Equipment resource ID",
          },],
        additionalProperties: true,
      },
      "delete-resource-equipment": {
        upstream: "delete_calendar_resource_equipment",
        description: "Delete an equipment resource.",
        params: [
          {
            name: "resourceId",
            type: "string",
            required: true,
            description: "Equipment resource ID",
          },],
        additionalProperties: true,
      },
      "create-notification": {
        upstream: "create_calendar_notifications",
        description: "Create a calendar notification rule.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar ID",
          },
          {
            name: "notifications",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of notification configurations",
          },],
        additionalProperties: true,
      },
      "update-notification": {
        upstream: "update_calendar_notification",
        description: "Update a calendar notification rule.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar ID",
          },
          {
            name: "notificationId",
            type: "string",
            required: true,
            description: "Notification ID",
          },],
        additionalProperties: true,
      },
      "delete-notification": {
        upstream: "delete_calendar_notification",
        description: "Delete a calendar notification rule.",
        params: [
          {
            name: "calendarId",
            type: "string",
            required: true,
            description: "Calendar ID",
          },
          {
            name: "notificationId",
            type: "string",
            required: true,
            description: "Notification ID",
          },],
        additionalProperties: true,
      },
    },
  },

  opportunities: {
    reader: {
      search: {
        upstream: "search_opportunities",
        description:
          "Search opportunities in the location with optional filters (pipelineId, status, contactId, etc.). Returns paginated results.",
        params: [],
        additionalProperties: true,
      },
      get: {
        upstream: "get_opportunity",
        description: "Get a single opportunity by id.",
        params: [
          {
            name: "opportunityId",
            type: "string",
            required: true,
            description: "Opportunity id.",
          },
        ],
      },
      "list-pipelines": {
        upstream: "get_pipelines",
        description: "List all pipelines and stages in the location.",
        params: [],
      },
    },
    updater: {
      create: {
        upstream: "create_opportunity",
        description:
          "Create a new opportunity in a pipeline stage. Required: pipelineId + name (typically) — see GHL API docs.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name/title of the opportunity",
          },
          {
            name: "pipelineId",
            type: "string",
            required: true,
            description: "ID of the pipeline this opportunity belongs to",
          },
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "ID of the contact associated with this opportunity",
          },],
        additionalProperties: true,
      },
      update: {
        upstream: "update_opportunity",
        description: "Update fields on an existing opportunity.",
        params: [
          {
            name: "opportunityId",
            type: "string",
            required: true,
            description: "Opportunity id.",
          },
        ],
        additionalProperties: true,
      },
      "update-status": {
        upstream: "update_opportunity_status",
        description:
          "Update an opportunity's status (open / won / lost / abandoned).",
        params: [
          {
            name: "opportunityId",
            type: "string",
            required: true,
            description: "Opportunity id.",
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "New status (open, won, lost, abandoned).",
          },
        ],
      },
      upsert: {
        upstream: "upsert_opportunity",
        description:
          "Create-or-update an opportunity, matching by external id or fields.",
        params: [
          {
            name: "pipelineId",
            type: "string",
            required: true,
            description: "ID of the pipeline this opportunity belongs to",
          },
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "ID of the contact associated with this opportunity",
          },],
        additionalProperties: true,
      },
      delete: {
        upstream: "delete_opportunity",
        description: "Delete an opportunity by id.",
        params: [
          {
            name: "opportunityId",
            type: "string",
            required: true,
            description: "Opportunity id.",
          },
        ],
      },
      // ─── Slice 11 cleanup (2 opportunity write ops) ───────
      "add-followers": {
        upstream: "add_opportunity_followers",
        description: "Add follower users to an opportunity.",
        params: [
          {
            name: "followers",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of user IDs to add as followers",
          },
          {
            name: "opportunityId",
            type: "string",
            required: true,
            description: "Opportunity id.",
          },
        ],
        additionalProperties: true,
      },
      "remove-followers": {
        upstream: "remove_opportunity_followers",
        description: "Remove follower users from an opportunity.",
        params: [
          {
            name: "followers",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of user IDs to remove as followers",
          },
          {
            name: "opportunityId",
            type: "string",
            required: true,
            description: "Opportunity id.",
          },
        ],
        additionalProperties: true,
      },
    },
  },
  location: {
    reader: {
      search: {
        upstream: "search_locations",
        description:
          "Search locations the API key has access to. Optional filters by name, etc.",
        params: [],
        additionalProperties: true,
      },
      get: {
        upstream: "get_location",
        description:
          "Get a single location by id (defaults to the configured GHL_LOCATION_ID).",
        params: [],
        additionalProperties: true,
      },
      "list-tags": {
        upstream: "get_location_tags",
        description:
          "List all tags defined for the location. Pass `locationId` in params (upstream extracts it explicitly, not auto-injected).",
        params: [],
        additionalProperties: true,
      },
      "get-tag": {
        upstream: "get_location_tag",
        description: "Get a single location tag by id.",
        params: [
          {
            name: "tagId",
            type: "string",
            required: true,
            description: "Location tag id.",
          },
        ],
      },
      "search-tasks": {
        upstream: "search_location_tasks",
        description:
          "Search tasks across the location with optional filters (assignedTo, completed, dueDate, etc.).",
        params: [],
        additionalProperties: true,
      },
      "list-custom-fields": {
        upstream: "get_location_custom_fields",
        description:
          "List all custom fields defined for the location. Pass `locationId` in params.",
        params: [],
        additionalProperties: true,
      },
      "get-custom-field": {
        upstream: "get_location_custom_field",
        description: "Get a single custom field definition by id.",
        params: [
          {
            name: "customFieldId",
            type: "string",
            required: true,
            description: "Custom field id.",
          },
        ],
      },
      "list-custom-values": {
        upstream: "get_location_custom_values",
        description:
          "List all custom values defined for the location. Pass `locationId` in params.",
        params: [],
        additionalProperties: true,
      },
      "get-custom-value": {
        upstream: "get_location_custom_value",
        description: "Get a single custom value by id.",
        params: [
          {
            name: "customValueId",
            type: "string",
            required: true,
            description: "Custom value id.",
          },
        ],
      },
      "list-templates": {
        upstream: "get_location_templates",
        description:
          "List message / SMS / email templates defined for the location. Pass `locationId` in params.",
        params: [
          {
            name: "originId",
            type: "string",
            required: true,
            description: "Origin ID (required parameter)",
          },],
        additionalProperties: true,
      },
      "list-timezones": {
        upstream: "get_timezones",
        description:
          "List the IANA timezones supported by GoHighLevel. Pass `locationId` in params.",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {
      "create-tag": {
        upstream: "create_location_tag",
        description: "Create a new tag in the location.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Tag name.",
          },
        ],
        additionalProperties: true,
      },
      "update-tag": {
        upstream: "update_location_tag",
        description: "Update an existing location tag (rename, etc.).",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Updated name for the tag",
          },
          {
            name: "tagId",
            type: "string",
            required: true,
            description: "Location tag id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-tag": {
        upstream: "delete_location_tag",
        description: "Delete a location tag by id.",
        params: [
          {
            name: "tagId",
            type: "string",
            required: true,
            description: "Location tag id.",
          },
        ],
      },
      // ─── Slice 11 cleanup (10 location write ops) ─────────
      create: {
        upstream: "create_location",
        description: "Create a new sub-account location (agency-level only).",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the sub-account/location",
          },],
        additionalProperties: true,
      },
      update: {
        upstream: "update_location",
        description: "Update an existing location's settings.",
        params: [],
        additionalProperties: true,
      },
      delete: {
        upstream: "delete_location",
        description: "Delete a location (agency-level only). DESTRUCTIVE.",
        params: [],
        additionalProperties: true,
      },
      "create-custom-field": {
        upstream: "create_location_custom_field",
        description: "Create a new custom field on the location.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the custom field",
          },
          {
            name: "dataType",
            type: "string",
            required: true,
            description: "Data type of the field (TEXT, NUMBER, DATE, etc.)",
          },],
        additionalProperties: true,
      },
      "update-custom-field": {
        upstream: "update_location_custom_field",
        description: "Update an existing location custom field.",
        params: [
          {
            name: "customFieldId",
            type: "string",
            required: true,
            description: "The custom field ID to update",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Updated name of the custom field",
          },],
        additionalProperties: true,
      },
      "delete-custom-field": {
        upstream: "delete_location_custom_field",
        description: "Delete a location custom field.",
        params: [
          {
            name: "customFieldId",
            type: "string",
            required: true,
            description: "The custom field ID to delete",
          },],
        additionalProperties: true,
      },
      "create-custom-value": {
        upstream: "create_location_custom_value",
        description: "Create a new custom value on the location.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the custom value field",
          },
          {
            name: "value",
            type: "string",
            required: true,
            description: "Value to assign",
          },],
        additionalProperties: true,
      },
      "update-custom-value": {
        upstream: "update_location_custom_value",
        description: "Update an existing location custom value.",
        params: [
          {
            name: "customValueId",
            type: "string",
            required: true,
            description: "The custom value ID to update",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Updated name",
          },
          {
            name: "value",
            type: "string",
            required: true,
            description: "Updated value",
          },],
        additionalProperties: true,
      },
      "delete-custom-value": {
        upstream: "delete_location_custom_value",
        description: "Delete a location custom value.",
        params: [
          {
            name: "customValueId",
            type: "string",
            required: true,
            description: "The custom value ID to delete",
          },],
        additionalProperties: true,
      },
      "delete-template": {
        upstream: "delete_location_template",
        description:
          "Delete a message / SMS / email template from the location.",
        params: [
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "The template ID to delete",
          },],
        additionalProperties: true,
      },
    },
  },
  workflow: {
    reader: {
      list: {
        upstream: "ghl_get_workflows",
        description: "List all workflows defined for the location.",
        params: [],
      },
    },
    updater: {},
  },

  // ─── Slice 7 (GTM) ────────────────────────────────────────────────────
  email: {
    reader: {
      "get-templates": {
        upstream: "get_email_templates",
        description:
          "List email templates ('builders') defined for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-campaigns": {
        upstream: "get_email_campaigns",
        description: "List email campaigns in the location.",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {
      "create-template": {
        upstream: "create_email_template",
        description: "Create a new email template.",
        params: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Title of the new template.",
          },
          {
            name: "html",
            type: "string",
            required: true,
            description: "HTML content of the template.",
          },],
        additionalProperties: true,
      },
      "update-template": {
        upstream: "update_email_template",
        description: "Update an existing email template.",
        params: [
          {
            name: "html",
            type: "string",
            required: true,
            description: "The updated HTML content of the template.",
          },
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "Email template id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-template": {
        upstream: "delete_email_template",
        description: "Delete an email template.",
        params: [
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "Email template id.",
          },
        ],
      },
      "verify-email": {
        upstream: "verify_email",
        description:
          'Verify an email address (or contact) via GHL Email ISV — deliverability check that DEDUCTS CHARGES from the location wallet. Pass `type: "email"` + `verify: "<email-address>"` to verify by literal email, or `type: "contact"` + `verify: "<contactId>"` to verify by contact id. Routed through EmailISVTools (not EmailTools) at dispatch.',
        params: [
          {
            name: "type",
            type: "string",
            required: true,
            description: 'Verification mode — "email" or "contact".',
          },
          {
            name: "verify",
            type: "string",
            required: true,
            description:
              'Value to verify — literal email address when type="email", or contactId when type="contact".',
          },
        ],
        additionalProperties: true,
      },
    },
  },

  "social-media": {
    reader: {
      "get-accounts": {
        upstream: "get_social_accounts",
        description:
          "List the location's connected social media accounts (FB / IG / LinkedIn / TikTok / Twitter / Google).",
        params: [],
      },
      "get-platform-accounts": {
        upstream: "get_platform_accounts",
        description: "List per-platform OAuth accounts for the location.",
        params: [
          {
            name: "platform",
            type: "string",
            required: true,
            description: "Social media platform",
          },
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "OAuth account ID",
          },],
        additionalProperties: true,
      },
      "get-post": {
        upstream: "get_social_post",
        description: "Get a single social post by id.",
        params: [
          {
            name: "postId",
            type: "string",
            required: true,
            description: "Social post id.",
          },
        ],
      },
      "search-posts": {
        upstream: "search_social_posts",
        description:
          "Search/list social posts. Optional filters by platform, status, date.",
        params: [
          {
            name: "fromDate",
            type: "string",
            required: true,
            description: "Start date (ISO format)",
          },
          {
            name: "toDate",
            type: "string",
            required: true,
            description: "End date (ISO format)",
          },],
        additionalProperties: true,
      },
      "get-tags": {
        upstream: "get_social_tags",
        description: "List social-post tags.",
        params: [],
      },
      "get-tags-by-ids": {
        upstream: "get_social_tags_by_ids",
        description: "Look up multiple social-post tags by id.",
        params: [
          {
            name: "tagIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of tag IDs",
          },],
        additionalProperties: true,
      },
      "get-categories": {
        upstream: "get_social_categories",
        description: "List social-post categories.",
        params: [],
      },
      "get-category": {
        upstream: "get_social_category",
        description: "Get one social-post category by id.",
        params: [
          {
            name: "categoryId",
            type: "string",
            required: true,
            description: "Social category id.",
          },
        ],
      },
      // ─── per-platform account lookups ─────────────────────────────────
      // Sentinels: the upstream has ONE tool `get_platform_accounts` that
      // dispatches off `params.platform`. The 6 manifest ops below preserve
      // the per-platform discoverability for operators (so they don't need
      // to know the discriminator) — the social router rewrites these
      // sentinel upstream names to `get_platform_accounts` + injects the
      // platform string before dispatch. See routers/social.ts.
      "get-google-locations": {
        upstream: "get_platform_accounts_PLATFORM_google",
        description:
          "List Google Business Profile locations for an OAuth account.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected Google account id.",
          },
        ],
      },
      "get-facebook-pages": {
        upstream: "get_platform_accounts_PLATFORM_facebook",
        description: "List Facebook pages for an OAuth account.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected Facebook account id.",
          },
        ],
      },
      "get-instagram-accounts": {
        upstream: "get_platform_accounts_PLATFORM_instagram",
        description: "List Instagram accounts for an OAuth connection.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected Instagram account id.",
          },
        ],
      },
      "get-linkedin-accounts": {
        upstream: "get_platform_accounts_PLATFORM_linkedin",
        description:
          "List LinkedIn accounts (personal + pages) for an OAuth connection.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected LinkedIn account id.",
          },
        ],
      },
      "get-twitter-profile": {
        upstream: "get_platform_accounts_PLATFORM_twitter",
        description: "Get the Twitter/X profile for an OAuth connection.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected Twitter account id.",
          },
        ],
      },
      "get-tiktok-profile": {
        upstream: "get_platform_accounts_PLATFORM_tiktok",
        description: "Get the TikTok profile for an OAuth connection.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected TikTok account id.",
          },
        ],
      },
    },
    updater: {
      "create-post": {
        upstream: "create_social_post",
        description:
          "Create a social media post (single or multi-platform). Required: account-and-content fields per GHL API.",
        params: [
          {
            name: "accountIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of social media account IDs to post to",
          },
          {
            name: "summary",
            type: "string",
            required: true,
            description: "Post content/text",
          },
          {
            name: "type",
            type: "string",
            required: true,
            description: "Type of post",
          },],
        additionalProperties: true,
      },
      "update-post": {
        upstream: "update_social_post",
        description: "Update an existing social post (e.g., reschedule).",
        params: [
          {
            name: "postId",
            type: "string",
            required: true,
            description: "Social post id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-post": {
        upstream: "delete_social_post",
        description: "Delete a single social post.",
        params: [
          {
            name: "postId",
            type: "string",
            required: true,
            description: "Social post id.",
          },
        ],
      },
      "bulk-delete-posts": {
        upstream: "bulk_delete_social_posts",
        description: "Bulk-delete social posts by id list.",
        params: [
          {
            name: "postIds",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of post IDs to delete",
          },],
        additionalProperties: true,
      },
      "delete-account": {
        upstream: "delete_social_account",
        description: "Disconnect a social media account from the location.",
        params: [
          {
            name: "accountId",
            type: "string",
            required: true,
            description: "Connected social account id.",
          },
        ],
        additionalProperties: true,
      },
      "start-oauth": {
        upstream: "start_social_oauth",
        description: "Start an OAuth flow to connect a new social account.",
        params: [
          {
            name: "platform",
            type: "string",
            required: true,
            description: "Social media platform",
          },
          {
            name: "userId",
            type: "string",
            required: true,
            description: "User ID initiating OAuth",
          },],
        additionalProperties: true,
      },
    },
  },

  survey: {
    reader: {
      list: {
        upstream: "ghl_get_surveys",
        description:
          "List all surveys (and forms; GHL surfaces forms as surveys via API) for the location.",
        params: [],
        additionalProperties: true,
      },
      "list-submissions": {
        upstream: "ghl_get_survey_submissions",
        description: "List submissions for a survey/form.",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {},
  },

  // ─── forms (v1.1.4) ──────────────────────────────────────────────────
  // Upstream's SurveyTools wraps surveys only — GHL forms (Pre-Call
  // Qualifier, Newsletter, scorecard intake, etc.) are a separate v2
  // endpoint and not in upstream's tool surface. We dispatch via direct
  // axios on `upstream.client.axiosInstance` (same escape hatch the
  // contacts.search and survey.list-submissions routers use).
  //
  // GHL public API exposes only two read endpoints for forms:
  //   GET /forms/?locationId=...&limit=...&skip=...
  //   GET /forms/submissions?locationId=...&formId=...&page=...
  // There is NO /forms/{formId} get-by-id endpoint — form schema is
  // included in the list response.
  forms: {
    reader: {
      list: {
        upstream: "ghl_list_forms_DIRECT_AXIOS",
        description:
          "List all forms defined for the location (Pre-Call Qualifier, intake forms, scorecards, etc.). Form schema (fields/questions) is included in each form object — there is no separate get-by-id endpoint in GHL's public v2 API.",
        params: [
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Page size (GHL default ~100).",
          },
          {
            name: "skip",
            type: "number",
            required: false,
            description: "Pagination offset.",
          },
        ],
        additionalProperties: true,
      },
      "list-submissions": {
        upstream: "ghl_list_form_submissions_DIRECT_AXIOS",
        description:
          "List form submissions, optionally filtered by formId and date range. Each submission includes the contact id and the answers payload.",
        params: [
          {
            name: "formId",
            type: "string",
            required: false,
            description: "Filter to a single form's submissions.",
          },
          {
            name: "page",
            type: "number",
            required: false,
            description: "Page number (1-indexed).",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Page size.",
          },
          {
            name: "q",
            type: "string",
            required: false,
            description: "Free-text search across submissions.",
          },
          {
            name: "startAt",
            type: "string",
            required: false,
            description: "ISO date — earliest submission to include.",
          },
          {
            name: "endAt",
            type: "string",
            required: false,
            description: "ISO date — latest submission to include.",
          },
        ],
        additionalProperties: true,
      },
    },
    updater: {},
  },

  invoice: {
    reader: {
      list: {
        upstream: "list_invoices",
        description: "List invoices for the location.",
        params: [],
        additionalProperties: true,
      },
      get: {
        upstream: "get_invoice",
        description: "Get a single invoice by id.",
        params: [
          {
            name: "invoiceId",
            type: "string",
            required: true,
            description: "Invoice id.",
          },
        ],
        additionalProperties: true,
      },
      "list-estimates": {
        upstream: "list_estimates",
        description: "List estimates for the location.",
        params: [],
        additionalProperties: true,
      },
      "list-templates": {
        upstream: "list_invoice_templates",
        description: "List invoice templates.",
        params: [],
        additionalProperties: true,
      },
      "get-template": {
        upstream: "get_invoice_template",
        description: "Get a single invoice template by id.",
        params: [
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "Invoice template id.",
          },
        ],
        additionalProperties: true,
      },
      "list-schedules": {
        upstream: "list_invoice_schedules",
        description: "List invoice schedules (recurring billing).",
        params: [],
        additionalProperties: true,
      },
      "get-schedule": {
        upstream: "get_invoice_schedule",
        description: "Get a single invoice schedule by id.",
        params: [
          {
            name: "scheduleId",
            type: "string",
            required: true,
            description: "Invoice schedule id.",
          },
        ],
        additionalProperties: true,
      },
    },
    updater: {
      create: {
        upstream: "create_invoice",
        description: "Create a new invoice.",
        params: [
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "Contact ID",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Invoice title",
          },],
        additionalProperties: true,
      },
      "send-invoice": {
        upstream: "send_invoice",
        description: "Send an existing invoice to its contact.",
        params: [
          {
            name: "invoiceId",
            type: "string",
            required: true,
            description: "Invoice id.",
          },
        ],
        additionalProperties: true,
      },
      "create-estimate": {
        upstream: "create_estimate",
        description: "Create a new estimate.",
        params: [
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "Contact ID",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Estimate title",
          },],
        additionalProperties: true,
      },
      "send-estimate": {
        upstream: "send_estimate",
        description: "Send an existing estimate to its contact.",
        params: [
          {
            name: "estimateId",
            type: "string",
            required: true,
            description: "Estimate id.",
          },
        ],
        additionalProperties: true,
      },
      "create-from-estimate": {
        upstream: "create_invoice_from_estimate",
        description: "Convert an accepted estimate into an invoice.",
        params: [
          {
            name: "estimateId",
            type: "string",
            required: true,
            description: "Estimate id.",
          },
        ],
        additionalProperties: true,
      },
      "create-template": {
        upstream: "create_invoice_template",
        description: "Create a new invoice template.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Template name",
          },],
        additionalProperties: true,
      },
      "update-template": {
        upstream: "update_invoice_template",
        description: "Update an existing invoice template.",
        params: [
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "Invoice template id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-template": {
        upstream: "delete_invoice_template",
        description: "Delete an invoice template.",
        params: [
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "Invoice template id.",
          },
        ],
      },
      "create-schedule": {
        upstream: "create_invoice_schedule",
        description: "Create a recurring invoice schedule.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Schedule name",
          },
          {
            name: "templateId",
            type: "string",
            required: true,
            description: "Template ID",
          },
          {
            name: "contactId",
            type: "string",
            required: true,
            description: "Contact ID",
          },],
        additionalProperties: true,
      },
      "generate-invoice-number": {
        upstream: "generate_invoice_number",
        description:
          "Reserve and return the next invoice number for the location. Note: claims a number from the sequence (mutates state).",
        params: [],
        additionalProperties: true,
      },
      "generate-estimate-number": {
        upstream: "generate_estimate_number",
        description:
          "Reserve and return the next estimate number for the location. Note: claims a number from the sequence (mutates state).",
        params: [],
        additionalProperties: true,
      },
    },
  },

  // ─── Slice 8 (Revenue) ────────────────────────────────────────────────
  products: {
    reader: {
      list: {
        upstream: "ghl_list_products",
        description: "List products in the location.",
        params: [],
        additionalProperties: true,
      },
      get: {
        upstream: "ghl_get_product",
        description: "Get a single product by id.",
        params: [
          {
            name: "productId",
            type: "string",
            required: true,
            description: "Product id.",
          },
        ],
        additionalProperties: true,
      },
      "list-prices": {
        upstream: "ghl_list_prices",
        description: "List prices for a product.",
        params: [
          {
            name: "productId",
            type: "string",
            required: true,
            description: "Product ID to list prices for",
          },],
        additionalProperties: true,
      },
      "list-collections": {
        upstream: "ghl_list_product_collections",
        description: "List product collections in the location.",
        params: [],
        additionalProperties: true,
      },
      "list-inventory": {
        upstream: "ghl_list_inventory",
        description: "List product inventory levels.",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {
      create: {
        upstream: "ghl_create_product",
        description: "Create a new product.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Product name",
          },
          {
            name: "productType",
            type: "string",
            required: true,
            description: "Type of product",
          },],
        additionalProperties: true,
      },
      update: {
        upstream: "ghl_update_product",
        description: "Update an existing product.",
        params: [
          {
            name: "productId",
            type: "string",
            required: true,
            description: "Product id.",
          },
        ],
        additionalProperties: true,
      },
      delete: {
        upstream: "ghl_delete_product",
        description: "Delete a product by id.",
        params: [
          {
            name: "productId",
            type: "string",
            required: true,
            description: "Product id.",
          },
        ],
      },
      "create-price": {
        upstream: "ghl_create_price",
        description: "Create a new price (variant/SKU) on a product.",
        params: [
          {
            name: "productId",
            type: "string",
            required: true,
            description: "Product ID to create price for",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Price name/variant name",
          },
          {
            name: "type",
            type: "string",
            required: true,
            description: "Price type",
          },
          {
            name: "currency",
            type: "string",
            required: true,
            description: "Currency code (e.g., USD)",
          },
          {
            name: "amount",
            type: "number",
            required: true,
            description: "Price amount in cents",
          },],
        additionalProperties: true,
      },
      "create-collection": {
        upstream: "ghl_create_product_collection",
        description: "Create a new product collection.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Collection name",
          },
          {
            name: "slug",
            type: "string",
            required: true,
            description: "Collection URL slug",
          },],
        additionalProperties: true,
      },
    },
  },

  payments: {
    reader: {
      "list-orders": {
        upstream: "list_orders",
        description: "List orders (one-time purchases) for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-order": {
        upstream: "get_order_by_id",
        description: "Get a single order by id.",
        params: [
          {
            name: "orderId",
            type: "string",
            required: true,
            description: "Order id.",
          },
        ],
        additionalProperties: true,
      },
      "list-fulfillments": {
        upstream: "list_order_fulfillments",
        description: "List fulfillment records for an order.",
        params: [
          {
            name: "orderId",
            type: "string",
            required: true,
            description: "ID of the order",
          },],
        additionalProperties: true,
      },
      "list-subscriptions": {
        upstream: "list_subscriptions",
        description: "List subscriptions for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-subscription": {
        upstream: "get_subscription_by_id",
        description: "Get a single subscription by id.",
        params: [
          {
            name: "subscriptionId",
            type: "string",
            required: true,
            description: "Subscription id.",
          },
        ],
        additionalProperties: true,
      },
      "list-transactions": {
        upstream: "list_transactions",
        description: "List payment transactions.",
        params: [],
        additionalProperties: true,
      },
      "get-transaction": {
        upstream: "get_transaction_by_id",
        description: "Get a single transaction by id.",
        params: [
          {
            name: "transactionId",
            type: "string",
            required: true,
            description: "Transaction id.",
          },
        ],
        additionalProperties: true,
      },
      "list-coupons": {
        upstream: "list_coupons",
        description: "List coupons defined for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-coupon": {
        upstream: "get_coupon",
        description: "Get a single coupon by id.",
        params: [
          {
            name: "code",
            type: "string",
            required: true,
            description: "Coupon code",
          },
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Coupon id (upstream calls this `id`, not `couponId`).",
          },
        ],
        additionalProperties: true,
      },
      "get-custom-provider-config": {
        upstream: "get_custom_provider_config",
        description: "Get the custom payment provider config.",
        params: [],
        additionalProperties: true,
      },
      "list-whitelabel-providers": {
        upstream: "list_whitelabel_integration_providers",
        description: "List whitelabel integration providers.",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {
      "create-fulfillment": {
        upstream: "create_order_fulfillment",
        description: "Create a fulfillment record for an order.",
        params: [
          {
            name: "orderId",
            type: "string",
            required: true,
            description: "ID of the order to fulfill",
          },
          {
            name: "trackings",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Fulfillment tracking information",
          },
          {
            name: "items",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Items being fulfilled",
          },
          {
            name: "notifyCustomer",
            type: "boolean",
            required: true,
            description: "Whether to notify the customer",
          },],
        additionalProperties: true,
      },
      "create-coupon": {
        upstream: "create_coupon",
        description: "Create a new coupon.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Coupon name",
          },
          {
            name: "code",
            type: "string",
            required: true,
            description: "Coupon code",
          },
          {
            name: "discountType",
            type: "string",
            required: true,
            description: "Type of discount",
          },
          {
            name: "discountValue",
            type: "number",
            required: true,
            description: "Discount value",
          },
          {
            name: "startDate",
            type: "string",
            required: true,
            description: "Start date in YYYY-MM-DDTHH:mm:ssZ format",
          },],
        additionalProperties: true,
      },
      "update-coupon": {
        upstream: "update_coupon",
        description: "Update an existing coupon.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Coupon name",
          },
          {
            name: "code",
            type: "string",
            required: true,
            description: "Coupon code",
          },
          {
            name: "discountType",
            type: "string",
            required: true,
            description: "Type of discount",
          },
          {
            name: "discountValue",
            type: "number",
            required: true,
            description: "Discount value",
          },
          {
            name: "startDate",
            type: "string",
            required: true,
            description: "Start date in YYYY-MM-DDTHH:mm:ssZ format",
          },
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Coupon id (upstream calls this `id`, not `couponId`).",
          },
        ],
        additionalProperties: true,
      },
      "delete-coupon": {
        upstream: "delete_coupon",
        description: "Delete a coupon by id.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Coupon id (upstream calls this `id`, not `couponId`).",
          },
        ],
      },
      "create-custom-provider-config": {
        upstream: "create_custom_provider_config",
        description: "Create the custom payment provider config.",
        params: [
          {
            name: "live",
            type: "string",
            required: true,
            description: "Live payment configuration",
          },
          {
            name: "test",
            type: "string",
            required: true,
            description: "Test payment configuration",
          },],
        additionalProperties: true,
      },
      "disconnect-custom-provider-config": {
        upstream: "disconnect_custom_provider_config",
        description: "Disconnect the custom payment provider config.",
        params: [
          {
            name: "liveMode",
            type: "boolean",
            required: true,
            description: "Whether to disconnect live or test mode config",
          },],
        additionalProperties: true,
      },
      "create-custom-provider-integration": {
        upstream: "create_custom_provider_integration",
        description: "Create a custom payment provider integration.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the custom provider",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Description of the payment gateway",
          },
          {
            name: "paymentsUrl",
            type: "string",
            required: true,
            description: "URL to load in iframe for payment session",
          },
          {
            name: "queryUrl",
            type: "string",
            required: true,
            description: "URL for querying payment events",
          },
          {
            name: "imageUrl",
            type: "string",
            required: true,
            description: "Public image URL for the payment gateway logo",
          },],
        additionalProperties: true,
      },
      "delete-custom-provider-integration": {
        upstream: "delete_custom_provider_integration",
        description: "Delete a custom payment provider integration.",
        params: [],
        additionalProperties: true,
      },
      "create-whitelabel-provider": {
        upstream: "create_whitelabel_integration_provider",
        description: "Create a whitelabel integration provider.",
        params: [
          {
            name: "uniqueName",
            type: "string",
            required: true,
            description: "A unique name for the integration provider (lowercase, hyphens only)",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "The title or name of the integration provider",
          },
          {
            name: "provider",
            type: "string",
            required: true,
            description: "The type of payment provider",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "A brief description of the integration provider",
          },
          {
            name: "imageUrl",
            type: "string",
            required: true,
            description: "The URL to an image representing the integration provider",
          },],
        additionalProperties: true,
      },
    },
  },

  store: {
    reader: {
      "list-shipping-zones": {
        upstream: "ghl_list_shipping_zones",
        description: "List shipping zones for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-shipping-zone": {
        upstream: "ghl_get_shipping_zone",
        description: "Get a single shipping zone by id.",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description:
              "Shipping zone id (upstream calls this `shippingZoneId`, not `zoneId`).",
          },
        ],
        additionalProperties: true,
      },
      "list-shipping-rates": {
        upstream: "ghl_list_shipping_rates",
        description: "List shipping rates for a zone.",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description: "ID of the shipping zone",
          },],
        additionalProperties: true,
      },
      "get-shipping-rate": {
        upstream: "ghl_get_shipping_rate",
        description:
          "Get a single shipping rate by id. Upstream requires BOTH `shippingZoneId` and `shippingRateId` (rates are zone-scoped).",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description: "Parent shipping zone id.",
          },
          {
            name: "shippingRateId",
            type: "string",
            required: true,
            description: "Shipping rate id within the zone.",
          },
        ],
        additionalProperties: true,
      },
      "list-shipping-carriers": {
        upstream: "ghl_list_shipping_carriers",
        description: "List shipping carriers for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-shipping-carrier": {
        upstream: "ghl_get_shipping_carrier",
        description: "Get a single shipping carrier by id.",
        params: [
          {
            name: "shippingCarrierId",
            type: "string",
            required: true,
            description:
              "Shipping carrier id (upstream calls this `shippingCarrierId`, not `carrierId`).",
          },
        ],
        additionalProperties: true,
      },
      "get-available-rates": {
        upstream: "ghl_get_available_shipping_rates",
        description:
          "Get available shipping rates for an order (matches zone+rate config).",
        params: [
          {
            name: "country",
            type: "string",
            required: true,
            description: "Destination country code",
          },
          {
            name: "address",
            type: "string",
            required: true,
            description: "Shipping address details",
          },
          {
            name: "totalOrderAmount",
            type: "number",
            required: true,
            description: "Total order amount",
          },
          {
            name: "totalOrderWeight",
            type: "number",
            required: true,
            description: "Total order weight",
          },
          {
            name: "products",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of products in the order",
          },],
        additionalProperties: true,
      },
      "get-store-setting": {
        upstream: "ghl_get_store_setting",
        description: "Get the store-level settings (store id, etc.).",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {
      "create-shipping-zone": {
        upstream: "ghl_create_shipping_zone",
        description: "Create a new shipping zone.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the shipping zone",
          },
          {
            name: "countries",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of countries with optional state restrictions",
          },],
        additionalProperties: true,
      },
      "update-shipping-zone": {
        upstream: "ghl_update_shipping_zone",
        description: "Update an existing shipping zone.",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description:
              "Shipping zone id (upstream calls this `shippingZoneId`, not `zoneId`).",
          },
        ],
        additionalProperties: true,
      },
      "delete-shipping-zone": {
        upstream: "ghl_delete_shipping_zone",
        description: "Delete a shipping zone by id.",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description:
              "Shipping zone id (upstream calls this `shippingZoneId`, not `zoneId`).",
          },
        ],
      },
      "create-shipping-rate": {
        upstream: "ghl_create_shipping_rate",
        description: "Create a new shipping rate (within a zone).",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description: "ID of the shipping zone",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the shipping rate",
          },
          {
            name: "currency",
            type: "string",
            required: true,
            description: "Currency code (e.g., USD)",
          },
          {
            name: "amount",
            type: "number",
            required: true,
            description: "Shipping rate amount",
          },
          {
            name: "conditionType",
            type: "string",
            required: true,
            description: "Condition type for rate calculation",
          },],
        additionalProperties: true,
      },
      "update-shipping-rate": {
        upstream: "ghl_update_shipping_rate",
        description:
          "Update an existing shipping rate. Requires BOTH `shippingZoneId` and `shippingRateId`.",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description: "Parent shipping zone id.",
          },
          {
            name: "shippingRateId",
            type: "string",
            required: true,
            description: "Shipping rate id within the zone.",
          },
        ],
        additionalProperties: true,
      },
      "delete-shipping-rate": {
        upstream: "ghl_delete_shipping_rate",
        description:
          "Delete a shipping rate by id. Requires BOTH `shippingZoneId` and `shippingRateId`.",
        params: [
          {
            name: "shippingZoneId",
            type: "string",
            required: true,
            description: "Parent shipping zone id.",
          },
          {
            name: "shippingRateId",
            type: "string",
            required: true,
            description: "Shipping rate id within the zone.",
          },
        ],
      },
      "create-shipping-carrier": {
        upstream: "ghl_create_shipping_carrier",
        description: "Create a new shipping carrier.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the shipping carrier",
          },
          {
            name: "callbackUrl",
            type: "string",
            required: true,
            description: "Callback URL for carrier rate requests",
          },
          {
            name: "services",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of available services",
          },],
        additionalProperties: true,
      },
      "update-shipping-carrier": {
        upstream: "ghl_update_shipping_carrier",
        description: "Update an existing shipping carrier.",
        params: [
          {
            name: "shippingCarrierId",
            type: "string",
            required: true,
            description:
              "Shipping carrier id (upstream calls this `shippingCarrierId`, not `carrierId`).",
          },
        ],
        additionalProperties: true,
      },
      "delete-shipping-carrier": {
        upstream: "ghl_delete_shipping_carrier",
        description: "Delete a shipping carrier by id.",
        params: [
          {
            name: "shippingCarrierId",
            type: "string",
            required: true,
            description:
              "Shipping carrier id (upstream calls this `shippingCarrierId`, not `carrierId`).",
          },
        ],
      },
      "create-store-setting": {
        upstream: "ghl_create_store_setting",
        description: "Create the store-level settings record.",
        params: [
          {
            name: "shippingOrigin",
            type: "string",
            required: true,
            description: "Shipping origin address details",
          },],
        additionalProperties: true,
      },
    },
  },

  // ─── Slice 9 (Content) ────────────────────────────────────────────────
  blog: {
    reader: {
      "get-sites": {
        upstream: "get_blog_sites",
        description: "List blog sites (sub-blogs) defined for the location.",
        params: [],
        additionalProperties: true,
      },
      "get-posts": {
        upstream: "get_blog_posts",
        description:
          'List blog posts in a site. Defaults to PUBLISHED only — pass `status: "DRAFT" | "SCHEDULED" | "ARCHIVED"` to filter to a different state, or call multiple times to aggregate. GHL returns 0 results when status is omitted; the router defaults to PUBLISHED.',
        params: [
          {
            name: "blogId",
            type: "string",
            required: true,
            description:
              "Blog site id (use `get-sites` to enumerate available sites).",
          },
          {
            name: "status",
            type: "string",
            required: false,
            default: "PUBLISHED",
            description:
              'One of "DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED". Router defaults to "PUBLISHED" when omitted because GHL returns zero results otherwise.',
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Page size (upstream defaults to 10).",
          },
          {
            name: "offset",
            type: "number",
            required: false,
            description: "Pagination offset (upstream defaults to 0).",
          },
          {
            name: "searchTerm",
            type: "string",
            required: false,
            description: "Optional title/content search.",
          },
        ],
        additionalProperties: true,
      },
      "get-authors": {
        upstream: "get_blog_authors",
        description: "List blog authors.",
        params: [],
        additionalProperties: true,
      },
      "get-categories": {
        upstream: "get_blog_categories",
        description: "List blog categories.",
        params: [],
        additionalProperties: true,
      },
      "check-url-slug": {
        upstream: "check_url_slug",
        description: "Check whether a URL slug is available for a blog post.",
        params: [
          {
            name: "urlSlug",
            type: "string",
            required: true,
            description: "URL slug to check for availability",
          },],
        additionalProperties: true,
      },
    },
    updater: {
      "create-post": {
        upstream: "create_blog_post",
        description: "Create a new blog post.",
        params: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Blog post title",
          },
          {
            name: "blogId",
            type: "string",
            required: true,
            description: "Blog site ID (use get_blog_sites to find available blogs)",
          },
          {
            name: "content",
            type: "string",
            required: true,
            description: "Full HTML content of the blog post",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Short description/excerpt of the blog post",
          },
          {
            name: "imageUrl",
            type: "string",
            required: true,
            description: "URL of the featured image for the blog post",
          },
          {
            name: "imageAltText",
            type: "string",
            required: true,
            description: "Alt text for the featured image (for SEO and accessibility)",
          },
          {
            name: "urlSlug",
            type: "string",
            required: true,
            description: "URL slug for the blog post (use check_url_slug to verify availability)",
          },
          {
            name: "author",
            type: "string",
            required: true,
            description: "Author ID (use get_blog_authors to find available authors)",
          },
          {
            name: "categories",
            type: "array",
            items: { type: "string" },
            required: true,
            description: "Array of category IDs (use get_blog_categories to find available categories)",
          },],
        additionalProperties: true,
      },
      "update-post": {
        upstream: "update_blog_post",
        description: "Update an existing blog post.",
        params: [
          {
            name: "blogId",
            type: "string",
            required: true,
            description: "Blog site ID that contains the post",
          },
          {
            name: "postId",
            type: "string",
            required: true,
            description: "Blog post id.",
          },
        ],
        additionalProperties: true,
      },
    },
  },

  media: {
    reader: {
      "get-files": {
        upstream: "get_media_files",
        description: "List media files in the location's library.",
        params: [],
        additionalProperties: true,
      },
    },
    updater: {
      "upload-file": {
        upstream: "upload_media_file",
        description: "Upload a media file to the location's library.",
        params: [],
        additionalProperties: true,
      },
      "delete-file": {
        upstream: "delete_media_file",
        description: "Delete a media file from the library.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Media file id (upstream calls this `id`, not `fileId`).",
          },
        ],
        additionalProperties: true,
      },
    },
  },

  // ─── Slice 10 (Custom Data) ───────────────────────────────────────────
  "custom-field-v2": {
    reader: {
      "get-by-id": {
        upstream: "ghl_get_custom_field_by_id",
        description: "Get a custom field definition by id.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Custom field id (upstream calls this `id`, not `fieldId`).",
          },
        ],
        additionalProperties: true,
      },
      "get-by-object-key": {
        upstream: "ghl_get_custom_fields_by_object_key",
        description:
          "List all custom fields defined for a custom object (e.g., Company).",
        params: [
          {
            name: "objectKey",
            type: "string",
            required: true,
            description: "Custom object key (e.g., 'Company').",
          },
        ],
        additionalProperties: true,
      },
    },
    updater: {
      "create-field": {
        upstream: "ghl_create_custom_field",
        description: "Create a new custom field.",
        params: [
          {
            name: "dataType",
            type: "string",
            required: true,
            description: "Type of field to create",
          },
          {
            name: "fieldKey",
            type: "string",
            required: true,
            description: "Field key. Format: \"custom_object.{objectKey}.{fieldKey}\" for custom objects. Example: \"custom_object.pet.name\"",
          },
          {
            name: "objectKey",
            type: "string",
            required: true,
            description: "The object key. Format: \"custom_object.{objectKey}\" for custom objects. Example: \"custom_object.pet\"",
          },
          {
            name: "parentId",
            type: "string",
            required: true,
            description: "ID of the parent folder for organization",
          },],
        additionalProperties: true,
      },
      "update-field": {
        upstream: "ghl_update_custom_field",
        description: "Update an existing custom field.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Custom field id (upstream calls this `id`, not `fieldId`).",
          },
        ],
        additionalProperties: true,
      },
      "delete-field": {
        upstream: "ghl_delete_custom_field",
        description: "Delete a custom field by id.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Custom field id (upstream calls this `id`, not `fieldId`).",
          },
        ],
      },
      "create-folder": {
        upstream: "ghl_create_custom_field_folder",
        description: "Create a custom field folder.",
        params: [
          {
            name: "objectKey",
            type: "string",
            required: true,
            description: "Object key for the folder. Format: \"custom_object.{objectKey}\" for custom objects. Example: \"custom_object.pet\"",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Name of the folder",
          },],
        additionalProperties: true,
      },
      "update-folder": {
        upstream: "ghl_update_custom_field_folder",
        description: "Update an existing custom field folder.",
        params: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "New name for the folder",
          },
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Custom field folder id (upstream calls this `id`, not `folderId`).",
          },
        ],
        additionalProperties: true,
      },
      "delete-folder": {
        upstream: "ghl_delete_custom_field_folder",
        description: "Delete a custom field folder by id.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Custom field folder id (upstream calls this `id`, not `folderId`).",
          },
        ],
      },
    },
  },

  object: {
    reader: {
      list: {
        upstream: "get_all_objects",
        description: "List all custom object schemas defined for the location.",
        params: [],
      },
      "get-schema": {
        upstream: "get_object_schema",
        description:
          'Get a single object schema by KEY (not id). Use the `key` from `list` results — e.g. "custom_objects.webinars" for custom objects, or "contact" / "opportunity" / "business" for system objects.',
        params: [
          {
            name: "key",
            type: "string",
            required: true,
            description:
              'Object key (e.g. "custom_objects.webinars" or "contact").',
          },
          {
            name: "fetchProperties",
            type: "boolean",
            required: false,
            default: true,
            description: "Include all field/property definitions in response.",
          },
        ],
        additionalProperties: true,
      },
      "get-record": {
        upstream: "get_object_record",
        description: "Get a single custom object record by id.",
        params: [
          {
            name: "schemaKey",
            type: "string",
            required: true,
            description: "Schema key of the object",
          },
          {
            name: "recordId",
            type: "string",
            required: true,
            description: "Custom object record id.",
          },
        ],
        additionalProperties: true,
      },
      "search-records": {
        upstream: "search_object_records",
        description: "Search custom object records with optional filters.",
        params: [
          {
            name: "schemaKey",
            type: "string",
            required: true,
            description: "Schema key of the object to search in",
          },
          {
            name: "query",
            type: "string",
            required: true,
            description: "Search query using searchable properties (e.g., \"name:Buddy\" to search for records with name Buddy)",
          },],
        additionalProperties: true,
      },
    },
    updater: {
      "create-schema": {
        upstream: "create_object_schema",
        description: "Create a new custom object schema.",
        params: [
          {
            name: "labels",
            type: "string",
            required: true,
            description: "Singular and plural names for the custom object",
          },
          {
            name: "key",
            type: "string",
            required: true,
            description: "Unique key for the object (e.g., \"custom_objects.pet\"). The \"custom_objects.\" prefix is added automatically if not included",
          },
          {
            name: "primaryDisplayPropertyDetails",
            type: "string",
            required: true,
            description: "Primary property configuration for display",
          },],
        additionalProperties: true,
      },
      "update-schema": {
        upstream: "update_object_schema",
        description:
          "Update an existing object schema. Identified by `key` (NOT `schemaId`); upstream additionally requires `searchableProperties` (string[] of property names to make searchable).",
        params: [
          {
            name: "key",
            type: "string",
            required: true,
            description:
              'Object key — e.g. "custom_objects.webinars" (upstream uses `key`, not `schemaId`).',
          },
          {
            name: "searchableProperties",
            type: "array",
            items: { type: "string" },
            required: true,
            description:
              "Array of property keys to make searchable on this schema (required by upstream).",
          },
        ],
        additionalProperties: true,
      },
      "create-record": {
        upstream: "create_object_record",
        description: "Create a new custom object record.",
        params: [
          {
            name: "schemaKey",
            type: "string",
            required: true,
            description: "Schema key of the object (e.g., \"custom_objects.pet\", \"business\")",
          },
          {
            name: "properties",
            type: "string",
            required: true,
            description: "Record properties as key-value pairs (e.g., {\"name\": \"Buddy\", \"breed\": \"Golden Retriever\"})",
          },],
        additionalProperties: true,
      },
      "update-record": {
        upstream: "update_object_record",
        description: "Update an existing custom object record.",
        params: [
          {
            name: "schemaKey",
            type: "string",
            required: true,
            description: "Schema key of the object",
          },
          {
            name: "recordId",
            type: "string",
            required: true,
            description: "Custom object record id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-record": {
        upstream: "delete_object_record",
        description: "Delete a custom object record by id.",
        params: [
          {
            name: "schemaKey",
            type: "string",
            required: true,
            description: "Schema key of the object",
          },
          {
            name: "recordId",
            type: "string",
            required: true,
            description: "Custom object record id.",
          },
        ],
        additionalProperties: true,
      },
    },
  },

  association: {
    reader: {
      list: {
        upstream: "ghl_get_all_associations",
        description:
          "List all associations (custom-object relationship definitions) for the location.",
        params: [],
      },
      "get-by-id": {
        upstream: "ghl_get_association_by_id",
        description: "Get a single association by id.",
        params: [
          {
            name: "associationId",
            type: "string",
            required: true,
            description: "Association id.",
          },
        ],
        additionalProperties: true,
      },
      "get-by-key": {
        upstream: "ghl_get_association_by_key",
        description: "Get an association by its key name.",
        params: [
          {
            name: "keyName",
            type: "string",
            required: true,
            description:
              "Association key name (upstream calls this `keyName`, not `key`).",
          },
        ],
        additionalProperties: true,
      },
      "get-by-object-key": {
        upstream: "ghl_get_association_by_object_key",
        description:
          "Get associations defined for a specific custom-object key.",
        params: [
          {
            name: "objectKey",
            type: "string",
            required: true,
            description: "Custom object key.",
          },
        ],
        additionalProperties: true,
      },
      "get-relations-by-record": {
        upstream: "ghl_get_relations_by_record",
        description:
          "List relations (record-to-record links) for a single record.",
        params: [
          {
            name: "recordId",
            type: "string",
            required: true,
            description: "Custom object record id.",
          },
        ],
        additionalProperties: true,
      },
    },
    updater: {
      "create-association": {
        upstream: "ghl_create_association",
        description: "Create a new association definition.",
        params: [
          {
            name: "key",
            type: "string",
            required: true,
            description: "Unique key for the association (e.g., \"student_teacher\")",
          },
          {
            name: "firstObjectLabel",
            type: "string",
            required: true,
            description: "Label for the first object in the association (e.g., \"student\")",
          },
          {
            name: "firstObjectKey",
            type: "string",
            required: true,
            description: "Key for the first object (e.g., \"custom_objects.children\")",
          },
          {
            name: "secondObjectLabel",
            type: "string",
            required: true,
            description: "Label for the second object in the association (e.g., \"teacher\")",
          },
          {
            name: "secondObjectKey",
            type: "string",
            required: true,
            description: "Key for the second object (e.g., \"contact\")",
          },],
        additionalProperties: true,
      },
      "update-association": {
        upstream: "ghl_update_association",
        description: "Update an existing association definition.",
        params: [
          {
            name: "firstObjectLabel",
            type: "string",
            required: true,
            description: "New label for the first object in the association",
          },
          {
            name: "secondObjectLabel",
            type: "string",
            required: true,
            description: "New label for the second object in the association",
          },
          {
            name: "associationId",
            type: "string",
            required: true,
            description: "Association id.",
          },
        ],
        additionalProperties: true,
      },
      "delete-association": {
        upstream: "ghl_delete_association",
        description: "Delete an association definition by id.",
        params: [
          {
            name: "associationId",
            type: "string",
            required: true,
            description: "Association id.",
          },
        ],
      },
      "create-relation": {
        upstream: "ghl_create_relation",
        description:
          "Create a relation (record-to-record link via an association).",
        params: [
          {
            name: "associationId",
            type: "string",
            required: true,
            description: "The ID of the association to use for this relation",
          },
          {
            name: "firstRecordId",
            type: "string",
            required: true,
            description: "ID of the first record (e.g., contact ID if contact is first object in association)",
          },
          {
            name: "secondRecordId",
            type: "string",
            required: true,
            description: "ID of the second record (e.g., custom object record ID if custom object is second object)",
          },],
        additionalProperties: true,
      },
      "delete-relation": {
        upstream: "ghl_delete_relation",
        description: "Delete a relation by id.",
        params: [
          {
            name: "relationId",
            type: "string",
            required: true,
            description: "Relation id.",
          },
        ],
        additionalProperties: true,
      },
    },
  },
} as const;
