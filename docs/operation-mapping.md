# Operation mapping

Auto-generated from `src/operations.ts` by `scripts/gen-mapping-doc.ts`.
Do not edit by hand. Re-run with `npm run docs:mapping` (also runs as
`prebuild` before `tsc`, so the doc cannot drift from the manifest).

Each operation maps to one upstream tool name. The router exposes the
operation as `<router-name>.<operation>` via the `selectSchema` discriminated union.

## contacts

### `ghl-contacts-reader` (9 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_contacts` | Search contacts in the location with optional filters (query, pageLimit, etc.). Returns paginated results. |
| `get` | `get_contact` | Get a single contact by id. |
| `get-by-business` | `get_contacts_by_business` | List contacts associated with a business id. |
| `get-duplicate` | `get_duplicate_contact` | Find a duplicate contact by email or phone in the location. |
| `list-tasks` | `get_contact_tasks` | List tasks attached to a contact. |
| `get-task` | `get_contact_task` | Get a single task by id. |
| `list-notes` | `get_contact_notes` | List notes attached to a contact. |
| `get-note` | `get_contact_note` | Get a single note by id. |
| `list-appointments` | `get_contact_appointments` | List appointments attached to a contact. |

### `ghl-contacts-updater` (18 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `create_contact` | Create a new contact. Many optional fields supported (firstName, lastName, email, phone, tags, customFields, etc.) — see GHL API docs. |
| `update` | `update_contact` | Update fields on an existing contact. |
| `upsert` | `upsert_contact` | Create-or-update a contact, matching by email or phone. Required matcher fields supplied in payload. |
| `delete` | `delete_contact` | Delete a contact by id. |
| `add-tags` | `add_contact_tags` | Add tags to a contact. |
| `remove-tags` | `remove_contact_tags` | Remove tags from a contact. |
| `create-task` | `create_contact_task` | Create a task on a contact. Title required; optional body, dueDate, completed, assignedTo. |
| `update-task` | `update_contact_task` | Update a task on a contact. |
| `delete-task` | `delete_contact_task` | Delete a task from a contact. |
| `update-task-completion` | `update_task_completion` | Toggle a task's completion status. |
| `create-note` | `create_contact_note` | Create a note on a contact. |
| `update-note` | `update_contact_note` | Update a note on a contact. |
| `delete-note` | `delete_contact_note` | Delete a note from a contact. |
| `add-to-campaign` | `add_contact_to_campaign` | Add a contact to a campaign. |
| `remove-from-campaign` | `remove_contact_from_campaign` | Remove a contact from a single campaign. |
| `remove-from-all-campaigns` | `remove_contact_from_all_campaigns` | Remove a contact from every campaign in the location. |
| `add-to-workflow` | `add_contact_to_workflow` | Add a contact to a workflow. Optional eventStartTime to schedule entry. |
| `remove-from-workflow` | `remove_contact_from_workflow` | Remove a contact from a workflow. |

## conversations

### `ghl-conversations-reader` (6 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_conversations` | Search conversations in the location. Optional filters: contactId, query, status, etc. Returns paginated results. |
| `get` | `get_conversation` | Get a single conversation by id. |
| `get-message` | `get_message` | Get a single message by id. |
| `get-email-message` | `get_email_message` | Get a single email message by id. |
| `get-recent-messages` | `get_recent_messages` | List recent messages in a conversation. |
| `get-message-recording` | `get_message_recording` | Get the recording (binary URL) for a voice message. |

### `ghl-conversations-updater` (9 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `send-sms` | `send_sms` | Send an SMS to a contact. Required: contactId + message. Optional: fromNumber, etc. |
| `send-email` | `send_email` | Send an email to a contact. Required: contactId. Subject/body/html/template variants supported via optional fields. |
| `create` | `create_conversation` | Create a new conversation for a contact. |
| `update` | `update_conversation` | Update fields on an existing conversation. |
| `delete` | `delete_conversation` | Delete a conversation by id. |
| `upload-attachments` | `upload_message_attachments` | Upload attachments to a conversation. |
| `update-message-status` | `update_message_status` | Update a message's delivery status. |
| `cancel-scheduled-message` | `cancel_scheduled_message` | Cancel a previously-scheduled SMS or message. |
| `cancel-scheduled-email` | `cancel_scheduled_email` | Cancel a previously-scheduled email. |

