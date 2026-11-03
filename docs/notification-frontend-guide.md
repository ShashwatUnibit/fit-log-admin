# Push Notifications: Frontend Implementation Guide

Base path: `/api/v1/notification`. All calls need the admin session. A **reference implementation** already exists in the Flutter admin app (`D:\StudioProjects\fit_log_admin`, folder `lib/ui/features/notifications/`); the file names are listed in section 8. This guide is framework-neutral, so you can use it for any stack.

---

## 1. What you are building

One page with three tabs:

| Tab | What it does |
|---|---|
| **Compose** | Write a notification, choose who gets it (everyone, a segment, or chosen users), send now or schedule, send a test to yourself, save as a template |
| **History** | Every notification sent or scheduled, with delivery numbers; cancel a scheduled one; retry failed deliveries |
| **Templates** | Saved titles and messages to reuse |

---

## 2. Transport rules (every call)

Same as the other admin APIs (see `banner-frontend-guide.md` section 1):

- Headers: `Authorization: Bearer <jwt>`, `x-app-id`, `x-app-version`, `x-app-platform`, `Content-Type: application/json`.
- **POST / PATCH**: body AES-encrypted as `{ "data": "<ciphertext>" }`. A POST with no real body (cancel, retry) must still send an encrypted `{}`.
- **GET / DELETE**: header `hash` = AES-encrypt of the full request path **including the query string**.
- **Responses**: `status` and `message` are plain text; `data`, when present, is an AES string, so decrypt it and `JSON.parse` it.
- Local development only: `?enc=false` disables encryption in both directions. Never ship it.
- Examples below show payloads and responses **decrypted**.

Envelope: `{ "status": "success" | "error" | "fail", "message": "...", "data": ... }`

| HTTP | `status` | Meaning | What to do |
|---|---|---|---|
| 200 | `success` | Done | Use `data` |
| 400 / 404 / 409 / 503 | `error` | Something the admin can act on | Show `message` as it is |
| 401 | `error` | Session expired | Go to login |
| 500 | `fail` | Server problem | Show "Something went wrong, please try again." (never the raw message) |

---

## 3. Data shapes

### 3.1 Audience (what you send)
`type` decides which other fields are allowed. Extra fields are rejected with a 400.

```jsonc
// everyone: every active user who has a device registered
{ "type": "all" }

// chosen users: 1 to 500 unique 24-character user ids (inactive users allowed)
{ "type": "users", "userIds": ["65f1a2b3c4d5e6f7a8b9c0d1"] }

// a segment: every filter you send must match; send only the ones you need
{
  "type": "segment",
  "premium": "premium" | "free",
  "status": "inactive",                 // omit for active users (the default)
  "platform": "android" | "ios",
  "registration": "completed" | "incomplete",
  "appVersions": ["1.2.0", "1.2.1"]     // exact versions, 1 to 20
}
```

### 3.2 Content (what you send)
| Field | Required | Rules |
|---|---|---|
| `title` | yes | 1 to 65 characters |
| `body` | yes | 1 to 240 characters |
| `imageUrl` | no | http(s) URL. Upload the file first with `POST /api/v1/upload/image` (multipart field `image`, max 5 MB, not encrypted) and use `data.url` |
| `screen` | no | up to 100 characters; a screen name the **mobile app** understands |
| `url` | no | http(s) link |

An empty string counts as "not set". Do not send unknown fields.

### 3.3 Notification (what you receive)
```json
{
  "_id": "6720a1f5c2b4a8d3e9f01234",
  "title": "Drink some water",
  "body": "Log your next glass in Fit Log.",
  "imageUrl": null,
  "screen": "water-tracker",
  "url": null,
  "audience": { "type": "segment", "premium": "free", "platform": "android" },
  "status": "partial",
  "scheduledAt": null,
  "startedAt": "2026-11-03T09:00:00.000Z",
  "completedAt": "2026-11-03T09:01:00.000Z",
  "stats": { "targeted": 120, "withoutToken": 14, "sent": 118, "failed": 2 },
  "failureReasons": [{ "code": "messaging/internal-error", "count": 2 }],
  "errorMessage": null,
  "createdBy": "6720a1f5c2b4a8d3e9f00001",
  "createdByName": "Priya Admin",
  "canCancel": false,
  "canRetry": true,
  "createdAt": "2026-11-03T09:00:00.000Z",
  "updatedAt": "2026-11-03T09:01:00.000Z"
}
```

| `status` | Meaning | Suggested badge |
|---|---|---|
| `scheduled` | Waiting for `scheduledAt` | info |
| `sending` | Being delivered right now | info |
| `completed` | Every delivery succeeded | success |
| `partial` | Some succeeded, some failed | warning |
| `failed` | Nothing was delivered, or the run broke (see `errorMessage`) | danger |
| `cancelled` | Cancelled before it was sent | neutral |

