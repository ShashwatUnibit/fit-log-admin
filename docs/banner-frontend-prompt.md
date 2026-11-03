# Prompt: implement the Banner management screen

You are implementing the **Banner management** feature in the FitLog admin panel. The backend is finished. Build against the contract below and do not invent fields, endpoints or behaviour. If something is not specified here, ask or mark it as an assumption. Also read `docs/banner-frontend-guide.md` in the backend repo for the full detail.

## 1. What to build
A single "Banners" page with:
1. A list of banners in display order (position badge, image preview, bannerType, redirect info, active switch, delete button).
2. A "Create banner" form (image upload, redirectType, redirectValue, bannerType, optional position).
3. Drag-and-drop reordering.
4. An active/inactive switch per banner.
5. Delete with a confirmation dialog.
6. Loading, empty, error and in-flight states for every action.

## 2. Transport rules (apply to every call)
Base path: `/api/v1/banner`. Reuse the project's existing API client. It already handles the items below for the other admin APIs, so extend it rather than rewriting it.
- Headers: `Authorization: Bearer <jwt>`, `x-app-id`, `x-app-version`, `x-app-platform`, `Content-Type: application/json`.
- POST/PATCH: send the body AES-encrypted as `{ "data": "<ciphertext>" }`.
- GET/DELETE: send header `hash` = AES-encrypt of the full request path including query string (e.g. `/api/v1/banner/list?isActive=true`).
- Responses: if `data` is present it is an AES string. Decrypt it, then `JSON.parse` it. `status` and `message` are plain text.
- For local development only, `?enc=false` disables encryption in both directions. Never ship it.
- Response envelope: `{ status: "success" | "error" | "fail", message: string, data?: ... }`.
  HTTP 200 = success, 400/404 = `error` (show `message`), 401 = session expired (go to login), 500 = `fail` (show a generic retry message).

## 3. Data model
```ts
type RedirectType = "external" | "bp" | "sugar";
type BannerType = "hero" | "text" | "promotional";
interface Banner {
  _id: string;
  imageUrl: string;
  redirectType: RedirectType | null;
  redirectValue: string | null;
  bannerType: BannerType | null;
  orderData: number;      // 1-based position, lower is shown first
  isActive: boolean;
  isDeleted: boolean;     // never true in API responses
  createdAt: string;      // ISO date
  updatedAt: string;
}
```

## 4. Endpoints

### Upload the image first
`POST /api/v1/upload/image`: multipart/form-data, field `image`, max 5 MB, image/* only. Not encrypted. The response is `{ status, message, data: { url } }`. Use `data.url` as `imageUrl`.

### Create: `POST /api/v1/banner/create`
```json
{ "imageUrl": "https://cdn.example.com/b.png", "redirectType": "external", "redirectValue": "https://example.com", "bannerType": "hero", "orderData": 2 }
```
Only `imageUrl` is required. `orderData` is optional, an integer >= 1; if omitted the banner goes to position 1. Empty string or `null` is fine for the optional text fields. Do not send unknown fields.
- 200: `{ "status": "success", "message": "Banner created successfully", "data": <Banner> }`
- 400: `{ "status": "error", "message": "\"imageUrl\" must be a valid URL" }`

### List: `GET /api/v1/banner/list` (optional `?isActive=true|false&bannerType=hero|text|promotional`)
- 200: `{ "status": "success", "message": "Banners fetched successfully", "data": [<Banner>, ...] }`. Already sorted by `orderData`. An empty list is `data: []` (an empty state, not an error).
- 400: `{ "status": "error", "message": "\"isActive\" must be true or false" }`

### Activate / deactivate: `PATCH /api/v1/banner/update-status`
```json
{ "bannerId": "6720a1f5c2b4a8d3e9f01234", "isActive": false }
```
`isActive` must be a real boolean. It sets the value (it does not toggle).
- 200: `{ "status": "success", "message": "Banner deactivated successfully", "data": <Banner> }` (message says "activated" for true)
- 400: `{ "status": "error", "message": "\"isActive\" is a required field" }`
- 404: `{ "status": "error", "message": "Banner not found" }`

### Reorder: `PATCH /api/v1/banner/update-order`
```json
{ "bannerId": "6720a1f5c2b4a8d3e9f05678", "orderData": 1 }
```
`orderData` is an integer >= 1; values above the banner count are clamped to the last position.
- 200: `{ "status": "success", "message": "Banner order updated successfully", "data": [<Banner>, ...] }`. This is the full re-ordered list.
- 400: `{ "status": "error", "message": "\"orderData\" should be greater than or equal to 1" }`
- 404: `{ "status": "error", "message": "Banner not found" }`

### Delete (soft): `DELETE /api/v1/banner/:id`
No body; `hash` is built from `/api/v1/banner/<id>`.
- 200: `{ "status": "success", "message": "Banner deleted successfully" }` (no `data`)
- 400: `{ "status": "error", "message": "\"id\" must be a valid id" }`
- 404: `{ "status": "error", "message": "Banner not found" }`

## 5. Ordering rules (the server owns them)
Banners always form the sequence 1..N with no gaps. Create, reorder and delete cause the server to renumber other banners.
- **Never compute or patch other banners' `orderData` on the client.**
- After create or delete, refetch the list. After reorder, replace local state with the returned `data`.
- Examples with A=1, B=2, C=3: create at 1 gives New=1, A=2, B=3, C=4. Move C to 1 gives C=1, A=2, B=3. Delete B gives A=1, C=2.

## 6. Behaviour requirements
1. **Drag-and-drop**: on drop, send `update-order` with `orderData = newIndex + 1`. Update the UI optimistically, keep the previous array, roll back and show the error if the request fails, and replace state with the response on success. Block further drags while a request is in flight. Do nothing if the position did not change.
2. **Switch**: send the explicit target value, update optimistically, roll back on failure, merge the returned banner by `_id` on success. The position does not change.
3. **Create form**: validate before sending (valid image uploaded, position integer between 1 and count + 1 if filled). Disable submit while uploading or submitting. Show server `message` on 400. Reset the form and refetch on success.
4. **Delete**: confirmation dialog, disable the row while deleting, refetch on success. On 404, refetch silently (it was already removed).
5. **Errors**: 400/404 show the server `message`; 500 shows "Something went wrong, please try again"; 401 redirects to login. Never show raw stack traces or ciphertext.
6. **States**: skeleton while loading, an empty state ("No banners yet" with a create button) for `[]`, a retry button on list failure.
7. **Accessibility**: switches and buttons have labels; drag-and-drop has a keyboard alternative (a "move up / move down" control or a position input that calls `update-order`).
8. Optional filter bar: All / Active / Inactive using `?isActive=`. Keep drag-and-drop disabled while a filter is on, because positions are relative to the full list.

## 7. Deliverables
- A typed API module (`createBanner`, `listBanners`, `setBannerStatus`, `reorderBanner`, `deleteBanner`) that handles encryption and the envelope, and returns typed results or throws a typed error carrying `httpCode` and `message`.
- The Banners page and its components.
- A short summary listing assumptions and anything you could not verify. Test against a dev server using `?enc=false` first, then with encryption on.
