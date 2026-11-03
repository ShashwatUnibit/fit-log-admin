# Banner API: Frontend Integration Guide

Base URL: `/api/v1/banner`

Five endpoints manage the banners shown in the user app: create, list, activate/deactivate, reorder and delete.

---

## 1. Request conventions (apply to every endpoint)

### Headers
| Header | Value |
|---|---|
| `Authorization` | `Bearer <admin JWT>` |
| `x-app-id` (or `app-id`) | your app id |
| `x-app-version` (or `app-version`) | app version |
| `x-app-platform` (or `platform`) | `web` / `ios` / `android` |
| `Content-Type` | `application/json` (POST / PATCH) |
| `hash` | AES-encrypted `originalUrl` (see below). Required on GET and DELETE, and on POST/PATCH when the body is not encrypted |

### Encryption (same as every other admin API)
- **POST / PATCH**: send the JSON payload AES-encrypted as `{ "data": "<ciphertext>" }`.
  Without it you must send a valid `hash` header.
- **GET / DELETE**: send `hash` = AES-encrypt of the full request path including the query string
  (e.g. `/api/v1/banner/list?isActive=true`). It is compared with `req.originalUrl`, so the query string must match exactly.
- **Responses**: `data` comes back as an AES-encrypted string. Decrypt it and `JSON.parse` it. `status` and `message` are plain text.
  A response with no `data` field (e.g. delete) has nothing to decrypt.
- **Local dev only**: appending `?enc=false` (server `SERVER_ENV` = `dev`/`development`) bypasses encryption in both directions.
  In the examples below the payloads and responses are shown **decrypted**.

### Response envelope
```json
{ "status": "success | error | fail", "message": "human readable text", "data": "<optional>" }
```

| `status` | Meaning | HTTP |
|---|---|---|
| `success` | Done | 200 |
| `error` | Caller problem: validation failed, banner not found, bad request | 400 / 404 |
| `fail` | Server problem (DB error, etc.) | 500 |

Branch on the HTTP code first, then show `message` to the user. `message` for validation errors is a single sentence, because only the first problem is reported at a time.

---

## 2. The Banner object

