# FitLog Admin - Coding Conventions

Copy the closest existing feature instead of inventing structure. Canonical small example:
`food-allergy` (route, controller, validator, mongo model, interface).

## Naming
- `c` prefix for constants (`cEnv`, `cDbNames`), `e` for enums (`eHttpStatusCode`), `i` for interfaces (`iResponse`).
- Files: `<feature>.<layer>.ts`, e.g. `workoutPlan.controller.ts`, `workoutPlan.mongo.ts`. Route paths are kebab-case.
- Mongoose model export is `<Feature>Db`; collection name is added to `cDbNames` in `src/consts/db.const.ts`.

## Classes
- Routes, controllers, validators, services and security classes are singletons:
  `public static instance = new X(); private constructor() {}`.
- Route handlers are bound: `Controller.instance.method.bind(Controller.instance)`.

## Request flow inside a controller
1. Validate first: `XValidator.instance.<schema>.validate(req.body || {})` (or `req.query` / `req.params`).
   On error, respond with `eResponseStatus.ERROR` + `BAD_REQUEST` and `return`.
2. Business logic in `try`. Business-rule failures (duplicate, not found) also use `eResponseStatus.ERROR`.
3. Always respond through `EncryptionSecurity.instance.onResponse(req, res, responseData)` with an `iResponse`
   (`status`, `message`, `httpCode`, optional `data`). Never call `res.json` directly in controllers.
4. `catch (err: unknown)`: map with `toErrorResponse(err)` from `src/utils/common.util.ts`, respond with
   `eResponseStatus.FAIL`.

## Validation (Joi)
- Schemas live in `src/validators/`, typed `Joi.object<iPayload>(...)`, with explicit `.messages({...})`
  and `.options({ convert: true, abortEarly: true, allowUnknown: false })`.
- Enum fields: `.valid(...Object.values(eSomething))`.

## Data
- Soft delete: documents carry `isDeleted: false`; every query filters on `isDeleted: false`.
- Schemas use `timestamps: true, versionKey: false, collection: cDbNames.<x>`.
- Use `.lean()` for read-only queries.

## Environment and security
- Read env only via `cEnv` (`src/consts/env.const.ts`); add new vars there. Never use `process.env` in feature code.
- App-id check is applied when the router is mounted in `src/index.ts`, not inside route files.
