# Exercise Controller (`ExerciseController`)

**Source File**: [exercise.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/exercise.controller.ts)  
**Route File**: [exercise.route.ts](file:///d:/Backend/fit_log_admin/src/routes/exercise.route.ts)  
**Base Path**: `/api/v1/exercise`  
**Pattern**: Singleton (`ExerciseController.instance`)  
**Database Model**: `ExerciseDb` in [exercise.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/exercise.mongo.ts)  
**AI Integration**: `GeminiService.instance.generateExerciseMetrics` in [gemini.service.ts](file:///d:/Backend/fit_log_admin/src/services/gemini.service.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`ExerciseController` manages the central exercise movement repository in FitLog. It provides:
1. **AI-Powered Exercise Creation**: Administrators provide minimal input (movement name, focus part, optional image/description). The backend automatically interfaces with Google Gemini GenAI via LangChain to generate exercise classification, required equipment, detailed movement description, and a 3-tier difficulty structure (Beginner, Intermediate, Advanced) with calibrated sets, reps, duration, rest intervals, and calorie burns.
2. **Exercise Querying & Catalog Listing**: Multi-dimensional filtering by muscle group (`focusPart`), exercise discipline (`exerciseType`), and difficulty level (`exerciseLevel`), with optional pagination and dynamic level-slicing.

---

## API Endpoints & Methods

### 1. Create Exercise (with Gemini AI Auto-Generation)
- **Endpoint**: `POST /api/v1/exercise/create`
- **Method Handler**: `ExerciseController.instance.createExercise(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Adds a new exercise into the master catalog without requiring manual authoring of complex multi-tier sets/reps/calorie data.
  - Generates comprehensive biomechanical metrics automatically using Gemini AI.
- **Request Body Contract** (`iCreateExercisePayload`):
  ```json
  {
    "name": "Barbell Incline Bench Press",
    "focusPart": "Chest",
    "description": "Optional custom description. If omitted, Gemini AI writes one.",
    "imageUrl": "https://assets.fitlog.com/exercises/incline-bench.gif"
  }
  ```
- **Validation**:
  - Handled by `ExerciseValidator.instance.createSchema` in [exercise.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/exercise.validator.ts).
  - Validates `name` (required string), `focusPart` (must match `eFocusPart` enum), optional `description`, optional `imageUrl`.
- **Business Logic & AI Workflow**:
  1. Validates input schema; returns `400 BAD_REQUEST` on Joi error.
  2. Duplicate check:
     ```typescript
     await ExerciseDb.findOne({ name: payload.name.trim(), isDeleted: false });
     ```
     Aborts with `400 BAD_REQUEST` if an exercise with that name already exists.
  3. Invokes Gemini AI service:
     ```typescript
     const { exerciseType, equipmentRequired, description: aiDescription, levels } =
         await GeminiService.instance.generateExerciseMetrics(payload.name.trim(), payload.focusPart);
     ```
  4. Resolves description: uses `payload.description` if provided; otherwise uses `aiDescription`.
  5. Assembles document with generated 3-tier `levels`:
     - Beginner: lower sets, higher rest, lower calorie burn.
     - Intermediate: balanced sets/reps.
     - Advanced: higher sets/intensity, lower rest.
  6. Saves and returns the created `ExerciseDb` document.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Exercise created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "name": "Barbell Incline Bench Press",
      "description": "Lie back on an incline bench set at 30-45 degrees...",
      "focusPart": "Chest",
      "exerciseType": "Strength",
      "equipmentRequired": "Barbell, Incline Bench",
      "imageUrl": "https://assets.fitlog.com/exercises/incline-bench.gif",
      "levels": [
        {
          "level": "Beginner",
          "sets": 3,
          "reps": 8,
          "durationPerSet": 30,
          "restBetweenSets": 90,
          "caloriesBurn": 45,
          "totalTimeToComplete": 360
        },
        {
          "level": "Intermediate",
          "sets": 4,
          "reps": 10,
          "durationPerSet": 35,
          "restBetweenSets": 60,
          "caloriesBurn": 70,
          "totalTimeToComplete": 400
        },
        {
          "level": "Advanced",
          "sets": 5,
          "reps": 12,
          "durationPerSet": 40,
          "restBetweenSets": 45,
          "caloriesBurn": 105,
          "totalTimeToComplete": 425
        }
      ],
      "isDeleted": false,
      "createdAt": "2026-10-12T05:00:00.000Z"
    }
  }
  ```

---

### 2. Get Exercises (List & Filter)
- **Endpoint**: `GET /api/v1/exercise/list`
- **Method Handler**: `ExerciseController.instance.getExercises(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Powers exercise exploration, filtering for workout plan builders, and mobile catalog browsing.
  - Supports filtering by `focusPart`, `exerciseType`, and `exerciseLevel`.
  - When filtering by `exerciseLevel`, extracts the specific level parameters into a top-level `selectedLevel` property for simplified frontend consumption.
  - Supports unpaginated list or structured pagination metadata (`total`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`).
- **Query Parameters** (`iGetExercisesQuery`):
  - `focusPart` (optional string): Body target. Note: If `"Full Body"` is passed, `filterQuery.focusPart` is intentionally not restricted, fetching exercises across all body regions.
  - `exerciseType` (optional string): e.g. "Strength", "Cardio", "Stretching".
  - `exerciseLevel` (optional string): e.g. "Beginner", "Intermediate", "Advanced".
  - `page` (optional number, min 1).
  - `limit` (optional number, min 1).
- **Validation**:
  - Handled by `ExerciseValidator.instance.getExercisesQuerySchema` in [exercise.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/exercise.validator.ts).
- **Business Logic & Level Slicing**:
  1. Validates query parameters.
  2. Builds filter: `{ isDeleted: false }`. Adds `focusPart` (if not Full Body), `exerciseType`, and `levels.level` matches.
  3. Performs query with `.sort({ createdAt: -1 })`.
  4. If `exerciseLevel` was requested, transforms the exercise: finds the matching element in `levels`, assigns it to `selectedLevel`, and strips the full `levels` array from the result payload.
  5. Returns either a raw array (unpaginated) or a paginated envelope object `{ exercises, pagination }`.
- **Response Shape (Paginated Example)**:
  ```json
  {
    "status": "SUCCESS",
    "message": "Exercises fetched successfully",
    "httpCode": 200,
    "data": {
      "exercises": [
        {
          "_id": "67a3f8...",
          "name": "Barbell Incline Bench Press",
          "focusPart": "Chest",
          "exerciseType": "Strength",
          "selectedLevel": {
            "level": "Intermediate",
            "sets": 4,
            "reps": 10,
            "durationPerSet": 35,
            "restBetweenSets": 60,
            "caloriesBurn": 70,
            "totalTimeToComplete": 400
          }
        }
      ],
      "pagination": {
        "total": 42,
        "page": 1,
        "limit": 10,
        "totalPages": 5,
        "hasNextPage": true,
        "hasPrevPage": false
      }
    }
  }
  ```
