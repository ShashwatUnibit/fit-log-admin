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
1. **AI-Powered Exercise Creation with Rich Clinical & Biomechanical Data**:
   Administrators provide minimal input (movement name, focus part, optional image/video). The backend automatically interfaces with Google Gemini GenAI to generate:
   - Exercise classification (`exerciseType`) & required equipment (`equipmentRequired`).
   - Movement overview (`description`).
   - 4-tier difficulty progression (`levels`: Beginner, Intermediate, Advanced, Athlete) with repetitions, sets, rest intervals, calorie burn, duration per set, and total time to complete.
   - **Health Profile Precaution** (`healthProfilePrecaution`): Warning heading, clinical explanation of joint/tissue strain, and specific contraindication conditions (e.g. *Shoulder Impingement, Rotator Cuff Tear*).
   - **Target Muscles** (`targetMuscles`):
     - `primaryFocus`: Common name (e.g. *Mid Chest*) and anatomical/medical name (e.g. *Pectoralis Major (Sternal Head)*).
     - `secondaryFocus`: Array of recruited secondary and stabilizer muscles (e.g. *Front Shoulders, Triceps, Core & Lats*).
   - **Step-by-Step Instructions** (`stepByStepInstructions`): Numbered sequential phases (*Set Your Base & Grip, Unrack and Stabilize, Controlled Descent, Drive & Lockout*) with pro tips/cues.
   - **Common Mistakes & Corrections** (`commonMistakesAndCorrections`): Pairs detailing what to *AVOID* (e.g. *Bouncing bar off the sternum*), how to *FIX* it, and the anatomical *WHY* rationale.
   - **Breathing Pattern** (`breathingPattern`): Exact inhalation/exhalation cues per repetition phase.
2. **Exercise Querying & User-End Filters**:
   Supports user-end backend filtering by:
   - `focusPart` (muscle group, e.g. "Chest", "Legs"; "Full Body" fetches all).
   - `exerciseType` (e.g. "Strength", "Cardio", "HIIT").
   - `level` / `exerciseLevel` (e.g. "Beginner", "Intermediate", "Advanced", "Athelete").
   - `equipmentRequired` (regex match for equipment like "Barbell", "Dumbbells", "None (Bodyweight)").
   - `totalTimeToComplete` (finds exercises completing within `$lte` seconds).
   - Pagination (`page`, `limit`).
3. **Single Exercise Detail**:
   `GET /api/v1/exercise/:id?level=Intermediate` fetches the full UI-ready exercise profile.

---

## API Endpoints & Methods

### 1. Create Exercise (with Gemini AI Auto-Generation)
- **Endpoint**: `POST /api/v1/exercise/create`
- **Method Handler**: `ExerciseController.instance.createExercise(req: Request, res: Response): Promise<void>`
- **Request Body Contract** (`iCreateExercisePayload`):
  ```json
  {
    "name": "Flat Barbell Bench Press",
    "focusPart": "Chest",
    "description": "Optional description. If omitted, Gemini AI writes one.",
    "imageUrl": "https://assets.fitlog.com/exercises/flat-bench.png",
    "videoUrl": "https://assets.fitlog.com/exercises/flat-bench.mp4"
  }
  ```
  *(Note: Admins can optionally override or provide custom `equipmentRequired`, `exerciseType`, `healthProfilePrecaution`, `targetMuscles`, `stepByStepInstructions`, `commonMistakesAndCorrections`, `breathingPattern`, or `levels`. Any omitted fields are generated automatically by Gemini AI).*
- **Validation**:
  - Handled by `ExerciseValidator.instance.createSchema` in [exercise.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/exercise.validator.ts).
