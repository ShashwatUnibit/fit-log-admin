# Project Facts (verified against code 2026-10-23 — update when they change)

## Stack
- TypeScript 6 strict, target/lib ES2023, module NodeNext. Runtime Node 20 (esbuild target).
- Express 5.2, Mongoose 9.2 (MongoDB), Redis client 6 (`src/db/redis/client.redis.ts`), Joi 18 + @joi/date.
- AI: Gemini via raw REST (`fetch` to generativelanguage.googleapis.com) in `src/services/gemini.service.ts`,
  with a candidate-model fallback loop. LangChain/OpenRouter packages are installed but NOT used in `src/`.
- Package manager: npm.

## Commands
- Dev: `npm run dev` (nodemon + tsx)
- Lint: `npx eslint .` (or a single file: `npx eslint src/path/file.ts`)
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build` (tsc --noEmit + esbuild bundle to build/index.js)
- Tests: NONE. No test runner installed, no `test/` folder. Verify with lint + typecheck + build,
  and say "unverified at runtime" unless the endpoint was actually called.

## Lint rules that commonly break generated code (eslint.config.mts)
- `max-params: 2` -> pass an object for 3+ args (Express error middleware uses an eslint-disable).
- `max-depth: 3`, `max-lines-per-function: 150`, `curly: all`, `eqeqeq`, `prefer-template`,
  `prefer-destructuring`, `no-nested-ternary`, `no-else-return`, `arrow-body-style: as-needed`.
- `explicit-function-return-type` required; `no-explicit-any` error; `no-unsafe-*` errors.

## Layout (src/)
- `index.ts` mounts every router at `/api/v1/<kebab-name>` with `AuthSecurity.validateAppId`.
- Per feature: `routes/x.route.ts` -> `controllers/x.controller.ts` -> `db/mongo/x.mongo.ts` (Mongoose model),
  plus `validators/x.validator.ts` (Joi) and `interfaces/x.interface.ts`.
- `services/`: only auth, gemini, cron. Most controllers query Mongoose models directly (no repository layer).
- `security/`: `auth.security.ts` (validateAppId, validateToken, validateServerKey),
  `encryption.security.ts` (onRequest / onResponse).
- `consts/`: `cEnv` (env.const), `cDbNames` (db.const). `enums/server.enum.ts`: eHttpStatusCode, eResponseStatus.
- No migrations (Mongoose schemas only). Seed script: `src/scripts/seed-admin.ts`.

## Endpoints (source of truth: src/routes/*.ts)
- auth: POST /login, /auto-login | data: GET /test, /static-data
- food-preference, food-allergy, food-intolerance, dietary-restriction: POST /create
- exercise, yoga: POST /create, GET /list, GET /:id
- workout-plan: POST /create, GET /list, GET /by-exercise-for/:exerciseFor, GET /:id,
  PATCH /:id/toggle-status, DELETE /:id (soft delete)
- Detailed per-controller docs: `.agents/docs/controllers/<name>.controller.md` (read only the one you need).

## Known gaps (do not assume otherwise)
- No project logger exists; code uses `console.*` (eslint `no-console` is off).
- `validateToken` (JWT) is defined but not mounted on any route, so admin routes are protected by app-id only.
- `.github/agents/nodejs.md` describes a `backend/**` layout that does not exist in this repo; ignore it.
