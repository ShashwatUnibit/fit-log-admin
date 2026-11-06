# Frontend implementation manual (admin panel)

Audience: the admin-panel frontend developer. It covers two backend additions and how to ship them without breaking existing screens:
1. **User overview vitals** (6 cards: blood pressure, blood sugar, heart rate, steps, water, mood).
2. **OTP switch** (`isOtpEnabled`) in App Configuration. The detailed OTP guide is `app-config-otp.frontend.md`; this manual summarises it and adds the rollout rules.

Written from the backend code. Not yet called at runtime, so check each response once against the real server before relying on it.

---

## 0. Rules that keep existing screens working
1. **Both changes are additive.** No existing field, endpoint, param or validator changed. Existing screens keep working untouched.
2. **Ignore unknown fields.** Do not use strict response parsers (strict Zod or Yup schemas, `exact` types) that reject extra keys. If you do, make `vitals` and `isOtpEnabled` optional first.
3. **Make the new fields optional in your types.** Deploy order is not guaranteed. Treat `data.vitals` and `isOtpEnabled` as possibly missing and render nothing in that case.
4. **Handle `null`.** Five of the six vitals can be `null` (see 1.3).
5. **Do not compute health status yourself.** Use the server's `status`. Thresholds live in one place on the backend.
6. **Do not send `x-user-id`.** The server reads it from the JWT.
7. **Ship in this order:** types and API layer, then UI behind a feature flag or at the end of the page, then test with the checklists, then enable.

## 1. User overview: vitals cards

### 1.1 Endpoint
`GET /api/v1/users/:id/overview`
- `:id` is the user's 24-character hex id. Anything else returns 400.
- No body and no query parameters.
- Headers and encryption are the same as every other admin call: `Authorization: Bearer <admin JWT>`, `x-app-id`, `x-app-version`, `x-app-platform`. In dev only, `?enc=false` turns encryption off.
- This is the same endpoint the overview page already calls. You only read the new `data.vitals`.

### 1.2 Response (decrypted)
Everything under `data` other than `vitals` is unchanged (`header`, `summary`, `account`, `biometrics`, `goalAndProfession`, `activityPreferences`, `nutritionProfile`).
```json
{
  "status": "success",
  "message": "User overview fetched successfully",
  "data": {
    "header": { "...": "unchanged" },
    "vitals": {
      "bloodPressure": { "systolic": 128, "diastolic": 79, "unit": "mmHg", "status": "Elevated", "loggedAt": "2026-11-06T07:15:00.000Z" },
      "bloodSugar":    { "value": 124, "unit": "mg/dL", "mealContext": "after_meal", "mealContextLabel": "After meal", "status": "Normal", "loggedAt": "2026-11-05T14:00:00.000Z" },
      "heartRate":     { "value": 74, "unit": "bpm", "status": "Normal", "loggedAt": "2026-11-06T07:20:00.000Z" },
      "stepsToday":    { "value": 3840, "goal": 7000, "percentOfGoal": 55, "asOf": "2026-11-06T12:15:00.000Z", "unit": "steps" },
      "waterToday":    { "value": 5, "goal": 14, "percentOfGoal": 36, "asOf": "2026-11-06T12:15:00.000Z", "unit": "glasses" },
      "latestMood":    { "mood": "happy", "label": "Happy", "sentiment": "positive", "loggedAt": "2026-11-06T09:30:00.000Z" }
    }
  }
}
```
Errors: 400 invalid id (`status: "error"`), 404 "User not found", 401 token problem, 500 `status: "fail"`.

### 1.3 Field reference and null rules
| Card | `null` possible? | Fields |
|---|---|---|
| `bloodPressure` | **Yes**, never logged | `systolic`, `diastolic` (numbers), `unit` "mmHg", `status`, `loggedAt` |
| `bloodSugar` | **Yes** | `value`, `unit` "mg/dL", `mealContext` (`before_meal`, `after_meal`, `fasting`, `random`, or `null`), `mealContextLabel` (string or `null`), `status`, `loggedAt` |
| `heartRate` | **Yes** | `value`, `unit` "bpm", `status`, `loggedAt` |
| `stepsToday` | No, `value` is 0 if nothing was logged | `value`, `goal`, `percentOfGoal`, `asOf`, `unit` "steps" |
| `waterToday` | No, `value` is 0 if nothing was logged | `value`, `goal`, `percentOfGoal`, `asOf`, `unit` "glasses" |
| `latestMood` | **Yes** | `mood`, `label`, `sentiment`, `loggedAt` |

