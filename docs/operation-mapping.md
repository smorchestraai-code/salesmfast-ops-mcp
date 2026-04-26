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

## email

### `ghl-email-reader` (2 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `get-templates` | `get_email_templates` | List email templates ('builders') defined for the location. |
| `get-campaigns` | `get_email_campaigns` | List email campaigns in the location. |

### `ghl-email-updater` (4 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-template` | `create_email_template` | Create a new email template. |
| `update-template` | `update_email_template` | Update an existing email template. |
| `delete-template` | `delete_email_template` | Delete an email template. |
| `verify-email` | `verify_email` | Verify an email address via GHL Email ISV (deliverability check). NOTE: routed through EmailISVTools, not EmailTools — handled at dispatch closure. |

## social-media

### `ghl-social-media-reader` (14 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `get-accounts` | `get_social_accounts` | List the location's connected social media accounts (FB / IG / LinkedIn / TikTok / Twitter / Google). |
| `get-platform-accounts` | `get_platform_accounts` | List per-platform OAuth accounts for the location. |
| `get-post` | `get_social_post` | Get a single social post by id. |
| `search-posts` | `search_social_posts` | Search/list social posts. Optional filters by platform, status, date. |
| `get-tags` | `get_social_tags` | List social-post tags. |
| `get-tags-by-ids` | `get_social_tags_by_ids` | Look up multiple social-post tags by id. |
| `get-categories` | `get_social_categories` | List social-post categories. |
| `get-category` | `get_social_category` | Get one social-post category by id. |
| `get-google-locations` | `google` | List Google Business Profile locations for an OAuth account. |
| `get-facebook-pages` | `facebook` | List Facebook pages for an OAuth account. |
| `get-instagram-accounts` | `instagram` | List Instagram accounts for an OAuth connection. |
| `get-linkedin-accounts` | `linkedin` | List LinkedIn accounts (personal + pages) for an OAuth connection. |
| `get-twitter-profile` | `twitter` | Get the Twitter/X profile for an OAuth connection. |
| `get-tiktok-profile` | `tiktok` | Get the TikTok profile for an OAuth connection. |

### `ghl-social-media-updater` (6 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-post` | `create_social_post` | Create a social media post (single or multi-platform). Required: account-and-content fields per GHL API. |
| `update-post` | `update_social_post` | Update an existing social post (e.g., reschedule). |
| `delete-post` | `delete_social_post` | Delete a single social post. |
| `bulk-delete-posts` | `bulk_delete_social_posts` | Bulk-delete social posts by id list. |
| `delete-account` | `delete_social_account` | Disconnect a social media account from the location. |
| `start-oauth` | `start_social_oauth` | Start an OAuth flow to connect a new social account. |

## survey

### `ghl-survey-reader` (2 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `ghl_get_surveys` | List all surveys (and forms; GHL surfaces forms as surveys via API) for the location. |
| `list-submissions` | `ghl_get_survey_submissions` | List submissions for a survey/form. |

## invoice

### `ghl-invoice-reader` (7 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `list_invoices` | List invoices for the location. |
| `get` | `get_invoice` | Get a single invoice by id. |
| `list-estimates` | `list_estimates` | List estimates for the location. |
| `list-templates` | `list_invoice_templates` | List invoice templates. |
| `get-template` | `get_invoice_template` | Get a single invoice template by id. |
| `list-schedules` | `list_invoice_schedules` | List invoice schedules (recurring billing). |
| `get-schedule` | `get_invoice_schedule` | Get a single invoice schedule by id. |

### `ghl-invoice-updater` (11 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `create_invoice` | Create a new invoice. |
| `send-invoice` | `send_invoice` | Send an existing invoice to its contact. |
| `create-estimate` | `create_estimate` | Create a new estimate. |
| `send-estimate` | `send_estimate` | Send an existing estimate to its contact. |
| `create-from-estimate` | `create_invoice_from_estimate` | Convert an accepted estimate into an invoice. |
| `create-template` | `create_invoice_template` | Create a new invoice template. |
| `update-template` | `update_invoice_template` | Update an existing invoice template. |
| `delete-template` | `delete_invoice_template` | Delete an invoice template. |
| `create-schedule` | `create_invoice_schedule` | Create a recurring invoice schedule. |
| `generate-invoice-number` | `generate_invoice_number` | Reserve and return the next invoice number for the location. Note: claims a number from the sequence (mutates state). |
| `generate-estimate-number` | `generate_estimate_number` | Reserve and return the next estimate number for the location. Note: claims a number from the sequence (mutates state). |

---

## Totals

- Reader operations: **61**
- Updater operations: **62**
- Total: **123**

Phase 1 vertical slice ships only `ghl-calendars-reader`. Other categories register
when their per-category slice lands in a subsequent PR.