`stats.targeted` = users who could be reached, `sent` = delivered, `failed` = delivery failed (`stats.retryable` is how many of those can be retried; a device whose token is no longer registered cannot), `withoutToken` = matching users skipped because they have no device registered.
**Use `canCancel` and `canRetry` to decide which buttons to show.** Do not work it out from `status` yourself.

### 3.4 Template
```json
{ "_id": "6720b...", "name": "Hydration nudge", "title": "Time to hydrate", "body": "Have a glass of water.", "imageUrl": null, "screen": null, "url": null, "isDeleted": false, "createdAt": "...", "updatedAt": "..." }
```

---

## 4. API reference

### 4.1 Count the audience
`POST /api/v1/notification/audience-count`

Request: `{ "audience": <3.1> }`

Success 200:
```json
{ "status": "success", "message": "Audience calculated successfully",
  "data": { "matched": 150, "reachable": 136, "withoutToken": 14 } }
```
`reachable` is how many users will actually receive it. Failure 400: `{ "status": "error", "message": "\"audience.userIds\" is required when type is \"users\"" }`
(other messages: `"audience" is a required field`, `"audience.type" must be one of [all, segment, users]`, `"audience.premium" is only allowed when type is "segment"`, `"audience.userIds" contains duplicate users`, `"audience.userIds" can contain at most 500 users`).

### 4.2 Send or schedule
`POST /api/v1/notification/send`

Request: content (3.2) + `audience` (3.1) + optional:
- `scheduledAt`: ISO date-time, **send it in UTC** (e.g. `"2026-12-01T10:00:00.000Z"`), between 1 minute and 90 days from now. Omit to send now.
- `idempotencyKey`: a fresh UUID per click (8 to 64 characters). Repeating a key returns the earlier notification instead of sending again.

```json
{
  "title": "Drink some water",
  "body": "Log your next glass in Fit Log.",
  "imageUrl": "https://cdn.example.com/water.png",
  "screen": "water-tracker",
  "audience": { "type": "segment", "premium": "free", "platform": "android" },
  "scheduledAt": "2026-12-01T10:00:00.000Z",
  "idempotencyKey": "7d9f2c9e-4c1a-4a43-9d6e-3f1e8d1f6b11"
}
```

Success 200: `data` is the notification (3.3).
- Sent now: `message` `"Notification is being sent"`, `data.status` `"sending"`. Delivery continues in the background, so the numbers in `data.stats` are still 0 for `sent` and `failed`.
- Scheduled: `message` `"Notification scheduled successfully"`, `data.status` `"scheduled"`.
- Repeated key: `message` `"Notification was already submitted"`.

Failures:
| HTTP | `message` | Notes |
|---|---|---|
| 400 | `"title" is a required field` / `"title" must be at most 65 characters` / `"body" must be at most 240 characters` / `"imageUrl" must be a valid http(s) URL` / `"url" must be a valid http(s) URL` / `"scheduledAt" must be a valid ISO date` | validation, one message at a time |
| 400 | `"scheduledAt" must be at least 1 minute in the future` or `"scheduledAt" cannot be more than 90 days ahead` | |
| 400 | `No reachable users match this audience. Users without a device token cannot be notified.` | the count was 0 |
| 409 | `Another notification is currently being sent. Wait for it to finish and try again.` | only one send at a time |
| 503 | `Push notifications are not configured on this server` (`status` is `error`) | server has no Firebase credentials |
| 401 | `Admin account not found` | |

### 4.3 Send a test to yourself
`POST /api/v1/notification/send-test`

Request: content only (3.2), no audience.

Success 200: `{ "status": "success", "message": "Test notification sent to your device" }` (no `data`).

Failures (400, `status: error`): `Your admin account has no device token, so a test cannot be delivered. Sign in from a device that supports push notifications first.` or `Test notification failed (<fcm error code>): <detail>`. The test only works when the admin's login supplied an `fcmToken`, so show the message and do not treat it as a bug. Also 503 as in 4.2.

### 4.4 History
`GET /api/v1/notification/list?page=1&limit=15&status=failed`

`page` default 1; `limit` default 15, max 50; `status` is optional and one of `scheduled, sending, completed, partial, failed, cancelled` (leave it out for all). Build the query string without a bare `?` when there are no parameters (not an issue here, since `page` and `limit` are always sent), and include it in the `hash`.

Success 200:
```json
{ "status": "success", "message": "Notifications fetched successfully",
  "data": {
    "campaigns": [ <notification 3.3>, ... ],
    "pagination": { "page": 1, "limit": 15, "totalItems": 42, "totalPages": 3 }
  } }
```
An empty history is `campaigns: []`, a success. Newest first. Failure 400: `"status" must be one of [scheduled, sending, completed, partial, failed, cancelled]`.

