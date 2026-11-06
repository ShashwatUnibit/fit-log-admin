# Frontend guide: OTP switch (`isOtpEnabled`) in App Configuration

Audience: admin-panel frontend developer. Verified against the backend code; not yet called at runtime.

## 1. What this feature is
`isOtpEnabled` (boolean) is a setting in the app configuration. It tells the **user app** whether login asks for an OTP.
- `true`  = OTP is asked at login. `false` = OTP is skipped.
- It is set **per platform** (`android`, `ios`). Each platform has one **base** config; every app version inherits from it.
- A version config can hold its own `isOtpEnabled` (an override). If it does not, it uses the base value.
- Only a **superAdmin** can change it. Everyone else gets 403.

The database already has `isOtpEnabled: true` on the existing base config, so the first read returns a value.

## 2. Request rules (same as every `/app-config` call)
| Item | Rule |
|---|---|
| Base URL | `/api/v1/app-config` |
| Headers | `Authorization: Bearer <admin JWT>`, `x-app-id`, `x-app-version`, `x-app-platform` (the admin app's own values) |
| Admin id | Do NOT send `x-user-id`. The server takes it from the JWT. |
| Encryption | Use your existing request/response encryption helper. Body goes as `{ "data": "<AES string>" }` plus the `hash` header, and `data` in the response is AES-encrypted. The examples below show the **decrypted** JSON. |
| Dev shortcut | In dev only, `?enc=false` turns encryption off, which helps when testing in Postman. |

Every response has `status` (`"success" | "error" | "fail"`), `message`, and optional `data`.

## 3. Reading the value
### 3a. List screen: `GET /list`
Use the base config of each platform as the source of truth for the switch.
```json
{ "status": "success", "message": "App configurations fetched successfully",
  "data": { "platforms": [
    { "platform": "android",
      "base": { "_id": "...", "appVersion": "base", "isBase": true,
                "isOtpEnabled": true, "overrides": ["appName", "isOtpEnabled", "..."],
                "updatedAt": "2026-11-06T10:00:00.000Z" },
      "versions": [ { "_id": "...", "appVersion": "1.2.3", "isBase": false, "overrides": [] } ] },
    { "platform": "ios", "base": null, "versions": [] } ] } }
```
- `base` can be `null` (no base created yet). Disable the switch and show "Create the base configuration first".
- On a version row, `isOtpEnabled` is present only when that version overrides it. `overrides` lists such fields.

### 3b. What users really get: `GET /effective?platform=android&appVersion=1.2.3`
```json
{ "data": { "found": true, "config": { "isOtpEnabled": false, "platform": "android", "appVersion": "1.2.3" },
            "sources": { "isOtpEnabled": "version" } } }
```
`sources.isOtpEnabled` is `"base"` or `"version"`. Use it to show "Inherited from base" or "Overridden for this version".
If `found` is `false`, `message` explains why (no base / no version document).

## 4. Turning OTP on/off for a platform (main action)
`PATCH /otp`
```json
{ "platform": "android", "enabled": false }
```
- `platform`: `"android"` or `"ios"`.
- `enabled`: a real boolean. The string `"false"` returns 400.

Success, HTTP 200:
```json
{ "status": "success", "message": "OTP is OFF for android",
  "data": { "updated": 1, "platform": "android", "isOtpEnabled": false } }
```
- `updated` = number of config documents changed. `0` means it already had that value (still a success, show "No change").
- The server changes the base, and also any version that has its own override, so the switch always takes effect.

| HTTP | `status` | When | Suggested UI |
|---|---|---|---|
| 400 | error | invalid body (message says which field) | show `message`, revert the toggle |
| 401 | - | missing or expired token | go to login |
| 403 | error | not a superAdmin | hide or disable the control; show `message` |
| 409 | error | no base config for that platform | "Create the base configuration first" |
| 500 | fail | server error | generic error, revert the toggle |

## 5. Optional: override for one version
Use the generic update endpoint with the config `_id` from `/list`.

Set an override:
```
PATCH /:id
{ "expectedUpdatedAt": "<updatedAt of that config from /list>", "set": { "isOtpEnabled": false } }
```
Go back to inheriting the base value (version configs only; the base cannot unset fields):
```
PATCH /:id
{ "expectedUpdatedAt": "<updatedAt>", "unset": ["isOtpEnabled"] }
```
- `expectedUpdatedAt` is required (use `null` only if the config has no `updatedAt`).
- 409 with "This configuration was changed by someone else..." means it is stale. Reload `/list` and let the admin retry.
- Success returns the updated config in `data` (same shape as one item in `/list`). `message` is "Nothing to change" when the value was already the same.
- The generic `set` also works on the base config, but prefer `PATCH /otp` for the platform-wide switch.

## 6. Suggested UI
1. A card "OTP login" with one toggle per platform, bound to `platforms[].base.isOtpEnabled`.
2. Toggle is disabled while the request runs and when `base` is `null`. Hide it, or show it read-only, for non-superAdmin users.
3. Ask for confirmation before turning OFF: "Users on <platform> will log in without an OTP."
4. On a 200, set the toggle from `data.isOtpEnabled`, show `message` as a toast, then refetch `/list`.
5. On any error, revert the toggle and show `message`.
6. Optional: in the version table show a badge "OTP: overridden" when `isOtpEnabled` is present on a version, with a "Reset to base" action (section 5, `unset`).
7. History: `GET /history?platform=android&page=1&limit=20` lists changes. OTP switches appear with `action: "otp"` and a `changes` entry `{ "path": "isOtpEnabled", "before": true, "after": false }`. Show "OTP turned off" for these. An existing "Restore" action works for them.

## 7. Test checklist
- Toggle android off: 200, `data.isOtpEnabled=false`, `/list` shows `false`, `/effective` shows `false`.
- Toggle to the same value: 200 with `updated: 0`.
- Platform with no base: 409.
- Non-superAdmin token: 403.
- `"enabled": "false"` (string): 400.
- A version with an override still follows the switch after `PATCH /otp`.

## 8. Not covered here
The **user app** must read `isOtpEnabled` from its config response and skip the OTP step when it is `false`. This repo only stores and manages the value.