## calendars

### `ghl-calendars-reader` (6 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list-groups` | `get_calendar_groups` | List all calendar groups in the location. |
| `list` | `get_calendars` | List calendars, optionally filtered to a group. |
| `get` | `get_calendar` | Get a single calendar by id. |
| `list-events` | `get_calendar_events` | List events for a calendar in a date range. |
| `list-free-slots` | `get_free_slots` | List free slots in a calendar for a date range. |
| `get-appointment` | `get_appointment` | Get a single appointment by id. |

### `ghl-calendars-updater` (6 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `create_calendar` | Create a new calendar in a calendar group. Required: groupId + name (typically) — see GHL API docs. |
| `update` | `update_calendar` | Update fields on an existing calendar. |
| `delete` | `delete_calendar` | Delete a calendar by id. |
| `create-appointment` | `create_appointment` | Create an appointment on a calendar. |
| `update-appointment` | `update_appointment` | Update an existing appointment. |
| `delete-appointment` | `delete_appointment` | Delete an appointment by id. |

## opportunities

### `ghl-opportunities-reader` (3 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_opportunities` | Search opportunities in the location with optional filters (pipelineId, status, contactId, etc.). Returns paginated results. |
| `get` | `get_opportunity` | Get a single opportunity by id. |
| `list-pipelines` | `get_pipelines` | List all pipelines and stages in the location. |

### `ghl-opportunities-updater` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `create_opportunity` | Create a new opportunity in a pipeline stage. Required: pipelineId + name (typically) — see GHL API docs. |
| `update` | `update_opportunity` | Update fields on an existing opportunity. |
| `update-status` | `update_opportunity_status` | Update an opportunity's status (open / won / lost / abandoned). |
| `upsert` | `upsert_opportunity` | Create-or-update an opportunity, matching by external id or fields. |
| `delete` | `delete_opportunity` | Delete an opportunity by id. |

## location

### `ghl-location-reader` (11 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_locations` | Search locations the API key has access to. Optional filters by name, etc. |
| `get` | `get_location` | Get a single location by id (defaults to the configured GHL_LOCATION_ID). |
| `list-tags` | `get_location_tags` | List all tags defined for the location. |
| `get-tag` | `get_location_tag` | Get a single location tag by id. |
| `search-tasks` | `search_location_tasks` | Search tasks across the location with optional filters (assignedTo, completed, dueDate, etc.). |
| `list-custom-fields` | `get_location_custom_fields` | List all custom fields defined for the location. |
| `get-custom-field` | `get_location_custom_field` | Get a single custom field definition by id. |
| `list-custom-values` | `get_location_custom_values` | List all custom values defined for the location. |
| `get-custom-value` | `get_location_custom_value` | Get a single custom value by id. |
| `list-templates` | `get_location_templates` | List message / SMS / email templates defined for the location. |
| `list-timezones` | `get_timezones` | List the IANA timezones supported by GoHighLevel. |

### `ghl-location-updater` (3 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-tag` | `create_location_tag` | Create a new tag in the location. |
| `update-tag` | `update_location_tag` | Update an existing location tag (rename, etc.). |
| `delete-tag` | `delete_location_tag` | Delete a location tag by id. |

## workflow

### `ghl-workflow-reader` (1 operation)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `ghl_get_workflows` | List all workflows defined for the location. |

---

## Totals

- Reader operations: **36**
- Updater operations: **41**
- Total: **77**

Phase 1 vertical slice ships only `ghl-calendars-reader`. Other categories register
when their per-category slice lands in a subsequent PR.
