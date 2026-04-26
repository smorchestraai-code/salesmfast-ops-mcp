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

---

## Totals

- Reader operations: **15**
- Updater operations: **18**
- Total: **33**

Phase 1 vertical slice ships only `ghl-calendars-reader`. Other categories register
when their per-category slice lands in a subsequent PR.
