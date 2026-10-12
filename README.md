# FitLog Admin Backend

FitLog Admin is a Node.js & TypeScript service providing administrative management, fitness catalog control, dietary restriction definitions, workout plan generation, and AI agent integration for the FitLog platform.

## Features
- **Authentication & Security**: App-ID validation, JWT authorization, payload encryption/decryption, and request signing.
- **Exercise Management**: Curated catalog of fitness exercises, muscle groups, equipment requirements, and instructions.
- **Workout Planning**: Structured workout plan builder and AI-driven workout plan generation powered by LangChain and Google GenAI.
- **Dietary & Nutrition Engine**:
  - Food Preferences
  - Food Allergies
  - Food Intolerances
  - Dietary Restrictions
- **Database & Caching**:
  - MongoDB (Mongoose) for primary persistent document storage.
  - Redis for fast in-memory caching and session state.
- **Automated Tasks**: Scheduled maintenance and sync routines via Cron jobs.

---

## Directory Structure
```
fit_log_admin/
├── .agents/
│   ├── rules/
│   │   └── workspace-rules.md     # Workspace coding guidelines and conventions
│   └── skills/
│       └── workspace-helper/
│           └── SKILL.md           # Antigravity custom skill for workspace navigation
├── AGENTS.md                      # AI assistant context & architecture guidelines
├── src/
│   ├── consts/                    # Configuration and constant definitions
│   ├── controllers/               # Request handling and business coordination
│   ├── db/
│   │   ├── mongo/                 # Mongoose schemas, models, and connection
│   │   └── redis/                 # Redis client and caching adapters
│   ├── enums/                     # System-wide enumerations
│   ├── interfaces/                # TypeScript interfaces and response schemas
│   ├── middlewares/               # Custom Express middlewares
│   ├── modules/                   # Domain modules and sub-services
│   ├── routes/                    # API route definitions
│   ├── scripts/                   # Data seeding and migration utilities
│   ├── security/                  # App ID, JWT, and encryption handlers
│   ├── services/                  # Business logic and AI service integrations
│   ├── types/                     # Ambient type declarations
│   ├── utils/                     # Reusable utility functions
│   ├── validators/                # Request validation schemas (Joi)
│   └── index.ts                   # Main server bootstrap
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites
- **Node.js**: v20 or higher
- **MongoDB**: Running instance (local or Atlas)
- **Redis**: Running instance

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file in the project root:
```env
PORT=8000
SERVER_ENV=dev
APP_ID=your_app_id
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
MONGO_URL=mongodb://localhost:27017/fit_log
DB_REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_google_gemini_api_key
```

### Running the Application
- **Development (Live Reload)**:
  ```bash
  npm run dev
  ```
- **Typecheck and Build**:
  ```bash
  npm run build
  ```
- **Production**:
  ```bash
  npm start
  ```

---

## API Routes Overview
All endpoints require valid `app-id` verification via headers:
- `/api/v1/auth`: Authentication and admin access management
- `/api/v1/data`: General lookup and reference data
- `/api/v1/exercise`: Exercise catalog and metadata
- `/api/v1/workout-plan`: Workout plan creation and generation
- `/api/v1/food-preference`: Food preferences management
- `/api/v1/food-allergy`: Allergen management
- `/api/v1/food-intolerance`: Food intolerance management
- `/api/v1/dietary-restriction`: Dietary restriction rules
