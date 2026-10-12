# FitLog Admin - Coding Guidelines & Rules

## Code Conventions
- **Naming Prefixes**:
  - `c` prefix for constants (e.g., `cEnv`, `cRegex`)
  - `e` prefix for enums (e.g., `eHttpStatusCode`, `eResponseStatus`)
  - `i` prefix for interfaces (e.g., `iResponse`, `iUserSession`)
- **Singletons**:
  - Services, controllers, security handlers, and route classes should implement static `instance` getters.
- **Routing & Controllers**:
  - Always validate `AppId` on routes via `AuthSecurity.instance.validateAppId`.
  - Wrap database and controller calls with standard error handling and return structured `iResponse`.
- **Validation**:
  - Use Joi schemas in `src/validators/` for validating request parameters, bodies, and queries before processing.
- **Environment**:
  - Always read environment variables through `src/consts/env.const.ts` (`cEnv`). Never call `process.env` directly in feature code.
