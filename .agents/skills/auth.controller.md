# Auth Controller (`AuthController`)

**Source File**: [auth.controller.ts](file:///d:/Backend/fit_log_admin/src/controllers/auth.controller.ts)  
**Route File**: [auth.route.ts](file:///d:/Backend/fit_log_admin/src/routes/auth.route.ts)  
**Base Path**: `/api/v1/auth`  
**Pattern**: Singleton (`AuthController.instance`)  
**Security & Middlewares**:
- Registered under `AuthSecurity.instance.validateAppId` (requires valid `app-id` in request headers).
- Request/Response payloads are handled via [EncryptionSecurity](file:///d:/Backend/fit_log_admin/src/security/encryption.security.ts) (`EncryptionSecurity.instance.onResponse`).

---

## Purpose & Overview
`AuthController` is responsible for administrative user authentication and session management. It provides:
1. Credential-based login (Email + Password) returning a signed JSON Web Token (JWT) and administrative user profile.
2. Auto-login token verification allowing client applications to resume an administrative session on launch and refresh their access token.

---

## API Endpoints & Methods

### 1. Admin Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Method Handler**: `AuthController.instance.adminLogin(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Authenticates an administrative user against MongoDB credentials.
  - Generates a new JWT bearer token and injects it into the HTTP response `Authorization` header.
- **Request Body Contract** (`iAdminLoginPayload`):
  ```json
  {
    "emailId": "admin@fitlog.com",
    "password": "Admin@12345",
    "fcmToken": "optional_firebase_cloud_messaging_token"
  }
  ```
- **Validation**:
  - Handled by `AuthValidator.instance.loginSchema` in [auth.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/auth.validator.ts).
  - Validates valid email format and required password string.
- **Business Logic & Delegations**:
  1. Validates request body with Joi schema; returns HTTP `400 BAD_REQUEST` on failure.
  2. Calls `AuthService.instance.adminLogin(payload)`.
  3. Finds admin by email where `isDeleted: false`.
  4. Compares passwords using `bcrypt.compare`.
  5. Verifies account status (`isActive: true`).
  6. Signs and issues JWT bearer token with expiration.
  7. Sets HTTP Response Header: `Authorization: Bearer <token>`.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Admin logged in successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "name": "Super Admin",
      "email": "admin@example.com",
      "role": "SUPER_ADMIN",
      "isActive": true
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Validation schema failure.
  - `401 UNAUTHORIZED` / `400 BAD_REQUEST`: Invalid email/password, or inactive account.
  - `500 INTERNAL_SERVER_ERROR`: Server or database failure.

---

### 2. Admin Auto-Login
- **Endpoint**: `POST /api/v1/auth/auto-login`
- **Method Handler**: `AuthController.instance.adminAutoLogin(req: Request, res: Response): Promise<void>`
- **Reason & Purpose**:
  - Re-authenticates an administrator whose access token is stored client-side.
  - Verifies token integrity and expiration, ensures the admin account is still active and not deleted, and generates a refreshed JWT token.
- **Request Body Contract** (`iAdminAutoLoginPayload`):
  ```json
  {
    "userId": "67a3f8...",
    "password": "Admin@12345",
    "fcmToken": "optional_firebase_cloud_messaging_token"
  }
  ```
- **Validation**:
  - Handled by `AuthValidator.instance.autoLoginSchema` in [auth.validator.ts](file:///d:/Backend/fit_log_admin/src/validators/auth.validator.ts).
  - Validates `token` presence and format.
- **Business Logic & Delegations**:
  1. Validates request body with Joi schema.
  2. Calls `AuthService.instance.adminAutoLogin(payload)`.
  3. Verifies token signature using `jsonwebtoken`.
  4. Looks up admin by decoded `id` in MongoDB (`isDeleted: false, isActive: true`).
  5. Signs and issues a refreshed JWT bearer token.
  6. Sets HTTP Response Header: `Authorization: Bearer <token>`.
- **Response Shape** (`iResponse`):
  ```json
  {
    "status": "SUCCESS",
    "message": "Admin auto-logged in successfully",
    "httpCode": 200,
    "data": {
      "_id": "67a3f8...",
      "name": "Super Admin",
      "email": "admin@example.com",
      "role": "SUPER_ADMIN",
      "isActive": true
    }
  }
  ```
- **Error Responses**:
  - `400 BAD_REQUEST`: Invalid payload or malformed token.
  - `401 UNAUTHORIZED`: Expired or invalid signature token, or account deactivated.
  - `500 INTERNAL_SERVER_ERROR`: Server error.
