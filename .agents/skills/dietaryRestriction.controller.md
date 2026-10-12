# Dietary Restriction Controller (`DietaryRestrictionController`)

**Source File**: [dietaryRestriction.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/dietaryRestriction.controller.ts)  
**Route File**: [dietaryRestriction.route.ts](file:///d:/Backend/fit_log_admin/src/routes/dietaryRestriction.route.ts)  
**Base Path**: `/api/v1/dietary-restriction`  
**Pattern**: Singleton (`DietaryRestrictionController.instance`)  
**Database Model**: `DietaryRestrictionDb` in [dietaryRestriction.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/dietaryRestriction.mongo.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`DietaryRestrictionController` manages dietary lifestyle and ethical/religious restriction profiles (e.g., Halal, Kosher, Vegetarian, Vegan, Low-FODMAP, Renal diet). These dietary constraints are stored in the database and surfaced to end-users during onboarding and meal planning to safeguard recipes and nutrition suggestions against restricted foods.

---

## API Endpoints & Methods

### 1. Create Dietary Restriction
- **Endpoint**: `POST /api/v1/dietary-restriction/create`
- **Method Handler**: `DietaryRestrictionController.instance.createDietaryRestriction(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Adds a new dietary restriction entity to the database with a user-facing title, explanatory subtitle, and visual illustration icon/image URL.
  - Guarantees uniqueness by preventing duplicate titles among non-deleted entries.
- **Request Body Contract** (`iCreateDietaryRestrictionPayload`):
  ```json
  {
    "title": "Halal",
    "subtitle": "Permissible foods under Islamic dietary law",
    "imageUrl": "https://assets.fitlog.com/restrictions/halal.png"
  }
  ```
- **Validation**:
  - Handled by `DietaryRestrictionValidator.instance.createSchema` in [dietaryRestriction.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/dietaryRestriction.validator.ts).
  - Validates required strings for `title`, `subtitle`, and `imageUrl`.
- **Business Logic & Persistence**:
  1. Validates body against Joi schema; returns `400 BAD_REQUEST` with validation message if invalid.
  2. Executes duplicate check:
     ```typescript
     await DietaryRestrictionDb.findOne({ title: payload.title, isDeleted: false });
     ```
     If a record exists, aborts with `400 BAD_REQUEST`: `"Dietary restriction with this title already exists"`.
  3. Trims `subtitle` and `imageUrl` strings.
  4. Creates and saves a new document using `DietaryRestrictionDb`.
  5. Responds with the created MongoDB document.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Dietary restriction created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "title": "Halal",
      "subtitle": "Permissible foods under Islamic dietary law",
      "imageUrl": "https://assets.fitlog.com/restrictions/halal.png",
      "isDeleted": false,
      "createdAt": "2026-10-12T05:00:00.000Z",
      "updatedAt": "2026-10-12T05:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Validation schema errors, missing required fields, or duplicate title.
  - `500 INTERNAL_SERVER_ERROR`: Database error during lookup or insertion.
