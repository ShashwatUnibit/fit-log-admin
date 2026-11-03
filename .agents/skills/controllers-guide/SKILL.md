---
name: controllers-guide
description: Index of all 9 API controllers. Read this table first, then open only the one detailed doc you need from .agents/docs/controllers/. Reference guide for all 9 API controllers in FitLog Admin (auth, data, dietaryRestriction, foodAllergy, foodIntolerance, foodPreference, exercise, workoutPlan, yoga). Outlines routes, methods, business logic, validation, AI generation, and security pipelines.
---

# FitLog Admin Controllers Guide

This skill provides an authoritative, hallucination-free reference for all API controllers in the `fit_log_admin` backend service.

## Architecture & Common Middleware

All controllers follow the **Singleton pattern** (`ControllerClass.instance`), expose express request handlers, and are mounted onto the application router in [src/index.ts](../../../src/index.ts) under `/api/v1/*`.

### Global Pipeline:
1. **App ID Authentication**: All routes enforce `AuthSecurity.instance.validateAppId` to ensure calls originate from authorized clients.
2. **Encryption / Payload Security**: Responses are wrapped with `EncryptionSecurity.instance.onResponse`.
3. **Response Envelope**: Every response adheres to the `iResponse` contract with `status` (`SUCCESS` | `FAIL` | `ERROR`), `message`, `httpCode`, and optional `data`.
4. **Validation**: Handled prior to service execution via dedicated Joi validator singletons in `src/validators/`.

---

## Quick Controller Index

| Controller | Base Route | Key Methods | Description | Detailed Reference |
| :--- | :--- | :--- | :--- | :--- |
| **AuthController** | `/api/v1/auth` | `adminLogin`, `adminAutoLogin` | Admin credentials verification, JWT token issuance, session resumption | [auth.controller.md](../../docs/controllers/auth.controller.md) |
| **DataController** | `/api/v1/data` | `getData`, `getStaticData` | Diagnostic query echo, master system enums (food preferences, allergies, exercise enums) | [data.controller.md](../../docs/controllers/data.controller.md) |
| **DietaryRestrictionController** | `/api/v1/dietary-restriction` | `createDietaryRestriction` | Adds dietary constraints (Halal, Kosher, Vegan) with duplicate prevention | [dietaryRestriction.controller.md](../../docs/controllers/dietaryRestriction.controller.md) |
| **FoodAllergyController** | `/api/v1/food-allergy` | `createFoodAllergy` | Registers true clinical food allergies (Peanuts, Shellfish) | [foodAllergy.controller.md](../../docs/controllers/foodAllergy.controller.md) |
| **FoodIntoleranceController** | `/api/v1/food-intolerance` | `createFoodIntolerance` | Registers digestive intolerances (Lactose, Gluten, Histamine) | [foodIntolerance.controller.md](../../docs/controllers/foodIntolerance.controller.md) |
| **FoodPreferenceController** | `/api/v1/food-preference` | `createFoodPreference` | Manages elective dietary lifestyles (Mediterranean, Keto, Paleo) | [foodPreference.controller.md](../../docs/controllers/foodPreference.controller.md) |
| **ExerciseController** | `/api/v1/exercise` | `createExercise`, `getExercises`, `getExerciseById` | AI-assisted exercise creation (Gemini GenAI), 4-tier difficulty levels, listing & filter | [exercise.controller.md](../../docs/controllers/exercise.controller.md) |
| **BannerController** | `/api/v1/banner` | `createBanner`, `getBanners`, `updateBannerStatus`, `updateBannerOrder`, `deleteBanner` | App banners with gap-free ordering (insert/move shifts others), soft delete, active toggle | [banner.controller.md](../../docs/controllers/banner.controller.md) |
| **NotificationController** | `/api/v1/notification` | `getAudienceCount`, `sendNotification`, `sendTestNotification`, `listCampaigns`, `getCampaign`, `cancelCampaign`, `retryCampaign` (+ `NotificationTemplateController`: create/list/update/delete templates) | Admin push notifications over FCM: all / segment / chosen users, schedule, test, history, retry | [notification.controller.md](../../docs/controllers/notification.controller.md) |
| **AppConfigController** | `/api/v1/app-config` | `listConfigs`, `getEffective`, `createConfig`, `updateConfig`, `deleteConfig`, `setForceUpdate`, `bulkForceUpdate`, `setMaintenance`, `getHistory`, `restoreHistory` | Mobile app remote config for Android and iOS: base + per-version documents, maintenance, force update, history/restore, superAdmin only | [appConfig.controller.md](../../docs/controllers/appConfig.controller.md) |
| **WorkoutPlanController** | `/api/v1/workout-plan` | `createWorkoutPlan`, `getWorkoutPlans`, `getWorkoutPlanById`, `getWorkoutPlanByExerciseFor`, `toggleWorkoutPlanStatus`, `deleteWorkoutPlan` | Multi-exercise workout plans, strict single plan per target focus, aggregated metrics | [workoutPlan.controller.md](../../docs/controllers/workoutPlan.controller.md) |
| **YogaController** | `/api/v1/yoga` | `createYoga`, `getYogas`, `getYogaById` | Gemini AI-generated posture profiles, Sanskrit phonetics, benefits, steps, fuzzy search | [yoga.controller.md](../../docs/controllers/yoga.controller.md) |

---

## When to Consult These Documents
- When adding, updating, or reviewing routes, always check the corresponding `.md` file to maintain consistency in schema validation, duplicate detection, and encryption formatting.
- When generating AI prompts or LangChain pipelines, refer to [exercise.controller.md](../../docs/controllers/exercise.controller.md) and [yoga.controller.md](../../docs/controllers/yoga.controller.md) for data schemas generated by `GeminiService`.
