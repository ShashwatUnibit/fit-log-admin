# Data Controller (`DataController`)

**Source File**: [data.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/data.controller.ts)  
**Route File**: [data.route.ts](file:///d:/Backend/fit_log_admin/src/routes/data.route.ts)  
**Base Path**: `/api/v1/data`  
**Pattern**: Singleton (`DataController.instance`)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`DataController` provides general utility, diagnostic, and global static configuration data for the FitLog ecosystem. Its primary role is to serve standardized application enums (food preferences, allergies, dietary constraints, exercise classifications, and target muscles) in a single unified payload, keeping client applications (mobile/web/admin) in perfect synchronization without hardcoded frontend lists.

---

## API Endpoints & Methods

### 1. Test Data / Echo Check
- **Endpoint**: `GET /api/v1/data/test`
- **Method Handler**: `DataController.instance.getData(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Acts as a diagnostic endpoint to verify query parameter validation, route connectivity, and cryptographic transmission.
- **Query Parameters**:
  - `amount`: number/string (validated through Joi schema).
- **Validation**:
  - Handled by `DataValidator.instance.sampleSchema` in [data.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/data.validator.ts).
- **Business Logic**:
  1. Validates `req.query` with Joi. Returns `400 BAD_REQUEST` if invalid.
  2. Extracts `{ amount }` and echoes it back in the success envelope.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Data fetched successfully",
    "httpCode": 200,
    "data": {
      "amount": 100
    }
  }
  ```

---

### 2. Get Static Data
- **Endpoint**: `GET /api/v1/data/static-data`
- **Method Handler**: `DataController.instance.getStaticData(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Supplies client apps with all pre-configured system enums for dropdown menus, multi-select pickers, filtering tags, and onboarding wizards.
  - Eliminates frontend hardcoding and guarantees consistent enum values across the mobile app, admin panel, and backend services.
- **Request Parameters / Body**: None.
- **Data Contract (`iStaticData`)**:
  - `foodPreferences`: All values from `eFoodPreferences` ([foodItems.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/foodItems.enum.ts))
  - `foodAllergies`: All values from `eFoodAllergies` ([foodItems.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/foodItems.enum.ts))
  - `foodIntolerance`: All values from `eFoodIntolerances` ([foodItems.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/foodItems.enum.ts))
  - `dietaryRestrictions`: All values from `eDietaryRestrictions` ([foodItems.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/foodItems.enum.ts))
  - `focusPart`: All values from `eFocusPart` ([exercise.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/exercise.enum.ts))
  - `exerciseLevel`: All values from `eExerciseLevel` ([exercise.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/exercise.enum.ts))
  - `exerciseType`: All values from `eExerciseType` ([exercise.enum.ts](file:///d:/Backend/fit_log_admin/src/enums/exercise.enum.ts))
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Static data fetched successfully",
    "httpCode": 200,
    "data": {
      "foodPreferences": ["Vegetarian", "Vegan", "Pescatarian", "Keto", ...],
      "foodAllergies": ["Peanuts", "Tree Nuts", "Milk", "Eggs", ...],
      "foodIntolerance": ["Lactose", "Gluten", "Histamine", ...],
      "dietaryRestrictions": ["Halal", "Kosher", "Low Sodium", ...],
      "focusPart": ["Chest", "Back", "Arms", "Legs", "Shoulders", "Abs", "Full Body", ...],
      "exerciseLevel": ["Beginner", "Intermediate", "Advanced"],
      "exerciseType": ["Strength", "Cardio", "Endurance", "Flexibility", ...]
    }
  }
  ```
- **Error Responses**:
  - `500 INTERNAL_SERVER_ERROR`: Encrypted error response if enumeration processing fails.