```json
{
  "_id": "6720a1f5c2b4a8d3e9f01234",
  "imageUrl": "https://cdn.example.com/banners/summer.png",
  "redirectType": "external",
  "redirectValue": "https://example.com/offer",
  "bannerType": "hero",
  "orderData": 1,
  "isActive": true,
  "isDeleted": false,
  "createdAt": "2026-11-03T09:00:00.000Z",
  "updatedAt": "2026-11-03T09:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `imageUrl` | string (URL) | Required. Upload the file first with `POST /api/v1/upload/image` (multipart, field `image`) and use the returned `data.url`. |
| `redirectType` | `"external"` \| `"bp"` \| `"sugar"` \| `null` | Optional. |
| `redirectValue` | string \| `null` | Optional (URL or target id depending on `redirectType`). |
| `bannerType` | `"hero"` \| `"text"` \| `"promotional"` \| `null` | Optional. |
| `orderData` | integer, 1-based | Display position. Lower = shown first. |
| `isActive` | boolean | Only active banners are visible in the user app. |
| `isDeleted` | boolean | Deleted banners are never returned by these APIs. |

### How ordering works (important)
- Non-deleted banners (active **and** inactive) always form one sequence `1, 2, 3 … N` with no gaps and no duplicates.
- Any create / reorder / delete re-numbers the affected banners on the server. **After any of these calls, replace your local list with fresh data** (reorder returns the full list; for create and delete, call list again) instead of patching `orderData` by hand.
- A position greater than the current count is clamped to the end (`N + 1` on create, `N` on reorder).

---

## 3. Endpoints

### 3.1 Create banner
`POST /api/v1/banner/create`

| Field | Required | Rules |
|---|---|---|
| `imageUrl` | yes | valid URL |
| `redirectType` | no | one of `external`, `bp`, `sugar`; `null` or `""` allowed |
| `redirectValue` | no | string; `null` or `""` allowed |
| `bannerType` | no | one of `hero`, `text`, `promotional`; `null` or `""` allowed |
| `orderData` | no | integer >= 1. **If omitted the banner is placed at position 1.** |

Unknown fields are rejected. Empty strings are stored as `null`. A new banner is always created active.

Behaviour: the banner is inserted at `orderData` and every banner at that position or later moves down by one.
Example with existing banners A=1, B=2, C=3:

| Request `orderData` | Result |
|---|---|
| omitted or `1` | New=1, A=2, B=3, C=4 |
| `2` | A=1, New=2, B=3, C=4 |
| `99` | A=1, B=2, C=3, New=4 |

**Request**
```json
{
  "imageUrl": "https://cdn.example.com/banners/summer.png",
  "redirectType": "external",
  "redirectValue": "https://example.com/offer",
  "bannerType": "hero"
}
```

**Success: 200**
```json
{
  "status": "success",
  "message": "Banner created successfully",
  "data": {
    "_id": "6720a1f5c2b4a8d3e9f01234",
    "imageUrl": "https://cdn.example.com/banners/summer.png",
    "redirectType": "external",
    "redirectValue": "https://example.com/offer",
    "bannerType": "hero",
    "orderData": 1,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-11-03T09:00:00.000Z",
    "updatedAt": "2026-11-03T09:00:00.000Z"
  }
}
```
The returned `orderData` is the final position. Other banners may have shifted, so refetch the list.

**Failure: 400**
```json
{ "status": "error", "message": "\"imageUrl\" must be a valid URL" }
```
Other messages: `"imageUrl" is a required field`, `"orderData" should be greater than or equal to 1`, `"orderData" must be an integer`,
`"redirectType" must be one of [external, bp, sugar]`, `"bannerType" must be one of [hero, text, promotional]`.

---

### 3.2 List banners
`GET /api/v1/banner/list`

Returns every non-deleted banner, **sorted by `orderData` ascending**, so render the array as-is.

| Query param | Required | Rules |
|---|---|---|
| `isActive` | no | `true` / `false`: only active / only inactive. Omit for both. |
| `bannerType` | no | `hero` / `text` / `promotional` |

Remember to include the query string in the `hash`.

**Success: 200**
```json
{
  "status": "success",
  "message": "Banners fetched successfully",
  "data": [
    { "_id": "6720a1f5c2b4a8d3e9f01234", "imageUrl": "https://cdn.example.com/a.png", "redirectType": "external", "redirectValue": "https://example.com", "bannerType": "hero", "orderData": 1, "isActive": true, "isDeleted": false, "createdAt": "2026-11-03T09:00:00.000Z", "updatedAt": "2026-11-03T09:00:00.000Z" },
    { "_id": "6720a1f5c2b4a8d3e9f05678", "imageUrl": "https://cdn.example.com/b.png", "redirectType": null, "redirectValue": null, "bannerType": null, "orderData": 2, "isActive": false, "isDeleted": false, "createdAt": "2026-11-02T09:00:00.000Z", "updatedAt": "2026-11-02T09:00:00.000Z" }
  ]
}
```
**No banners is still a success with `"data": []`.** Show an empty state; do not treat it as an error.

**Failure: 400**
```json
{ "status": "error", "message": "\"isActive\" must be true or false" }
```

---

### 3.3 Activate / deactivate banner
`PATCH /api/v1/banner/update-status`

| Field | Required | Rules |
|---|---|---|
| `bannerId` | yes | 24-char hex id |
| `isActive` | yes | JSON boolean `true` / `false` (strings like `"true"` are rejected) |

This sets the value explicitly (it is not a toggle), so it is safe to retry.
It does not change `orderData`; inactive banners keep their position.

**Request**
```json
{ "bannerId": "6720a1f5c2b4a8d3e9f01234", "isActive": false }
```

**Success: 200** (`data` is the updated banner)
```json
{
  "status": "success",
  "message": "Banner deactivated successfully",
  "data": { "_id": "6720a1f5c2b4a8d3e9f01234", "isActive": false, "orderData": 1, "...": "other banner fields" }
}
```
`message` is `"Banner activated successfully"` when `isActive` is `true`.

**Failure**
| HTTP | Body |
|---|---|
| 400 | `{ "status": "error", "message": "\"isActive\" is a required field" }` (also `"bannerId" must be a valid id`, `"isActive" must be true or false`) |
| 404 | `{ "status": "error", "message": "Banner not found" }` (id unknown or already deleted) |

---

### 3.4 Change banner order
`PATCH /api/v1/banner/update-order`

Moves one banner to a new position; the others shift to make room.

| Field | Required | Rules |
|---|---|---|
| `bannerId` | yes | 24-char hex id |
| `orderData` | yes | integer >= 1. Values above the banner count are clamped to the last position. |

Example with A=1, B=2, C=3, D=4:

| Request | Result |
|---|---|
| move C to `1` | C=1, A=2, B=3, D=4 |
| move A to `3` | B=1, C=2, A=3, D=4 |
| move B to `99` | A=1, C=2, D=3, B=4 |
| move B to `2` (same spot) | no change |

**Request**
```json
{ "bannerId": "6720a1f5c2b4a8d3e9f05678", "orderData": 1 }
```

**Success: 200**: `data` is the **complete, re-ordered list** of non-deleted banners (same shape as 3.2), so replace your state with it.
```json
{
  "status": "success",
  "message": "Banner order updated successfully",
  "data": [
    { "_id": "6720a1f5c2b4a8d3e9f05678", "orderData": 1, "...": "other banner fields" },
    { "_id": "6720a1f5c2b4a8d3e9f01234", "orderData": 2, "...": "other banner fields" }
  ]
}
```

**Failure**
| HTTP | Body |
|---|---|
| 400 | `{ "status": "error", "message": "\"orderData\" is a required field" }` (also `"bannerId" must be a valid id`, `"orderData" must be an integer`, `"orderData" should be greater than or equal to 1`) |
| 404 | `{ "status": "error", "message": "Banner not found" }` |

---

### 3.5 Delete banner (soft delete)
`DELETE /api/v1/banner/:id`

Marks the banner `isDeleted: true`; the document is kept in the database but never returned again.
The remaining banners are re-numbered so there is no gap (deleting position 2 of 4 turns 3→2 and 4→3).
No body. `hash` must be built from `/api/v1/banner/<id>`.

**Success: 200** (no `data` field)
```json
{ "status": "success", "message": "Banner deleted successfully" }
```

**Failure**
| HTTP | Body |
|---|---|
| 400 | `{ "status": "error", "message": "\"id\" must be a valid id" }` |
| 404 | `{ "status": "error", "message": "Banner not found" }` (also returned when it was already deleted) |

---

### 3.6 Errors common to all endpoints
| HTTP | Body | Cause |
|---|---|---|
| 400 | `{ "status": "error", "message": "Invalid request" }` | Missing or wrong `hash`, or body could not be decrypted |
| 400 | `{ "status": "error", "message": "Invalid JSON payload" }` | Malformed JSON |
| 401 | `status: "error"` | Missing, invalid or expired `Authorization` token. Send the user back to login |
| 500 | `{ "status": "fail", "message": "<server message>" }` | Unexpected server/database error. Show a generic retry message |

---

## 4. Recommended UI implementation

1. **Load**: call `GET /list` once. Keep the array in state exactly as returned (already ordered). Show `isActive` as a switch.
2. **Create**: upload the image → call `create` → on success refetch `list`. If the admin does not pick a position, omit `orderData` (the banner goes first). A "position" field should be 1…(count + 1).
3. **Drag-and-drop reorder**: on drop, compute the new 1-based index of the dragged item and call `update-order` with `{ bannerId, orderData: newIndex }`.
   - Update the UI optimistically, but keep the previous array so you can roll back on a non-200.
   - On 200, **replace state with the returned `data`** (server is the source of truth).
   - Disable dragging while a reorder request is in flight, so two requests never race.
4. **Activate/deactivate switch**: send the explicit target value (`!current`), update optimistically, roll back on failure, and on 200 merge the returned banner by `_id`. Do not re-sort; ordering is unchanged.
5. **Delete**: confirm dialog → `DELETE` → on 200 refetch `list` (the other banners were re-numbered).
6. **Errors**: show `message` for 400/404 (it is user-readable); show a generic "Something went wrong, please try again" for 500. On 404 after a stale screen, refetch the list.
7. **Do not** compute `orderData` for other banners on the client, and do not send `orderData: 0` or negatives.

## 5. Notes and edge cases
- Delete responses have no `data` field. Every other success response carries `data` (an empty list is `[]`).
- Two admins editing at once: each call re-reads the order from the database, so results stay consistent, but the screen can be stale. Refetch on 404 or when the tab regains focus.
- Reordering and create/delete are not wrapped in a DB transaction. Concurrent writes are rare for an admin panel, and the sequence self-heals on the next create/reorder/delete.
