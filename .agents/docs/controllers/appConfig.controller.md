# App Config Controller (`AppConfigController`)

**Source**: [appConfig.controller.ts](../../../src/controllers/appConfig.controller.ts), service [appConfig.service.ts](../../../src/services/appConfig.service.ts) (merge, diff, force-update builder, maintenance sync, history)  
**Route**: [appConfig.route.ts](../../../src/routes/appConfig.route.ts), base path `/api/v1/app-config` (mounted with `validateToken`)  
**Models**: `AppConfigDb` (collection `appconfigs`, shared with the user app), `AppConfigHistoryDb` (`app_config_history`, admin only)  
**Validator**: [appConfig.validator.ts](../../../src/validators/appConfig.validator.ts)  
**Frontend**: Flutter `lib/ui/features/mobile_config/`

## How the user app uses this data (user backend `appConfig.controller`)
`GET /api/v1/app-config` with headers `x-app-platform` and `x-app-version` loads two documents of the collection,
`{platform, appVersion: "base"}` and `{platform, appVersion: <the app's version>}`, and returns `{...base, ...version}`.
- **Shallow merge**: a field present on the version document replaces the base's whole value (an object included).
- **Both must exist**, otherwise the app gets 404 `Config not found` and cannot start. Every released version needs a document (it may be empty).
- The app only reads `forceUpdate.maintananceMode` and `forceUpdate.forceUpdateForPlatforms.<its platform>.enabled`. **`minVersion` is never compared**; force update means `enabled: true` on the document of the version to force. The other platform's entry inside a document is dead data.
- `forceUpdateMessage` is shown on both the maintenance and the force-update screens; `playStoreUrl` / `appStoreUrl` is where the update button goes.
- The admin schema has **no defaults**: a default (even `null`) written on a version document would override the base value in that merge. Documents created by hand have no `createdAt`/`updatedAt`.

## Endpoints (all responses use the standard envelope)
| Method + path | Handler | Notes |
|---|---|---|
| `GET /list` | `listConfigs` | `data.platforms[{platform, base, versions[]}]` for android and ios; `base` is null when none exists; versions newest first |
| `GET /effective?platform&appVersion` | `getEffective` | `data {found, missing: "base"\|"version"\|null, message, config, sources}`; always 200, it is a diagnostic |
| `POST /create` | `createConfig` | `{platform, appVersion: "base"\|"1.2.3", ...fields}`; base requires `appName, companyPolicies, forceUpdate, forceUpdateMessage`; a version needs its platform's base first (409) |
| `PATCH /:id` | `updateConfig` | `{expectedUpdatedAt: ISO\|null, set?: {...fields}, unset?: [fieldNames]}`; `unset` only on version documents |
| `PATCH /:id/force-update` | `setForceUpdate` | `{expectedUpdatedAt, enabled, minVersion?}`; writes a complete `forceUpdate` object (or removes the override when it equals the base's) |
| `POST /force-update/bulk` | `bulkForceUpdate` | `{platform, belowVersion, enabled}`; sets or lifts force update on every version document below `belowVersion`, and records `minVersion` on the base entry |
| `PATCH /maintenance` | `setMaintenance` | `{platform, enabled, message?}`; every document of the platform that holds `forceUpdate` gets the same flag |
| `DELETE /:id` | `deleteConfig` | version documents only; the base returns 409 |
| `GET /history?page&limit&platform&configId` | `getHistory` | entries without snapshots, newest first |
| `POST /history/:id/restore` | `restoreHistory` | puts the document back to the state after that change (before it, for a delete, which recreates it with its old id) |

Fields: `appName`, `companyPolicies{termsAndConditions,privacyPolicy,aboutUs}` (http(s) links, all three), `forceUpdate{maintananceMode, forceUpdateForPlatforms{ios{enabled,minVersion},android{enabled,minVersion}}}` (always complete), `forceUpdateMessage` (<=300), `supportEmail`, `supportPhone`, `playStoreUrl`, `appStoreUrl`, `apkDownloadUrl` (nullable). `appVersion` is `base` or `major.minor.patch`.

## Rules the server enforces
- **superAdmin only** for every change (403 `Only a superAdmin can change the app configuration`); reading is open to all admins.
- **Edit token**: `expectedUpdatedAt` must equal the document's current `updatedAt` (null when it has none), otherwise 409 `This configuration was changed by someone else. Reload it and try again.` The check is part of the update filter, so it is atomic.
- **Maintenance follows the base**: a version document cannot carry a different `maintananceMode` (400, use the maintenance switch). Changing it on the base, via `/maintenance` or a base edit, is copied to every document that holds `forceUpdate`.
- Turning force update on needs the platform's store link (Play Store for android, App Store for ios) on the effective configuration (400).
- No duplicate `{platform, appVersion}` (unique index plus 409); the base cannot be deleted.
- Every change is recorded in `app_config_history` with the field-level diff, a snapshot and who made it.

## Verified
Typecheck and lint clean. The flows above (including concurrency with a document that has no `updatedAt`, maintenance sync, bulk force update, delete + restore) were run end to end through the real controllers against a throwaway database seeded with copies of the two real documents; the real `appconfigs` collection was not touched.