Notes:
- `status` is one of `Low`, `Normal`, `Elevated`, `High`.
- `sentiment` is `positive`, `neutral`, `negative` or `unknown` (`unknown` only if the user app adds a mood the backend does not know yet).
- All dates are ISO strings in UTC. Convert to the viewer's timezone in the UI.
- `percentOfGoal` can be above 100. Cap the progress bar at 100% but show the real number.
- "Today" for steps and water means the **server's** current day. Do not recompute it in the browser.

### 1.4 Rendering each card (matches the design screenshot)
| Card | Big text | Chip | Small text |
|---|---|---|---|
| Blood pressure | `128/79` + "mmHg" | `status` | relative time from `loggedAt` ("5 hr ago") |
| Blood sugar | `124` + "mg/dL" | `status` | `mealContextLabel` + " · " + relative time ("After meal · 22 hr ago"); skip the label if `null` |
| Heart rate | `74` + "bpm" | `status` | relative time |
| Steps today | `3,840` + " / 7,000" | `${percentOfGoal}% of goal` | "as of 12:15" from `asOf` |
| Water today | `5` + " / 14 glasses" | `${percentOfGoal}% of goal` | "as of 12:15" |
| Latest mood | `label` | mood chip with `label` | relative time |

- Use `toLocaleString()` for thousands separators (3,840 / 7,000).
- Use the **user's** goal from the response, not a constant. The 14 glasses in the design is just that user's goal.
- If a nullable card is `null`, show a muted empty card: "No reading yet" with a dash as the value. Do not hide the card, so the grid keeps its shape.
- Chip colours: `Normal` green, `Elevated` amber, `High` red, `Low` blue (or red for heart rate and blood sugar, as the design team prefers). Always show the word as well, not only the colour.
- Mood mapping: the screenshot shows "Good", but the backend sends values like `happy` or `stressed`. Pick the chip colour from `sentiment` (positive green, neutral grey, negative amber) and show `label`. If you must show a word like "Good", map from `sentiment`, never from `mood`.
- The chevrons in the screenshot suggest drill-down pages. No history endpoint exists for these yet, so leave them out or disabled for now.

### 1.5 Relative time helper
Format as: under 1 min "just now", under 60 min "N min ago", under 24 h "N hr ago", otherwise "N d ago". Refresh it once a minute at most. Use a fixed `now` per render so cards do not disagree.

### 1.6 Suggested types
```ts
type VitalStatus = "Low" | "Normal" | "Elevated" | "High";
interface Reading { status: VitalStatus; loggedAt: string }
interface DailyProgress { value: number; goal: number; percentOfGoal: number; asOf: string }
interface UserVitals {
  bloodPressure: (Reading & { systolic: number; diastolic: number; unit: "mmHg" }) | null;
  bloodSugar: (Reading & { value: number; unit: "mg/dL"; mealContext: string | null; mealContextLabel: string | null }) | null;
  heartRate: (Reading & { value: number; unit: "bpm" }) | null;
  stepsToday: DailyProgress & { unit: "steps" };
  waterToday: DailyProgress & { unit: "glasses" };
  latestMood: { mood: string; label: string; sentiment: "positive" | "neutral" | "negative" | "unknown"; loggedAt: string } | null;
}
// On the overview type: vitals?: UserVitals   (optional until the backend is deployed everywhere)
```

### 1.7 Test checklist
- User with every reading: all six cards filled, chips match the design (128/79 gives Elevated).
- New user with no logs: five empty states for the nullable cards, steps `0 / 7,000` and water `0 / 8`.
- User with a goal set: goal numbers come from the user, not the defaults.
- Steps above goal: bar stops at 100%, text shows the real percent.
- Bad id: error toast. Unknown user: "User not found".
- Response without `vitals` (old backend): rest of the page still renders.
- Dates near midnight and across timezones show the viewer's local time.

---

## 2. OTP switch (`isOtpEnabled`)

