# Notification Controllers (`NotificationController`, `NotificationTemplateController`)

**Source**: [notification.controller.ts](../../../src/controllers/notification.controller.ts), [notificationTemplate.controller.ts](../../../src/controllers/notificationTemplate.controller.ts)  
**Routes**: [notification.route.ts](../../../src/routes/notification.route.ts), base path `/api/v1/notification` (mounted with `validateToken`)  
**Services**: [notification.service.ts](../../../src/services/notification.service.ts) (audience, delivery, scheduling), [firebase.service.ts](../../../src/services/firebase.service.ts) (FCM; reads `FIREBASE_SERVICE_ACCOUNT_PATH`, default `./firebase-service-account.json`, gitignored)  
**Models**: `NotificationCampaignDb` (`notification_campaigns`), `NotificationTemplateDb` (`notification_templates`). Separate from the user app's `NotificationLog` (that one is for reminder crons).  
**Frontend**: Flutter `lib/ui/features/notifications/` in `D:\StudioProjects\fit_log_admin`.

## Endpoints
| Method + path | Handler | Purpose |
|---|---|---|
| `POST /audience-count` | `getAudienceCount` | `{audience}` → `{matched, reachable, withoutToken}` |
| `POST /send` | `sendNotification` | Send now, or schedule when `scheduledAt` is set |
| `POST /send-test` | `sendTestNotification` | Send content to the signed-in admin's own `fcmToken` |
| `GET /list?page&limit&status` | `listCampaigns` | History, newest first (limit max 50) |
| `GET /:id` | `getCampaign` | One campaign |
| `POST /:id/cancel` | `cancelCampaign` | Only `scheduled` ones; else 409 |
| `POST /:id/retry` | `retryCampaign` | Re-sends to the stored failed recipients; else 409 |
| `POST /template/create`, `GET /template/list`, `PATCH /template/:id`, `DELETE /template/:id` | template controller | Reusable content (soft delete) |

## Payloads
Content: `title` (1-65), `body` (1-240), optional `imageUrl` (http/https), `screen` (<=100), `url` (http/https). Empty string means not set.

Audience (`type` decides which other fields are allowed; others are rejected):
- `{"type":"all"}`: every active, non-deleted user with a token.
- `{"type":"users","userIds":["<24 hex>", ...]}`: 1-500 unique ids; inactive users are allowed here.
- `{"type":"segment", premium?:"premium"|"free", status?:"inactive", platform?:"android"|"ios", registration?:"completed"|"incomplete", appVersions?:["1.2.0"]}`: filters are ANDed; active users unless `status:"inactive"`.

`/send` body: content + `audience` + optional `scheduledAt` (ISO; 1 minute to 90 days ahead) + optional `idempotencyKey` (8-64 chars; a repeat returns the existing campaign).

Campaign response fields: `_id, title, body, imageUrl, screen, url, audience, status, scheduledAt, startedAt, completedAt, stats{targeted,withoutToken,sent,failed}, failureReasons[{code,count}], errorMessage, createdBy, createdByName, canCancel, canRetry, createdAt, updatedAt`.
`status`: `scheduled | sending | completed | partial | failed | cancelled`.

## Behaviour
- Reachable = matching users with a non-empty `fcmToken`. `/send` rejects (400) when 0 are reachable; 409 if another campaign is `sending`; 400 `Push notifications are not configured on this server` (status `error`, HTTP 503) when no Firebase credentials.
- Delivery runs in the background after the response: users are streamed in batches of 500 through `FirebaseService.sendEach`; tokens FCM reports as unregistered/invalid are unset on the user (only if the stored token still matches).
- Messages carry FCM data `type: "admin_broadcast"`, `campaignId`, and `screen`/`url` when set; image goes in `notification.imageUrl` (+ APNs `mutableContent`). TTL 24 h. **The mobile app must read `screen`/`url` itself; that contract is not verified.**
- Scheduling: the every-minute cron (`CronJobsService`, primary instance only) claims due `scheduled` campaigns atomically and runs them; it also fails `sending` campaigns whose document has not changed for 30 minutes.
- Retry sets the campaign back to `sending`, resets `failed`, `retryable` and the failure list, and sends only to the stored `failedUserIds` (capped at 10000). Failures caused by a dead device token (`registration-token-not-registered`, `invalid-registration-token`) are NOT stored for retry: the token is removed from the user and works again after the user opens the app (the mobile app sends its token at every auto-login). `stats.retryable` counts the stored ones and drives `canRetry`.
- Test send needs the admin to have an `fcmToken` (set at login only if the client sends one); otherwise 400 with an explanation.
- Not covered: open/click tracking and an in-app inbox (need user-app changes).
