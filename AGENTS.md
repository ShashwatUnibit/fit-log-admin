# FitLog Admin Backend - AI Agent Guidelines & Context

## Project Overview
`fit_log_admin` is an administrative and core service backend for the **FitLog** platform. It provides RESTful APIs for managing fitness resources, exercise databases, workout plans, nutrition & dietary constraints (food preferences, allergies, intolerances, dietary restrictions), and AI-driven workout plan generation using LangChain and Google GenAI.

## Tech Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode, ES modules / CommonJS bundled with `esbuild` and executed via `tsx` / `nodemon`)
- **Web Framework**: Express 5 (`express@^5.2.1`)
- **Database**: MongoDB via Mongoose 9 (`mongoose@^9.2.4`)
- **Caching / Session Storage**: Redis 6 (`redis@^6.0.0`)
- **AI / LLM Integration**: LangChain (`@langchain/core`, `@langchain/google-genai`, `@langchain/langgraph`, `@openrouter/sdk`)
- **Validation**: Joi (`joi`, `@joi/date`)
- **Security & Crypto**: `crypto-js`, `jsonwebtoken`, `mongo-sanitize`
- **Build Tools**: `tsx`, `esbuild`, `typescript`

## Workspace Structure
```
fit_log_admin/
├── .agents/                    # Antigravity agent configurations
│   ├── rules/                  # Project rules and conventions
│   └── skills/                 # Custom skills (e.g., workspace-helper)
├── build/                      # Bundled production distribution
├── src/
│   ├── consts/                 # Static values, env configurations, regex
│   ├── controllers/            # Request handlers (Singleton pattern)
│   ├── db/
│   │   ├── mongo/              # Mongoose schemas, models, and DB connector
│   │   └── redis/              # Redis client, partitions, and cache operations
│   ├── enums/                  # System, HTTP, and domain-level enums
│   ├── interfaces/             # TypeScript data contracts & request/response shapes
│   ├── middlewares/            # Express middlewares
│   ├── modules/                # Feature-specific modules / sub-services
│   ├── routes/                 # Express route definitions (Singleton pattern)
│   ├── scripts/                # Utility and database migration/seed scripts
│   ├── security/               # App ID validation, JWT auth, encryption
│   ├── services/               # Core business logic, LangChain AI services, cron
│   ├── types/                  # Additional TypeScript type definitions
│   ├── utils/                  # Helper utilities, logger, response wrappers
│   ├── validators/             # Joi validation schemas
│   └── index.ts                # Application entrypoint & server bootstrap
├── package.json
└── tsconfig.json
```

## Architectural Patterns & Conventions
1. **Singleton Pattern**:
   - Controllers, routes, services, and security managers follow the singleton pattern:
     ```typescript
     export default class ExerciseController {
         private static _instance: ExerciseController;
         public static get instance(): ExerciseController {
             if (!this._instance) {
                 this._instance = new ExerciseController();
             }
             return this._instance;
         }
     }
     ```
2. **API Routes & Security**:
   - All `/api/v1/*` routes pass through `AuthSecurity.instance.validateAppId`:
     ```typescript
     app.use("/api/v1/exercise", AuthSecurity.instance.validateAppId.bind(AuthSecurity.instance), ExerciseRoute.instance.router);
     ```
   - Request encryption / decryption is managed via `EncryptionSecurity.instance.onRequest`.
3. **Uniform Response Contract**:
   - Responses follow the `iResponse` interface using `eHttpStatusCode` and `eResponseStatus`.
4. **Environment Variables**:
   - All runtime configurations must be declared and accessed through `cEnv` in `src/consts/env.const.ts`.
5. **Linting & Code Quality**:
   - TypeScript ESLint flat configuration is in `eslint.config.mts`.
   - Adhere to existing naming conventions (e.g., `c` prefix for consts, `e` prefix for enums, `i` prefix for interfaces).

## Running and Building
- **Development**: `npm run dev` (runs `nodemon --exec tsx src/index.ts`)
- **Type Checking & Build**: `npm run build` (`tsc --noEmit && esbuild src/index.ts ...`)
- **Production Execution**: `npm start` (`node build/index.js`)