### 2.1 Concept
- `isOtpEnabled` (boolean) tells the **user app** whether login asks for an OTP.
- It is set per platform (`android`, `ios`) on the **base** config. Every version inherits it unless that version has its own override.
- Only a **superAdmin** may change it (403 otherwise).
- The database already has `isOtpEnabled: true` on the existing base config.

### 2.2 Reading
- `GET /api/v1/app-config/list` returns `data.platforms[].base.isOtpEnabled`. `base` can be `null`, and a version row has `isOtpEnabled` only when it overrides it (`overrides` lists the overridden fields).
- `GET /api/v1/app-config/effective?platform=android&appVersion=1.2.3` returns `data.config.isOtpEnabled` and `data.sources.isOtpEnabled` (`"base"` or `"version"`).

### 2.3 Turning it on or off
```
PATCH /api/v1/app-config/otp
{ "platform": "android", "enabled": false }
```
- `platform` is `"android"` or `"ios"`. `enabled` must be a real boolean (the string "false" returns 400).
- 200: `{ "status": "success", "message": "OTP is OFF for android", "data": { "updated": 1, "platform": "android", "isOtpEnabled": false } }`. `updated: 0` means it was already that value.
- Errors: 400 invalid body, 401 token, 403 not superAdmin, 409 no base config for that platform, 500 `status: "fail"`.

### 2.4 Per-version override (optional)
```
PATCH /api/v1/app-config/:id
{ "expectedUpdatedAt": "<updatedAt of that config>", "set": { "isOtpEnabled": false } }
```
Reset a version to the base value with `"unset": ["isOtpEnabled"]` (version configs only). A 409 saying the configuration was changed by someone else means reload `/list` and retry. `expectedUpdatedAt` is required (`null` only if the config has no `updatedAt`).

### 2.5 UI rules
1. A card "OTP login" with one toggle per platform, bound to `base.isOtpEnabled`.
2. Disable the toggle while the request runs and when `base` is `null` ("Create the base configuration first"). Hide or lock it for non-superAdmins.
3. Confirm before turning OFF: "Users on <platform> will log in without an OTP."
4. On 200, set the toggle from `data.isOtpEnabled`, toast `message`, then refetch `/list`. On any error, revert the toggle and show `message`.
5. Optional: show an "overridden" badge on versions that have `isOtpEnabled`, with a "Reset to base" action (2.4).
6. History: `GET /api/v1/app-config/history?platform=android&page=1&limit=20`. OTP changes have `action: "otp"` and `changes: [{ "path": "isOtpEnabled", "before": true, "after": false }]`. Show them as "OTP turned on/off". Add a label for the new `otp` action; an unknown action must not crash the history table.
7. If your **App Config edit form** lists fields from `overrides` or renders `Object.keys(config)`, make sure a boolean field renders as a switch and is not dropped. Saving the form with an old payload keeps working because `isOtpEnabled` is optional there.

### 2.5.1 Test checklist
- Toggle android off: 200, `/list` and `/effective` show `false`. Toggle again to the same value: 200 with `updated: 0`.
- Platform with no base: 409 and a disabled toggle.
- Non-superAdmin: 403 and a locked toggle.
- Version with an override still follows the switch after `PATCH /otp`.
- History shows the new `otp` entry and the table still renders older entries.
- Existing config edit, force update and maintenance screens still work.

---

## 3. Common to both
- Response shape: `{ status: "success" | "error" | "fail", message, data? }`. `error` means a client or business problem (show `message`); `fail` means a server fault (show a generic message and allow retry).
- On 401, send the admin back to login. Do not retry in a loop.
- Do not log decrypted health data to the console or to analytics. It is personal health information.
- The vitals come from the user app's tracking collections; the admin panel is read-only for them. There is no endpoint to edit a user's vitals.

## 4. What the backend does not do (so you don't wait for it)
- No history or drill-down endpoint for vitals yet.
- No push to the user app: it must read `isOtpEnabled` from its own config call and skip the OTP step when `false`. That change is in the user app, not here.
- Chart or trend data for vitals is not provided.

## 5. Rollout order
1. Add the optional types (1.6, 2.2) and API helpers.
2. Build the vitals cards and the OTP card; run both checklists against the dev server.
3. Merge; confirm in the first deploy that the overview page and App Config page still load for an old and a new user.
4. Tell the user-app team that `isOtpEnabled` is now available and currently `true`.
