# Food Preference Controller (`FoodPreferenceController`)

**Source File**: [foodPreference.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/foodPreference.controller.ts)  
**Route File**: [foodPreference.route.ts](file:///d:/Backend/fit_log_admin/src/routes/foodPreference.route.ts)  
**Base Path**: `/api/v1/food-preference`  
**Pattern**: Singleton (`FoodPreferenceController.instance`)  
**Database Model**: `FoodPreferenceDb` in [foodPreference.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/foodPreference.mongo.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`FoodPreferenceController` manages elective dietary lifestyles, eating styles, and nutritional inclinations (e.g., Mediterranean, Ketogenic, High Protein, Paleo, Intermittent Fasting, Whole30). Unlike restrictions or allergies, preferences reflect elective goals or taste habits, which the FitLog AI recommendation engine uses to tailor meal recipes and macro distributions.

---

## API Endpoints & Methods

### 1. Create Food Preference
- **Endpoint**: `POST /api/v1/food-preference/create`
- **Method Handler**: `FoodPreferenceController.instance.createFoodPreference(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Creates a new food preference category in the database with a user-facing title, explanatory subtitle, and image/icon URL.
  - Ensures no duplicate food preference titles are stored among non-deleted items.
- **Request Body Contract** (`iCreateFoodPreferencePayload`):
  ```json
  {
    "title": "Mediterranean",
    "subtitle": "Plant-rich meals with healthy fats like olive oil and fish",
    "imageUrl": "https://assets.fitlog.com/preferences/mediterranean.png"
  }
  ```
- **Validation**:
  - Handled by `FoodPreferenceValidator.instance.createSchema` in [foodPreference.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/foodPreference.validator.ts).
  - Validates required strings for `title`, `subtitle`, and `imageUrl`.
- **Business Logic & Persistence**:
  1. Validates request body with Joi schema; rejects with `400 BAD_REQUEST` if invalid.
  2. Executes duplicate check:
     ```typescript
     await FoodPreferenceDb.findOne({ title: payload.title, isDeleted: false });
     ```
     If an existing record is found, returns `400 BAD_REQUEST`: `"Food preference with this title already exists"`.
  3. Trims `subtitle` and `imageUrl`.
  4. Saves a new document in MongoDB using `FoodPreferenceDb`.
  5. Returns the newly created preference document in the success response envelope.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Food preference created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "title": "Mediterranean",
      "subtitle": "Plant-rich meals with healthy fats like olive oil and fish",
      "imageUrl": "https://assets.fitlog.com/preferences/mediterranean.png",
      "isDeleted": false,
      "createdAt": "2026-10-12T05:00:00.000Z",
      "updatedAt": "2026-10-12T05:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Validation schema errors or duplicate title.
  - `500 INTERNAL_SERVER_ERROR`: Database or server error.
