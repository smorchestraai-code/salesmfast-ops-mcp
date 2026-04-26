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
  "invoice",
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
        description: "List recent messages in a conversation.",
        params: [
          {
            name: "conversationId",
            type: "string",
            required: true,
            description: "Conversation id.",
          },
        ],
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
    updater: {
      create: {
        upstream: "create_calendar",
        description:
          "Create a new calendar in a calendar group. Required: groupId + name (typically) — see GHL API docs.",
        params: [],
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
        params: [],
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
        params: [],
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
        description: "List all tags defined for the location.",
        params: [],
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
        description: "List all custom fields defined for the location.",
        params: [],
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
        description: "List all custom values defined for the location.",
        params: [],
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
          "List message / SMS / email templates defined for the location.",
        params: [],
      },
      "list-timezones": {
        upstream: "get_timezones",
        description: "List the IANA timezones supported by GoHighLevel.",
        params: [],
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
        params: [],
        additionalProperties: true,
      },
      "update-template": {
        upstream: "update_email_template",
        description: "Update an existing email template.",
        params: [
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
          "Verify an email address via GHL Email ISV (deliverability check). NOTE: routed through EmailISVTools, not EmailTools — handled at dispatch closure.",
        params: [
          {
            name: "email",
            type: "string",
            required: true,
            description: "Email address to verify.",
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
        params: [],
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
        params: [],
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
        params: [],
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
      "get-google-locations": {
        upstream: "google",
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
        upstream: "facebook",
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
        upstream: "instagram",
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
        upstream: "linkedin",
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
        upstream: "twitter",
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
        upstream: "tiktok",
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
        params: [],
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
        params: [],
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
        params: [],
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
        params: [],
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
        params: [],
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
        params: [],
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
        params: [],
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
} as const;
