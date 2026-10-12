# Workout Plan Controller (`WorkoutPlanController`)

**Source File**: [workoutPlan.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/workoutPlan.controller.ts)  
**Route File**: [workoutPlan.route.ts](file:///d:/Backend/fit_log_admin/src/routes/workoutPlan.route.ts)  
**Base Path**: `/api/v1/workout-plan`  
**Pattern**: Singleton (`WorkoutPlanController.instance`)  
**Database Model**: `WorkoutPlanDb` in [workoutPlan.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/workoutPlan.mongo.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`WorkoutPlanController` orchestrates multi-exercise workout routines. It enforces strict domain constraints (such as a 1-to-1 workout plan mapping per muscle group focus), calculates dynamic metrics (cumulative duration, calorie expenditure, work time per exercise), and provides full lifecycle management (creation, listing, single lookup by ID or target focus, status toggle, and soft-deletion).

---

## Strict Business & Domain Rules
When creating or modifying workout plans, the controller enforces four critical domain invariants:
1. **Unique Plan Name**: Case-insensitive duplicate check on `name` across all active plans.
2. **One Plan per Target Focus (`exerciseFor`)**: Only **one** active workout plan is permitted per target focus (e.g. only one active plan for "Chest", one for "Abs", etc.). Attempts to add a second plan for an existing `exerciseFor` are rejected.
3. **Muscle Consistency Constraint**:
   - If `exerciseFor !== Full Body`, **every** exercise included in the plan MUST have its `focusPart` matching `exerciseFor`.
   - Only plans designated as `"Full Body"` can incorporate exercises with varying focus parts.
4. **Automated Metric Aggregation**:
   - `workTime = sets * durationPerSet` calculated for each individual exercise.
   - `totalDuration = sum(exercise.selectedLevel.totalTimeToComplete)` across all exercises in the plan.
   - `totalCaloriesBurn = sum(exercise.selectedLevel.caloriesBurn)` across all exercises in the plan.
   - `subtitle`: Auto-generated from the first two unique focus parts joined by `" & "` (e.g. `"Chest & Back"`).

---

## API Endpoints & Methods

### 1. Create Workout Plan
- **Endpoint**: `POST /api/v1/workout-plan/create`
- **Method Handler**: `WorkoutPlanController.instance.createWorkoutPlan(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Compiles a structured, multi-exercise workout plan while calculating cumulative workout duration, calorie burns, and verifying consistency rules.
- **Request Body Contract** (`iCreateWorkoutPlanPayload`):
  ```json
  {
    "name": "Intense Chest Blast",
    "description": "High intensity routine targeting upper and lower pectoral development.",
    "exerciseFor": "Chest",
    "level": "Intermediate",
    "isActive": true,
    "exercises": [
      {
        "exerciseId": "67a3f8...",
        "name": "Incline Dumbbell Press",
        "focusPart": "Chest",
        "exerciseType": "Strength",
        "equipmentRequired": "Dumbbells, Incline Bench",
        "imageUrl": "https://assets.fitlog.com/exercises/incline-db.png",
        "selectedLevel": {
          "level": "Intermediate",
          "sets": 4,
          "reps": 10,
          "durationPerSet": 35,
          "restBetweenSets": 60,
          "caloriesBurn": 70,
          "totalTimeToComplete": 400
        },
        "note": "Focus on 2-second negative eccentric tempo"
      }
    ]
  }
  ```
- **Validation**:
  - Handled by `WorkoutPlanValidator.instance.createSchema` in [workoutPlan.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/workoutPlan.validator.ts).
- **Business Logic Steps**:
  1. Validates body schema (returns `400 BAD_REQUEST` on error).
  2. Duplicate name check via case-insensitive regex against `WorkoutPlanDb`.
  3. Single-plan-per-target check:
     ```typescript
     await WorkoutPlanDb.findOne({ exerciseFor: payload.exerciseFor, isDeleted: false });
     ```
     Returns `400 BAD_REQUEST` if a plan already exists for this `exerciseFor`.
  4. Focus consistency check: If `exerciseFor !== Full Body`, verifies all exercises have `focusPart === exerciseFor`.
  5. Derives unique focus parts, calculates `workTime`, aggregates `totalDuration` and `totalCaloriesBurn`.
  6. Creates and saves `WorkoutPlanDb` document.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Workout plan created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3fa...",
      "name": "Intense Chest Blast",
      "subtitle": "Chest",
      "description": "High intensity routine...",
      "exerciseFor": "Chest",
      "level": "Intermediate",
      "focusParts": ["Chest"],
      "totalExercises": 1,
      "totalDuration": 400,
      "totalCaloriesBurn": 70,
      "isActive": true,
      "isDeleted": false,
      "exercises": [...]
    }
  }
  ```

---

### 2. Get Workout Plans (List & Filter)
- **Endpoint**: `GET /api/v1/workout-plan/list`
- **Method Handler**: `WorkoutPlanController.instance.getWorkoutPlans(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Fetches the collection of active workout plans with optional filtering by difficulty level, activation state, or target body part.
- **Query Parameters**:
  - `exerciseFor`: string (filter by body region focus)
  - `level`: string (filter by difficulty: Beginner, Intermediate, Advanced)
  - `isActive`: string (`"true"` or `"false"`)
- **Response Shape**:
  ```json
  {
    "status": "SUCCESS",
    "message": "Workout plans fetched successfully",
    "httpCode": 200,
    "data": [ ...workoutPlans ]
  }
  ```

---

### 3. Get Workout Plan by Target Focus (`exerciseFor`)
- **Endpoint**: `GET /api/v1/workout-plan/by-exercise-for/:exerciseFor`
- **Method Handler**: `WorkoutPlanController.instance.getWorkoutPlanByExerciseFor(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Fetches the dedicated workout plan configured for a specific target muscle group (e.g. `GET /api/v1/workout-plan/by-exercise-for/Chest`).
  - Directly matches mobile views where users click on an anatomical muscle region to open its workout routine.
- **Route Parameters**:
  - `:exerciseFor` (required, must match a valid value in `eFocusPart` enum).
- **Error Responses**:
  - `400 BAD_REQUEST`: If `exerciseFor` is invalid or not in enum.
  - `404 NOT_FOUND`: If no plan exists for that focus part.

---

### 4. Get Workout Plan by ID
- **Endpoint**: `GET /api/v1/workout-plan/:id`
- **Method Handler**: `WorkoutPlanController.instance.getWorkoutPlanById(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Fetches detailed routine specifications, exercise steps, notes, and metrics for a specific workout plan ID.
- **Route Parameters**:
  - `:id` (required, must be a valid 24-character hexadecimal MongoDB ObjectId).
- **Error Responses**:
  - `400 BAD_REQUEST`: Invalid ObjectId.
  - `404 NOT_FOUND`: Plan not found or soft-deleted.

---

### 5. Toggle Workout Plan Status
- **Endpoint**: `PATCH /api/v1/workout-plan/:id/toggle-status`
- **Method Handler**: `WorkoutPlanController.instance.toggleWorkoutPlanStatus(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Inverts the plan's `isActive` flag (`true` -> `false` or `false` -> `true`).
  - Allows admins to stage or temporarily retire workout plans without deleting them.
- **Route Parameters**:
  - `:id` (valid MongoDB ObjectId).
- **Response**:
  - Returns message `"Workout plan activated successfully"` or `"Workout plan deactivated successfully"`.

---

### 6. Delete Workout Plan (Soft Delete)
- **Endpoint**: `DELETE /api/v1/workout-plan/:id`
- **Method Handler**: `WorkoutPlanController.instance.deleteWorkoutPlan(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Safely soft-deletes a workout plan by setting `{ isDeleted: true }`.
  - Preserves referential integrity for historical user workout session logs.
- **Route Parameters**:
  - `:id` (valid MongoDB ObjectId).
- **Response**:
  - Returns `200 OK` with message `"Workout plan deleted successfully"`.