### 4.5 One notification
`GET /api/v1/notification/:id` → 200 `message` `"Notification fetched successfully"`, `data` = notification. 400 `"id" must be a valid id`, 404 `Notification not found`.

### 4.6 Cancel a scheduled notification
`POST /api/v1/notification/:id/cancel` (encrypted `{}` body)

200: `message` `"Notification cancelled successfully"`, `data` = the notification with `status: "cancelled"`.
409 `Only scheduled notifications can be cancelled` (it already started or was cancelled). 404 `Notification not found`.

### 4.7 Retry failed deliveries
`POST /api/v1/notification/:id/retry` (encrypted `{}` body)

200: `message` `"Retrying failed deliveries"`, `data.status` `"sending"`. Only the recipients that failed are tried again; `stats.sent` keeps its value, and `stats.failed` restarts from 0.
409 `Only notifications with retryable failed deliveries can be retried. A device that is no longer registered cannot be retried; it works again once the user opens the app.`, or the "Another notification is currently being sent" message. `canRetry` is already false when nothing can be retried, so the button is hidden in that case. 404 `Notification not found`. 503 as in 4.2.

### 4.8 Templates
| Call | Request | Success 200 | Failures |
|---|---|---|---|
| `POST /template/create` | `{ "name": "Hydration nudge", "title": "...", "body": "...", "imageUrl"?, "screen"?, "url"? }` (`name` 2 to 80 characters) | `message` `"Template created successfully"`, `data` = template | 400 validation, 400 `A template with this name already exists` |
| `GET /template/list` | none | `message` `"Templates fetched successfully"`, `data` = array of templates, newest first (`[]` when none) | |
| `PATCH /template/:id` | any of `name, title, body, imageUrl, screen, url` (at least one) | `message` `"Template updated successfully"`, `data` = template | 400 `At least one field is required`, 400 duplicate name, 404 `Template not found` |
| `DELETE /template/:id` | none | `message` `"Template deleted successfully"` (no `data`) | 404 `Template not found` |

### 4.9 Errors that can happen on any call
`400 Invalid request` (wrong `hash` or undecryptable body), `400 Invalid JSON payload`, `401` (expired session), `500` `status: fail`.

### 4.10 Find users (for "Specific users")
Reuse the existing Users API: `GET /api/v1/users/list?page=1&filter=all&search=<text>`. Each user has `_id`, `fullName`, `email`, `mobile`. Show the first page (15) and ask the admin to narrow the search when `pagination.totalItems` is larger.

---

## 5. Step-by-step implementation

### Step 1: API module
Create one module with five typed functions plus the template ones, and have every one return `{ ok, message, data }` instead of throwing:
`getAudienceCount(audience)`, `send(payload)`, `sendTest(content)`, `getHistory({page, limit, status})`, `cancel(id)`, `retry(id)`, `getTemplates()`, `createTemplate(payload)`, `deleteTemplate(id)`.
Handle encryption, the `hash` header and the envelope here, once. Map `status: "fail"` to the generic retry message.

### Step 2: Types and enums
Define the types in section 3 (`Audience`, `Notification`, `Template`, `AudienceCount`, `Pagination`) and the enums (audience type, premium, status, platform, registration, notification status). Keep the exact wire strings (`"all"`, `"segment"`, `"users"`, and so on). Give each notification status a label and a badge tone.

### Step 3: State, one store per area
- **Composer store**: tab, audience kind, segment filters, selected users, count (`idle | loading | ready | failure`), scheduledAt, `sending`, `testing`, and a "draft" slot (to push a template into the form).
- **History store**: items, pagination, status filter, loading/error, ids being cancelled or retried.
- **Templates store**: items, loading/error, saving, ids being deleted.
- **User search store**: query, results, loading/error (calls 4.10).

### Step 4: Compose tab
1. Fields: template picker (hidden when there are no templates), title, message, image upload, screen, link. Validate on the client with the same limits as section 3.2 and show the live character limits.
2. **Audience**: a 3-option switch (everyone / a segment / specific users).
   - Segment: four selects (plan, account status, platform, onboarding) and one text field for app versions (comma separated, trimmed, de-duplicated). Send only the filters that were changed from their default.
   - Specific users: a search box that waits about 400 ms after typing, a result list with "Add", and the chosen users as removable chips. Do not allow duplicates.
