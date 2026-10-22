# Yoga Controller (`YogaController`)

**Source File**: [yoga.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/yoga.controller.ts)  
**Route File**: [yoga.route.ts](file:///d:/Backend/fit_log_admin/src/routes/yoga.route.ts)  
**Base Path**: `/api/v1/yoga`  
**Pattern**: Singleton (`YogaController.instance`)  
**Database Model**: `YogaDb` in [yoga.mongo.ts](file:///d:/Backend/fit_log_admin/src/db/mongo/yoga.mongo.ts)  
**AI Integration**: `GeminiService.instance.generateYogaDetails` in [gemini.service.ts](file:///d:/Backend/fit_log_admin/src/services/gemini.service.ts)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Responses encrypted via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`YogaController` manages the yoga pose database and instruction library in FitLog. It incorporates Google Gemini GenAI to automatically research and author comprehensive yoga posture profiles from just an English or Sanskrit pose name, including Sanskrit phonetic transliteration, therapeutic benefits, step-by-step alignments, timing, props, and pranayama breathing guidance. It also supports fuzzy multi-field search and paginated browsing.

---

## API Endpoints & Methods

### 1. Create Yoga Pose (with Gemini AI Auto-Generation)
- **Endpoint**: `POST /api/v1/yoga/create`
- **Method Handler**: `YogaController.instance.createYoga(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Adds a new yoga posture to the library.
  - Takes either the English name (e.g., "Warrior II") or Sanskrit name (e.g., "Virabhadrasana II"), checks for duplicates across both names, and prompts Gemini AI to construct the complete posture instruction package.
- **Request Body Contract** (`iCreateYogaPayload`):
  ```json
  {
    "englishName": "Downward-Facing Dog",
    "sanskritName": "Adho Mukha Svanasana",
    "imageUrl": "https://assets.fitlog.com/yoga/downward-dog.png",
    "videoUrl": "https://assets.fitlog.com/yoga/downward-dog.mp4",
    "isActive": true
  }
  ```
  *(Note: At least one of `englishName` or `sanskritName` is required).*
- **Validation**:
  - Handled by `YogaValidator.instance.createSchema` in [yoga.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/yoga.validator.ts).
- **Business Logic & AI Synthesis**:
  1. Validates body payload; rejects with `400 BAD_REQUEST` if invalid.
  2. Duplicate check: Searches `YogaDb` using case-insensitive regex across `$or: [{ englishName }, { sanskritName }]`.
     - If either name is already registered, rejects with `400 BAD_REQUEST`: `"Yoga pose with this English or Sanskrit name already exists"`.
  3. Invokes Gemini AI service:
     ```typescript
     const aiYoga = await GeminiService.instance.generateYogaDetails({
         englishName,
         sanskritName
     });
     ```
     Gemini AI generates:
     - `sanskritNamePhonetic`: e.g. `"AH-doh MOO-kuh shvah-NAHS-uh-nuh"`
     - `description`: Complete overview of the posture
     - `benefits`: Array of physiological and mental benefits
     - `instructions`: Array of sequential setup and alignment steps
     - `defaultHoldDurationSeconds`: Recommended hold duration (e.g. 30)
     - `recommendedRepitition`: Recommended repetitions (e.g. 3)
     - `timeTakenPerRepetition`: Time per rep including transitions
     - `totalTimeTaken`: Cumulative sequence time
     - `propsRequired`: Array of required/optional props (e.g. `["Yoga Mat", "Yoga Block"]`)
     - `breathingGuidance`: Specific inhalation and exhalation cues
  4. Saves complete document into MongoDB via `YogaDb`.
  5. Returns created yoga pose in standard response envelope.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Yoga pose created successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3fc...",
      "englishName": "Downward-Facing Dog",
      "sanskritName": "Adho Mukha Svanasana",
      "sanskritNamePhonetic": "AH-doh MOO-kuh shvah-NAHS-uh-nuh",
      "description": "An inversion asana often practiced as part of the Sun Salutation sequence...",
      "benefits": [
        "Calms the brain and helps relieve stress",
        "Stretches the shoulders, hamstrings, calves, and hands",
        "Strengthens the arms and legs"
      ],
      "instructions": [
        "Come onto your hands and knees in tabletop position...",
        "Tuck your toes and lift your knees away from the floor...",
        "Press firmly through your palms and fingers..."
      ],
      "defaultHoldDurationSeconds": 30,
      "recommendedRepitition": 3,
      "timeTakenPerRepetition": 40,
      "totalTimeTaken": 120,
      "propsRequired": ["Yoga Mat"],
      "breathingGuidance": "Inhale as you lengthen through the spine; exhale as you press your chest gently toward your thighs.",
      "imageUrl": "https://assets.fitlog.com/yoga/downward-dog.png",
      "isActive": true,
      "isDeleted": false,
      "createdAt": "2026-10-12T05:00:00.000Z"
    }
  }
  ```

---

### 2. Get Yoga Poses (List, Search & Pagination)
- **Endpoint**: `GET /api/v1/yoga/list`
- **Method Handler**: `YogaController.instance.getYogas(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Provides paginated browsing and search across the yoga posture catalog.
  - Searches simultaneously across `englishName`, `sanskritName`, and `sanskritNamePhonetic` using case-insensitive regex.
- **Query Parameters** (`iGetYogasQuery`):
  - `search` (optional string): Query term matched against English, Sanskrit, and phonetic names.
  - `page` (optional number, defaults to 1).
  - `limit` (optional number, defaults to 20).
- **Validation**:
  - Handled by `YogaValidator.instance.getYogasQuerySchema` in [yoga.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/yoga.validator.ts).
- **Response Shape**:
  ```json
  {
    "status": "SUCCESS",
    "message": "Yoga list retrieved successfully",
    "httpCode": 200,
    "data": {
      "items": [ ...yogaDocuments ],
      "total": 35,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
  ```

---

### 3. Get Yoga Pose by ID
- **Endpoint**: `GET /api/v1/yoga/:id`
- **Method Handler**: `YogaController.instance.getYogaById(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Fetches the full pose profile, instructions, benefits, and breathing guide by MongoDB `_id`.
- **Route Parameters**:
  - `:id` (required, MongoDB ObjectId).
- **Error Responses**:
  - `404 NOT_FOUND`: If no active pose with that ID exists.
  - `500 INTERNAL_SERVER_ERROR`: Database error.
