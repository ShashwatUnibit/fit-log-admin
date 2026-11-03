# Banner Controller (`BannerController`)

**Source File**: [banner.controller.ts](../../../src/controllers/banner.controller.ts)  
**Route File**: [banner.route.ts](../../../src/routes/banner.route.ts)  
**Base Path**: `/api/v1/banner`  
**Pattern**: Singleton (`BannerController.instance`)  
**Database Model**: `BannerDb` in [banner.mongo.ts](../../../src/db/mongo/banner.mongo.ts), collection `banners` (shared with the user app `health-tracker`, whose `banner` model resolves to the same collection)  
**Security**: mounted with `validateToken`; responses via `EncryptionSecurity.instance.onResponse`.  
**Frontend guide**: [banner-frontend-guide.md](../../../docs/banner-frontend-guide.md) (payloads and responses)

## Endpoints
| Method + path | Handler | Purpose |
|---|---|---|
| `POST /create` | `createBanner` | Insert at `orderData` (default 1), shift the rest down |
| `GET /list` | `getBanners` | Non-deleted banners sorted by `orderData`; optional `isActive`, `bannerType` filters |
| `PATCH /update-status` | `updateBannerStatus` | Body `{ bannerId, isActive }`, explicit set (not toggle) |
| `PATCH /update-order` | `updateBannerOrder` | Body `{ bannerId, orderData }`, returns the full re-ordered list |
| `DELETE /:id` | `deleteBanner` | Soft delete (`isDeleted: true`), then closes the gap |

## Ordering invariant
Non-deleted banners (active and inactive) are kept as `1..N`. `getOrderedBanners()` loads them (sorted by `orderData`, then `createdAt`),
the handler splices the target into place (position clamped to `[1, N+1]` on create, `[1, N]` on move), and `resequence()` bulk-writes only changed `orderData`.
This also repairs legacy duplicates/gaps created by the user app (which allowed `orderData` 0 and duplicates).
Not transactional; the next write self-heals.

## Differences from the user app controller
- List returns all non-deleted banners (active + inactive) and an empty list is `success`, not a 404 `FAILED` (admin enum has no `FAILED`).
- `orderData` is optional on create (min 1; the user app required it, min 0).
- `imageUrl` is required in the admin model (user app: optional, default null).