3. **Live count**: whenever the audience changes, wait about 400 ms, then call 4.1. Ignore any answer that is not from the latest request. Show:
   - loading: "Counting who this reaches."
   - `reachable > 0`: "This reaches {reachable} users." plus "{withoutToken} matching users have no device registered and will be skipped." when `withoutToken > 0`
   - `reachable == 0`: a warning ("No users match" or "none has a device registered")
   - failure: the message with a Retry button
   - "Specific users" with nobody chosen: "Pick at least one user", and do not call the API.
4. **Schedule**: "Send now" / "Schedule". Choosing Schedule opens a date and time picker (from now to 90 days ahead); show the chosen time and a Change button. Convert to UTC before sending. Reject a time less than 1 minute away in the form.
5. **Preview**: a small phone-style box that follows the title and message as they are typed.
6. **Buttons**:
   - "Send now" (becomes "Schedule notification" when a time is set): **disabled** until the count is ready and `reachable > 0`, and while anything is in flight.
   - "Send test to me": validate, upload the image if needed, call 4.3, show the returned message either way.
   - "Save as template": validate, upload the image if needed, ask for a name, call create (4.8).
7. **Send flow**: validate → confirmation dialog ("Send to {reachable} users now?" or "Schedule for {reachable} users?", and for a schedule show the time and mention it can be cancelled) → upload the image if a file was chosen → call 4.2 with a new idempotency key → on success: toast the `message`, clear the form, clear the chosen users and the schedule, and **switch to the History tab**. On failure keep the form as it is and show the `message` in the form.
8. Keep the Compose tab alive (hidden, not destroyed) while the admin looks at History or Templates, so a half-written notification is not lost.

### Step 5: History tab
1. Filter chips: All + the six statuses. Changing a filter goes back to page 1.
2. Each row shows: title, audience summary (build it from `audience`, e.g. "Free · Active users · Android", "3 specific users", "All active users"), status badge, the message, `Reached {targeted} users · Delivered {sent} · Failed {failed} · No device {withoutToken}`, the time ("Scheduled for …" for `scheduled`, otherwise "Sent …" using `startedAt`) with "by {createdByName}", the screen/link if any, each `failureReasons` entry as `code: count`, and `errorMessage` in a danger box when present.
3. Buttons: **Cancel** only when `canCancel` (confirm first, 4.6); **Retry failed** only when `canRetry` (4.7). Disable them while the call runs. After either call, reload the list whatever the answer was, since the screen may be stale. Show the returned `message` in a toast.
4. **Auto refresh**: while any item on the page has `status: "sending"`, reload the list silently every 5 seconds (no loading state, ignore failures). Stop as soon as none is sending and when the tab closes.
5. Pager when `totalPages > 1`: "Showing {first}–{last} of {totalItems}".
6. States: skeleton on first load, empty state ("Notifications you send will show up here"), danger box with Retry on failure.

### Step 6: Templates tab
List the templates (name, title, message, screen/link). **Use** puts its content into the Compose tab and opens it; **Delete** asks first, then calls DELETE and reloads (on a 404, reload quietly). Empty state points back to Compose. Same skeleton/error/empty states as History.

### Step 7: Quality checklist
- Every value that comes from the server (titles, names, counts, ids, dates, messages) is real text the admin can select and copy.
- Every action has a loading state; nothing can be double-submitted.
- Times are shown in the admin's local time and sent in UTC.
- No raw server `fail` messages, no ciphertext, no stack traces in the UI.
- Test with `?enc=false` first, then with encryption on.
- Add tests for: the count (debounce, stale answers), the send payload (audience, UTC time, idempotency key), a refused send keeping the form, cancel/retry button visibility, and the polling stopping.

---

## 6. Behaviours to know
- Delivery is **asynchronous**. A 200 from `/send` means "accepted", not "delivered"; results appear in History.
- Only one notification can be `sending` at a time (409 otherwise). Retry is also blocked while one is sending.
- A notification stuck in `sending` for 30 minutes without progress is marked `failed` by the server; use Retry.
- Users with no registered device are never errors; they are counted in `withoutToken`.
- Deactivated users are excluded unless you pick them individually or use `status: "inactive"`.
- The mobile app has to read the push data (`screen`, `url`, `campaignId`, `type: "admin_broadcast"`) to open a screen. Confirm that with the mobile team before promising the behaviour.

## 7. Not included
Open and click tracking, an in-app notification inbox, and editing a scheduled notification (cancel it and create a new one).

## 8. Reference implementation (Flutter admin app)
`lib/core/enum/notification.enum.dart`, `lib/data/models/rest/notification.model.dart`, `lib/data/repositories/notification.repository.dart`, `lib/core/apis/url.api.dart` (notification URLs), `lib/ui/features/notifications/` (`view/`, `viewmodels/` with the four stores, `widgets/`), tests in `test/ui/features/notifications_test.dart`, `test/helpers/fake_notification_repository.dart`.