- **Business Logic & AI Workflow**:
  1. Validates input schema (`400 BAD_REQUEST` on Joi error).
  2. Duplicate check: searches `ExerciseDb` for `{ name: payload.name.trim(), isDeleted: false }`.
  3. Checks if add-on fields or level metrics are missing; if so, calls `GeminiService.instance.generateExerciseMetrics(payload.name.trim(), payload.focusPart)`.
  4. Saves complete document into MongoDB via `ExerciseDb`.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Exercise created successfully",
    "httpCode": 200,
    "data": {
      "id": "67a3f8...",
      "name": "Flat Barbell Bench Press",
      "description": "Flat Barbell Bench Press targets the chest complex...",
      "focusPart": "Chest",
      "exerciseType": "Strength",
      "equipmentRequired": "Barbell & Flat Bench",
      "image": "https://assets.fitlog.com/exercises/flat-bench.png",
      "imageUrl": "https://assets.fitlog.com/exercises/flat-bench.png",
      "video": "https://assets.fitlog.com/exercises/flat-bench.mp4",
      "videoUrl": "https://assets.fitlog.com/exercises/flat-bench.mp4",
      "healthProfilePrecaution": {
        "title": "Not recommended with Shoulder Impingement",
        "description": "High load at the bottom position strains the anterior shoulder joint capsule and wrists. Not recommended with acute shoulder or wrist injuries.",
        "conditions": [
          "Shoulder Impingement",
          "Rotator Cuff Tear"
        ]
      },
      "targetMuscles": {
        "primaryFocus": {
          "name": "Mid Chest",
          "anatomicalName": "Pectoralis Major (Sternal Head)"
        },
        "secondaryFocus": [
          "Front Shoulders",
          "Triceps",
          "Core & Lats"
        ]
      },
      "stepByStepInstructions": [
        {
          "stepNumber": 1,
          "title": "Set Your Base & Grip",
          "description": "Lie flat on the bench with eyes directly under the racked bar. Plant your feet flat on the floor and grip the bar slightly wider than shoulder-width with wrists straight.",
          "tip": "Retract your shoulder blades and pinch them firmly into the bench."
        },
        {
          "stepNumber": 2,
          "title": "Unrack and Stabilize",
          "description": "Take a deep breath into your belly, unrack the barbell by straightening arms, and move the bar horizontally over your mid-chest.",
          "tip": "Keep elbows soft, do not aggressively hyperextend your joints."
        },
        {
          "stepNumber": 3,
          "title": "Controlled Descent",
          "description": "Lower the barbell slowly in a controlled 2-3 second tempo until it gently touches the lower-to-middle chest, tucking elbows at roughly 45-degree angle.",
          "tip": "Do not flare elbows wide out to 90 degrees to protect rotator cuffs."
        },
        {
          "stepNumber": 4,
          "title": "Drive & Lockout",
          "description": "Press through your palms and drive the bar up in a slight arc back towards your eye level, locking out under control.",
          "tip": "Keep glutes and upper back glued to the bench throughout all reps."
        }
      ],
      "commonMistakesAndCorrections": [
        {
          "avoid": "Bouncing bar off the sternum",
          "fix": "Pause for half a second at the chest before pressing.",
          "why": "Bouncing uses momentum instead of muscle tension and can bruise cartilage or ribs."
        },
        {
          "avoid": "Flaring elbows at 90 degrees",
          "fix": "Tuck elbows inward at roughly 45 to 60 degrees from torso.",
          "why": "Extreme flare places excessive stress on the subacromial space and rotator cuffs."
        },
        {
          "avoid": "Lifting hips off the bench",
          "fix": "Keep glutes and upper back glued to the bench throughout all reps.",
          "why": "Excessive arching destabilizes the spine and invalidates range of motion."
        }
      ],
      "breathingPattern": "Inhale slowly as you lower the barbell to mid-chest. Exhale powerfully as you press back up.",
      "levels": [
        {
          "level": "Beginner",
          "repetition": 8,
          "sets": 3,
          "restTime": 90,
          "caloriesBurn": 45,
          "durationPerSet": 30,
          "totalTimeToComplete": 270
        },
        {
          "level": "Intermediate",
          "repetition": 10,
          "sets": 4,
          "restTime": 60,
          "caloriesBurn": 75,
          "durationPerSet": 35,
          "totalTimeToComplete": 320
        },
        {
          "level": "Advanced",
          "repetition": 12,
          "sets": 4,
          "restTime": 45,
          "caloriesBurn": 105,
          "durationPerSet": 40,
          "totalTimeToComplete": 295
        },
        {
          "level": "Athelete",
          "repetition": 15,
          "sets": 5,
          "restTime": 30,
          "caloriesBurn": 150,
          "durationPerSet": 45,
          "totalTimeToComplete": 345
        }
      ]
    }
  }
  ```

---

### 2. Get Exercises (List & User-End Filters)
- **Endpoint**: `GET /api/v1/exercise/list`
- **Method Handler**: `ExerciseController.instance.getExercises(req: Request, res: Response): Promise<void>`
- **Query Parameters** (`iGetExercisesQuery`):
  - `focusPart` (optional string): e.g. "Chest", "Legs", "Back".
  - `exerciseType` (optional string): e.g. "Strength", "Cardio", "HIIT".
  - `level` / `exerciseLevel` (optional string): e.g. "Beginner", "Intermediate", "Advanced", "Athelete".
  - `equipmentRequired` (optional string): Regex search (e.g. "Dumbbell", "Barbell", "Bodyweight").
  - `totalTimeToComplete` (optional number): Filters routines where `totalTimeToComplete <= value`.
  - `page` (optional number, min 1).
  - `limit` (optional number, min 1).
- **Behavior When Level Filter is Applied**:
  When `level` or `exerciseLevel` is passed in the query, the response formats each exercise with top-level attributes:
  `id`, `image`, `video`, `level`, `sets`, `repetitions`, `restTime`, `caloriesBurn`, `durationPerSet`, `totalTimeToComplete`, `healthProfilePrecaution`, `targetMuscles`, `stepByStepInstructions`, `commonMistakesAndCorrections`, and `breathingPattern`.

---

### 3. Get Exercise Detail by ID
- **Endpoint**: `GET /api/v1/exercise/:id`
- **Method Handler**: `ExerciseController.instance.getExerciseById(req: Request, res: Response): Promise<void>`
- **Route Parameters**:
  - `:id` (required, MongoDB ObjectId).
- **Query Parameters**:
  - `level` (optional, e.g. `?level=Intermediate`).
- **Response Shape**:
  Returns the complete exercise detail matching the mobile UI screen specifications.
