# Food Allergy Controller (`FoodAllergyController`)

**Source File**: [foodAllergy.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/foodAllergy.controller.ts)  
**Route File**: [foodAllergy.route.ts](file:///d:/Backend/fit_log_admin/src/routes/foodAllergy.route.ts)  
**Base Path**: `/api/v1/food-allergy`  
**Pattern**: Singleton (`FoodAllergyController.instance`)  
**Database Model**: `FoodAllergyDb` in [foodAllergy.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/foodAllergy.mongo.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`FoodAllergyController` manages true immunological food allergens (e.g., Peanuts, Tree Nuts, Shellfish, Fish, Milk, Eggs, Wheat, Soy, Sesame). These entities allow the FitLog platform to capture clinical allergy risks during user onboarding and strictly filter out dangerous ingredients from AI-generated meal plans and nutrition recommendations.

---

## API Endpoints & Methods

### 1. Create Food Allergy
- **Endpoint**: `POST /api/v1/food-allergy/create`
- **Method Handler**: `FoodAllergyController.instance.createFoodAllergy(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Adds a new standardized allergen category to the database with a user-facing title, explanatory subtitle, and image/icon URL.
  - Ensures uniqueness by blocking duplicate allergy titles among non-deleted items.
- **Request Body Contract** (`iCreateFoodAllergyPayload`):
  ```json
  {
    "title": "Peanuts",
    "subtitle": "Includes groundnuts, peanut butter, and peanut oil",
    "imageUrl": "https://assets.fitlog.com/allergies/peanuts.png"
  }
  ```
- **Validation**:
  - Handled by `FoodAllergyValidator.instance.createSchema` in [foodAllergy.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/foodAllergy.validator.ts).
  - Validates required strings for `title`, `subtitle`, and `imageUrl`.
- **Business Logic & Persistence**:
  1. Validates request body with Joi schema; responds with `400 BAD_REQUEST` if invalid.
  2. Executes duplicate check:
     ```typescript
     await FoodAllergyDb.findOne({ title: payload.title, isDeleted: false });
     ```
     If an allergen with the same title already exists, returns `400 BAD_REQUEST`: `"Food allergy with this title already exists"`.
  3. Trims `subtitle` and `imageUrl`.
  4. Persists the document in MongoDB using `FoodAllergyDb`.
  5. Returns the persisted allergy document in the standard response envelope.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Food allergy created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "title": "Peanuts",
      "subtitle": "Includes groundnuts, peanut butter, and peanut oil",
      "imageUrl": "https://assets.fitlog.com/allergies/peanuts.png",
      "isDeleted": false,
      "createdAt": "2026-10-12T05:00:00.000Z",
      "updatedAt": "2026-10-12T05:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Joi validation failure or duplicate title.
  - `500 INTERNAL_SERVER_ERROR`: Database or internal server error.
