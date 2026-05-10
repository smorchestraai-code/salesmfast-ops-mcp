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
| `search` | `search_contacts` | Search contacts in the configured location. Optional params: `query` (string fuzzy match), `pageLimit` (1-100, default 25), `startAfterId`+`startAfter` (cursor pagination — pass the last contact's id and dateUpdated millis from the prior page), `filters` object with keys `email` (string), `phone` (string), `tags` (string[]), `dateAdded` ({ startDate, endDate } ISO 8601). v1.1.3 also accepts those filter keys at the top level for convenience. Returns the full paginated payload from `/contacts/search`. |
| `get` | `get_contact` | Get a single contact by id. |
| `get-by-business` | `get_contacts_by_business` | List contacts associated with a business id. |
| `get-duplicate` | `get_duplicate_contact` | Find a duplicate contact by email or phone in the location. |
| `list-tasks` | `get_contact_tasks` | List tasks attached to a contact. |
| `get-task` | `get_contact_task` | Get a single task by id. |
| `list-notes` | `get_contact_notes` | List notes attached to a contact. |
| `get-note` | `get_contact_note` | Get a single note by id. |
| `list-appointments` | `get_contact_appointments` | List appointments attached to a contact. |

### `ghl-contacts-updater` (22 operations)

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
| `add-followers` | `add_contact_followers` | Add follower users to a contact. |
| `remove-followers` | `remove_contact_followers` | Remove follower users from a contact. |
| `bulk-update-business` | `bulk_update_contact_business` | Bulk-update the business on multiple contacts. |
| `bulk-update-tags` | `bulk_update_contact_tags` | Bulk add or remove tags on multiple contacts. |

## conversations

### `ghl-conversations-reader` (8 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_conversations` | Search conversations in the location. Optional filters: contactId, query, status, etc. Returns paginated results. |
| `get` | `get_conversation` | Get a single conversation by id. |
| `get-message` | `get_message` | Get a single message by id. |
| `get-email-message` | `get_email_message` | Get a single email message by id. |
| `get-recent-messages` | `get_recent_messages` | List recent messages ACROSS conversations for the location (monitoring view, NOT scoped to a single conversation). Use `get { conversationId }` to fetch one conversation's full thread. |
| `get-message-recording` | `get_message_recording` | Get the recording (binary URL) for a voice message. |
| `get-message-transcription` | `get_message_transcription` | Get the transcription text for a voice message. |
| `download-transcription` | `download_transcription` | Download the transcription file for a voice message. |

### `ghl-conversations-updater` (12 operations)

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
| `add-inbound-message` | `add_inbound_message` | Manually log an inbound message in a conversation. |
| `add-outbound-call` | `add_outbound_call` | Manually log an outbound call in a conversation. |
| `live-chat-typing` | `live_chat_typing` | Send a typing indicator in a live-chat conversation. |

## calendars

### `ghl-calendars-reader` (14 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list-groups` | `get_calendar_groups` | List all calendar groups in the location. |
| `list` | `get_calendars` | List calendars, optionally filtered to a group. |
| `get` | `get_calendar` | Get a single calendar by id. |
| `list-events` | `get_calendar_events` | List events/appointments for a calendar in a date range. Date params accept ISO date (YYYY-MM-DD), full ISO 8601, or epoch milliseconds — upstream converts. |
| `list-free-slots` | `get_free_slots` | List free slots in a calendar for a date range. |
| `get-appointment` | `get_appointment` | Get a single appointment by id. |
| `get-blocked-slots` | `get_blocked_slots` | List blocked-time slots on a calendar. |
| `list-appointment-notes` | `get_appointment_notes` | List notes attached to an appointment. |
| `list-resources-rooms` | `get_calendar_resources_rooms` | List all room resources defined for the location. |
| `get-resource-room` | `get_calendar_resource_room` | Get a single room resource by id. |
| `list-resources-equipment` | `get_calendar_resources_equipments` | List all equipment resources for the location. |
| `get-resource-equipment` | `get_calendar_resource_equipment` | Get a single equipment resource by id. |
| `list-notifications` | `get_calendar_notifications` | List notification rules defined for a calendar. |
| `get-notification` | `get_calendar_notification` | Get a single calendar notification rule by id. |

### `ghl-calendars-updater` (25 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `create_calendar` | Create a new calendar in a calendar group. Required: groupId + name (typically) — see GHL API docs. |
| `update` | `update_calendar` | Update fields on an existing calendar. |
| `delete` | `delete_calendar` | Delete a calendar by id. |
| `create-appointment` | `create_appointment` | Create an appointment on a calendar. |
| `update-appointment` | `update_appointment` | Update an existing appointment. |
| `delete-appointment` | `delete_appointment` | Delete an appointment by id. |
| `create-block-slot` | `create_block_slot` | Create a blocked-time slot on a calendar. |
| `update-block-slot` | `update_block_slot` | Update a blocked-time slot. |
| `create-group` | `create_calendar_group` | Create a new calendar group. |
| `update-group` | `update_calendar_group` | Update an existing calendar group. |
| `delete-group` | `delete_calendar_group` | Delete a calendar group. |
| `disable-group` | `disable_calendar_group` | Disable a calendar group (without deleting). |
| `validate-group-slug` | `validate_group_slug` | Validate a calendar-group URL slug for availability. |
| `create-appointment-note` | `create_appointment_note` | Create a note on an appointment. |
| `update-appointment-note` | `update_appointment_note` | Update an existing appointment note. |
| `delete-appointment-note` | `delete_appointment_note` | Delete an appointment note. |
| `create-resource-room` | `create_calendar_resource_room` | Create a room resource for calendar bookings. |
| `update-resource-room` | `update_calendar_resource_room` | Update a room resource. |
| `delete-resource-room` | `delete_calendar_resource_room` | Delete a room resource. |
| `create-resource-equipment` | `create_calendar_resource_equipment` | Create an equipment resource for calendar bookings. |
| `update-resource-equipment` | `update_calendar_resource_equipment` | Update an equipment resource. |
| `delete-resource-equipment` | `delete_calendar_resource_equipment` | Delete an equipment resource. |
| `create-notification` | `create_calendar_notifications` | Create a calendar notification rule. |
| `update-notification` | `update_calendar_notification` | Update a calendar notification rule. |
| `delete-notification` | `delete_calendar_notification` | Delete a calendar notification rule. |

## opportunities

### `ghl-opportunities-reader` (3 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_opportunities` | Search opportunities in the location with optional filters (pipelineId, status, contactId, etc.). Returns paginated results. |
| `get` | `get_opportunity` | Get a single opportunity by id. |
| `list-pipelines` | `get_pipelines` | List all pipelines and stages in the location. |

### `ghl-opportunities-updater` (7 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `create_opportunity` | Create a new opportunity in a pipeline stage. Required: pipelineId + name (typically) — see GHL API docs. |
| `update` | `update_opportunity` | Update fields on an existing opportunity. |
| `update-status` | `update_opportunity_status` | Update an opportunity's status (open / won / lost / abandoned). |
| `upsert` | `upsert_opportunity` | Create-or-update an opportunity, matching by external id or fields. |
| `delete` | `delete_opportunity` | Delete an opportunity by id. |
| `add-followers` | `add_opportunity_followers` | Add follower users to an opportunity. |
| `remove-followers` | `remove_opportunity_followers` | Remove follower users from an opportunity. |

## location

### `ghl-location-reader` (11 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `search` | `search_locations` | Search locations the API key has access to. Optional filters by name, etc. |
| `get` | `get_location` | Get a single location by id (defaults to the configured GHL_LOCATION_ID). |
| `list-tags` | `get_location_tags` | List all tags defined for the location. Pass `locationId` in params (upstream extracts it explicitly, not auto-injected). |
| `get-tag` | `get_location_tag` | Get a single location tag by id. |
| `search-tasks` | `search_location_tasks` | Search tasks across the location with optional filters (assignedTo, completed, dueDate, etc.). |
| `list-custom-fields` | `get_location_custom_fields` | List all custom fields defined for the location. Pass `locationId` in params. |
| `get-custom-field` | `get_location_custom_field` | Get a single custom field definition by id. |
| `list-custom-values` | `get_location_custom_values` | List all custom values defined for the location. Pass `locationId` in params. |
| `get-custom-value` | `get_location_custom_value` | Get a single custom value by id. |
| `list-templates` | `get_location_templates` | List message / SMS / email templates defined for the location. Pass `locationId` in params. |
| `list-timezones` | `get_timezones` | List the IANA timezones supported by GoHighLevel. Pass `locationId` in params. |

### `ghl-location-updater` (13 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-tag` | `create_location_tag` | Create a new tag in the location. |
| `update-tag` | `update_location_tag` | Update an existing location tag (rename, etc.). |
| `delete-tag` | `delete_location_tag` | Delete a location tag by id. |
| `create` | `create_location` | Create a new sub-account location (agency-level only). |
| `update` | `update_location` | Update an existing location's settings. |
| `delete` | `delete_location` | Delete a location (agency-level only). DESTRUCTIVE. |
| `create-custom-field` | `create_location_custom_field` | Create a new custom field on the location. |
| `update-custom-field` | `update_location_custom_field` | Update an existing location custom field. |
| `delete-custom-field` | `delete_location_custom_field` | Delete a location custom field. |
| `create-custom-value` | `create_location_custom_value` | Create a new custom value on the location. |
| `update-custom-value` | `update_location_custom_value` | Update an existing location custom value. |
| `delete-custom-value` | `delete_location_custom_value` | Delete a location custom value. |
| `delete-template` | `delete_location_template` | Delete a message / SMS / email template from the location. |

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
| `verify-email` | `verify_email` | Verify an email address (or contact) via GHL Email ISV — deliverability check that DEDUCTS CHARGES from the location wallet. Pass `type: "email"` + `verify: "<email-address>"` to verify by literal email, or `type: "contact"` + `verify: "<contactId>"` to verify by contact id. Routed through EmailISVTools (not EmailTools) at dispatch. |

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
| `get-google-locations` | `get_platform_accounts_PLATFORM_google` | List Google Business Profile locations for an OAuth account. |
| `get-facebook-pages` | `get_platform_accounts_PLATFORM_facebook` | List Facebook pages for an OAuth account. |
| `get-instagram-accounts` | `get_platform_accounts_PLATFORM_instagram` | List Instagram accounts for an OAuth connection. |
| `get-linkedin-accounts` | `get_platform_accounts_PLATFORM_linkedin` | List LinkedIn accounts (personal + pages) for an OAuth connection. |
| `get-twitter-profile` | `get_platform_accounts_PLATFORM_twitter` | Get the Twitter/X profile for an OAuth connection. |
| `get-tiktok-profile` | `get_platform_accounts_PLATFORM_tiktok` | Get the TikTok profile for an OAuth connection. |

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

## forms

### `ghl-forms-reader` (2 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `ghl_list_forms_DIRECT_AXIOS` | List all forms defined for the location (Pre-Call Qualifier, intake forms, scorecards, etc.). Form schema (fields/questions) is included in each form object — there is no separate get-by-id endpoint in GHL's public v2 API. |
| `list-submissions` | `ghl_list_form_submissions_DIRECT_AXIOS` | List form submissions, optionally filtered by formId and date range. Each submission includes the contact id and the answers payload. |

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

## products

### `ghl-products-reader` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `ghl_list_products` | List products in the location. |
| `get` | `ghl_get_product` | Get a single product by id. |
| `list-prices` | `ghl_list_prices` | List prices for a product. |
| `list-collections` | `ghl_list_product_collections` | List product collections in the location. |
| `list-inventory` | `ghl_list_inventory` | List product inventory levels. |

### `ghl-products-updater` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create` | `ghl_create_product` | Create a new product. |
| `update` | `ghl_update_product` | Update an existing product. |
| `delete` | `ghl_delete_product` | Delete a product by id. |
| `create-price` | `ghl_create_price` | Create a new price (variant/SKU) on a product. |
| `create-collection` | `ghl_create_product_collection` | Create a new product collection. |

## payments

### `ghl-payments-reader` (11 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list-orders` | `list_orders` | List orders (one-time purchases) for the location. |
| `get-order` | `get_order_by_id` | Get a single order by id. |
| `list-fulfillments` | `list_order_fulfillments` | List fulfillment records for an order. |
| `list-subscriptions` | `list_subscriptions` | List subscriptions for the location. |
| `get-subscription` | `get_subscription_by_id` | Get a single subscription by id. |
| `list-transactions` | `list_transactions` | List payment transactions. |
| `get-transaction` | `get_transaction_by_id` | Get a single transaction by id. |
| `list-coupons` | `list_coupons` | List coupons defined for the location. |
| `get-coupon` | `get_coupon` | Get a single coupon by id. |
| `get-custom-provider-config` | `get_custom_provider_config` | Get the custom payment provider config. |
| `list-whitelabel-providers` | `list_whitelabel_integration_providers` | List whitelabel integration providers. |

### `ghl-payments-updater` (9 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-fulfillment` | `create_order_fulfillment` | Create a fulfillment record for an order. |
| `create-coupon` | `create_coupon` | Create a new coupon. |
| `update-coupon` | `update_coupon` | Update an existing coupon. |
| `delete-coupon` | `delete_coupon` | Delete a coupon by id. |
| `create-custom-provider-config` | `create_custom_provider_config` | Create the custom payment provider config. |
| `disconnect-custom-provider-config` | `disconnect_custom_provider_config` | Disconnect the custom payment provider config. |
| `create-custom-provider-integration` | `create_custom_provider_integration` | Create a custom payment provider integration. |
| `delete-custom-provider-integration` | `delete_custom_provider_integration` | Delete a custom payment provider integration. |
| `create-whitelabel-provider` | `create_whitelabel_integration_provider` | Create a whitelabel integration provider. |

## store

### `ghl-store-reader` (8 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list-shipping-zones` | `ghl_list_shipping_zones` | List shipping zones for the location. |
| `get-shipping-zone` | `ghl_get_shipping_zone` | Get a single shipping zone by id. |
| `list-shipping-rates` | `ghl_list_shipping_rates` | List shipping rates for a zone. |
| `get-shipping-rate` | `ghl_get_shipping_rate` | Get a single shipping rate by id. Upstream requires BOTH `shippingZoneId` and `shippingRateId` (rates are zone-scoped). |
| `list-shipping-carriers` | `ghl_list_shipping_carriers` | List shipping carriers for the location. |
| `get-shipping-carrier` | `ghl_get_shipping_carrier` | Get a single shipping carrier by id. |
| `get-available-rates` | `ghl_get_available_shipping_rates` | Get available shipping rates for an order (matches zone+rate config). |
| `get-store-setting` | `ghl_get_store_setting` | Get the store-level settings (store id, etc.). |

### `ghl-store-updater` (10 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-shipping-zone` | `ghl_create_shipping_zone` | Create a new shipping zone. |
| `update-shipping-zone` | `ghl_update_shipping_zone` | Update an existing shipping zone. |
| `delete-shipping-zone` | `ghl_delete_shipping_zone` | Delete a shipping zone by id. |
| `create-shipping-rate` | `ghl_create_shipping_rate` | Create a new shipping rate (within a zone). |
| `update-shipping-rate` | `ghl_update_shipping_rate` | Update an existing shipping rate. Requires BOTH `shippingZoneId` and `shippingRateId`. |
| `delete-shipping-rate` | `ghl_delete_shipping_rate` | Delete a shipping rate by id. Requires BOTH `shippingZoneId` and `shippingRateId`. |
| `create-shipping-carrier` | `ghl_create_shipping_carrier` | Create a new shipping carrier. |
| `update-shipping-carrier` | `ghl_update_shipping_carrier` | Update an existing shipping carrier. |
| `delete-shipping-carrier` | `ghl_delete_shipping_carrier` | Delete a shipping carrier by id. |
| `create-store-setting` | `ghl_create_store_setting` | Create the store-level settings record. |

## blog

### `ghl-blog-reader` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `get-sites` | `get_blog_sites` | List blog sites (sub-blogs) defined for the location. |
| `get-posts` | `get_blog_posts` | List blog posts in a site. Defaults to PUBLISHED only — pass `status: "DRAFT" | "SCHEDULED" | "ARCHIVED"` to filter to a different state, or call multiple times to aggregate. GHL returns 0 results when status is omitted; the router defaults to PUBLISHED. |
| `get-authors` | `get_blog_authors` | List blog authors. |
| `get-categories` | `get_blog_categories` | List blog categories. |
| `check-url-slug` | `check_url_slug` | Check whether a URL slug is available for a blog post. |

### `ghl-blog-updater` (2 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-post` | `create_blog_post` | Create a new blog post. |
| `update-post` | `update_blog_post` | Update an existing blog post. |

## media

### `ghl-media-reader` (1 operation)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `get-files` | `get_media_files` | List media files in the location's library. |

### `ghl-media-updater` (2 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `upload-file` | `upload_media_file` | Upload a media file to the location's library. |
| `delete-file` | `delete_media_file` | Delete a media file from the library. |

## custom-field-v2

### `ghl-custom-field-v2-reader` (2 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `get-by-id` | `ghl_get_custom_field_by_id` | Get a custom field definition by id. |
| `get-by-object-key` | `ghl_get_custom_fields_by_object_key` | List all custom fields defined for a custom object (e.g., Company). |

### `ghl-custom-field-v2-updater` (6 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-field` | `ghl_create_custom_field` | Create a new custom field. |
| `update-field` | `ghl_update_custom_field` | Update an existing custom field. |
| `delete-field` | `ghl_delete_custom_field` | Delete a custom field by id. |
| `create-folder` | `ghl_create_custom_field_folder` | Create a custom field folder. |
| `update-folder` | `ghl_update_custom_field_folder` | Update an existing custom field folder. |
| `delete-folder` | `ghl_delete_custom_field_folder` | Delete a custom field folder by id. |

## object

### `ghl-object-reader` (4 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `get_all_objects` | List all custom object schemas defined for the location. |
| `get-schema` | `get_object_schema` | Get a single object schema by KEY (not id). Use the `key` from `list` results — e.g. "custom_objects.webinars" for custom objects, or "contact" / "opportunity" / "business" for system objects. |
| `get-record` | `get_object_record` | Get a single custom object record by id. |
| `search-records` | `search_object_records` | Search custom object records with optional filters. |

### `ghl-object-updater` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-schema` | `create_object_schema` | Create a new custom object schema. |
| `update-schema` | `update_object_schema` | Update an existing object schema. Identified by `key` (NOT `schemaId`); upstream additionally requires `searchableProperties` (string[] of property names to make searchable). |
| `create-record` | `create_object_record` | Create a new custom object record. |
| `update-record` | `update_object_record` | Update an existing custom object record. |
| `delete-record` | `delete_object_record` | Delete a custom object record by id. |

## association

### `ghl-association-reader` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `list` | `ghl_get_all_associations` | List all associations (custom-object relationship definitions) for the location. |
| `get-by-id` | `ghl_get_association_by_id` | Get a single association by id. |
| `get-by-key` | `ghl_get_association_by_key` | Get an association by its key name. |
| `get-by-object-key` | `ghl_get_association_by_object_key` | Get associations defined for a specific custom-object key. |
| `get-relations-by-record` | `ghl_get_relations_by_record` | List relations (record-to-record links) for a single record. |

### `ghl-association-updater` (5 operations)

| Operation | Upstream tool | Description |
|-----------|---------------|-------------|
| `create-association` | `ghl_create_association` | Create a new association definition. |
| `update-association` | `ghl_update_association` | Update an existing association definition. |
| `delete-association` | `ghl_delete_association` | Delete an association definition by id. |
| `create-relation` | `ghl_create_relation` | Create a relation (record-to-record link via an association). |
| `delete-relation` | `ghl_delete_relation` | Delete a relation by id. |

---

## Totals

- Reader operations: **114**
- Updater operations: **144**
- Total: **258**

Phase 1 vertical slice ships only `ghl-calendars-reader`. Other categories register
when their per-category slice lands in a subsequent PR.
