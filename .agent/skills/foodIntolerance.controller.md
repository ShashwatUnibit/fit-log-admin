# Food Intolerance Controller (`FoodIntoleranceController`)

**Source File**: [foodIntolerance.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/foodIntolerance.controller.ts)  
**Route File**: [foodIntolerance.route.ts](file:///d:/Backend/fit_log_admin/src/routes/foodIntolerance.route.ts)  
**Base Path**: `/api/v1/food-intolerance`  
**Pattern**: Singleton (`FoodIntoleranceController.instance`)  
**Database Model**: `FoodIntoleranceDb` in [foodIntolerance.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/foodIntolerance.mongo.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`FoodIntoleranceController` manages digestive non-allergic food sensitivities (such as Lactose, Histamine, Gluten, Fructose, Sulfites, Caffeine). While not life-threatening like true allergies, intolerances cause significant gastrointestinal distress and energy fluctuations; maintaining them enables the FitLog nutrition engine to suggest comfortable ingredient alternatives.

---

## API Endpoints & Methods

### 1. Create Food Intolerance
- **Endpoint**: `POST /api/v1/food-intolerance/create`
- **Method Handler**: `FoodIntoleranceController.instance.createFoodIntolerance(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Adds a new food intolerance profile to the database with a user-facing title, explanatory subtitle, and icon/image URL.
  - Enforces unique titles across active (non-deleted) records.
- **Request Body Contract** (`iCreateFoodIntolerancePayload`):
  ```json
  {
    "title": "Lactose",
    "subtitle": "Difficulty digesting sugar in milk and dairy products",
    "imageUrl": "https://assets.fitlog.com/intolerances/lactose.png"
  }
  ```
- **Validation**:
  - Handled by `FoodIntoleranceValidator.instance.createSchema` in [foodIntolerance.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/foodIntolerance.validator.ts).
  - Validates required strings for `title`, `subtitle`, and `imageUrl`.
- **Business Logic & Persistence**:
  1. Validates incoming payload with Joi schema; rejects with `400 BAD_REQUEST` if invalid.
  2. Executes duplicate check:
     ```typescript
     await FoodIntoleranceDb.findOne({ title: payload.title, isDeleted: false });
     ```
     If an intolerance with the same title already exists, returns `400 BAD_REQUEST`: `"Food intolerance with this title already exists"`.
  3. Trims `subtitle` and `imageUrl`.
  4. Saves a new document in MongoDB using `FoodIntoleranceDb`.
  5. Returns the created document in the standard response format.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Food intolerance created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "title": "Lactose",
      "subtitle": "Difficulty digesting sugar in milk and dairy products",
      "imageUrl": "https://assets.fitlog.com/intolerances/lactose.png",
      "isDeleted": false,
      "createdAt": "2026-10-12T05:00:00.000Z",
      "updatedAt": "2026-10-12T05:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Validation failure or duplicate title.
  - `500 INTERNAL_SERVER_ERROR`: Database or internal server failure.
