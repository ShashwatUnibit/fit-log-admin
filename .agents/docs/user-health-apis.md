# User 360° health APIs (Vitals, Activity & Habits, Mood, Menstrual)

All `GET`, read-only, under `/api/v1/users/:id/...` (JWT + encryption like the other user routes). `:id` is the 24-hex user id.
Errors: 400 bad id/query (`status:"error"`), 404 "User not found", 500 `status:"fail"`.
Code: `src/controllers/userVitals|userActivity|userMenstrual.controller.ts`, shared helpers `src/utils/healthRange.util.ts`, `healthStatus.util.ts`.

## Common query
| Param | Values | Used by |
|---|---|---|
| `days` | `7`, `30` (default for summaries), `90` | every summary; optional on list endpoints (omitted = all time; `activity/daily` defaults to 30) |
| `page`, `limit` | page ≥ 1 (default 1), limit 1–50 (default 10) | every list endpoint |
| `mealContext` | `all` (default), `fasting`, `before_meal`, `after_meal`, `random` | blood-sugar endpoints |

Summaries return `range {days, from, to}` and `hasAnyData` (user ever logged this; tells "never logged" from "none in range").
Lists return `pagination {page, limit, totalItems, totalPages}`.
`status` (category) is `Low | Normal | Elevated | High`, from `healthStatus.util.ts` (same rules as the overview cards).
"Today"/day buckets use the server's local day (`healthRange.util.ts`); the menstrual endpoints use calendar days in India (UTC+05:30, like the user app) and return `YYYY-MM-DD` strings.

## Endpoints
| Endpoint | Returns |
|---|---|
| `/vitals/blood-pressure/summary?days` | `latest` (all-time) `{systolic,diastolic,unit,status,loggedAt}`, `average {systolic,diastolic}`, `totalReadings`, `aboveNormalCount` (Elevated+High), `dailyHighest[]` (highest reading per day: `date,systolic,diastolic,status,loggedAt`) |
| `/vitals/blood-pressure/readings?page&limit&days` | `readings[]` newest first `{id,systolic,diastolic,unit,status,loggedAt}` + pagination |
| `/vitals/blood-sugar/summary?days&mealContext` | `latest` (all-time, for the meal context), `average`, `totalReadings`, `outsideNormal {low,elevated,high,total}`, `readings[]` of the range oldest first `{value,mealContext,mealContextLabel,status,loggedAt}` (the graph) |
| `/vitals/blood-sugar/readings?page&limit&days&mealContext` | `readings[]` newest first with `id` + pagination |
| `/vitals/heart-rate/summary?days` | `latest`, `average`, `minimum`/`maximum` (`bpm,status,loggedAt`; ties → earlier), `totalReadings`, `dailyHighest[]` |
| `/vitals/heart-rate/readings?page&limit&days` | `readings[] {id,bpm,unit,status,loggedAt}` + pagination |
| `/activity/summary?days` | `steps` and `water`: `today {value,goal,percentOfGoal,goalMet}`, `averagePerDay` (over days with a log), `loggedDays`, `daysGoalMet` (≥ goal, over every day of the range); `daily[]` one `{date,steps,water}` per day, oldest first, 0 when nothing logged |
| `/activity/daily?page&limit&days` | `days[]` newest first `{date,steps,stepsGoal,stepsPercentOfGoal,stepsGoalMet,water,waterGoal,waterPercentOfGoal,waterGoalMet}` + pagination |
| `/mood/summary?days` | `totalEntries`, `daysWithEntries`, `distribution[]` (all 7 moods: `mood,label,sentiment,count,percentage`), `sentiments[]` (positive/neutral/negative), `recentEntries[]` (10 newest `{id,mood,label,sentiment,note,loggedAt}`) |
| `/mood/entries?page&limit&days` | `entries[]` newest first + pagination |
| `/menstrual` | `{isApplicable, hasProfile}`; with a profile also `profile`, `currentCycle {lastPeriodStart,lastPeriodSource,cycleLengthDays,periodLengthDays,cycleDay,phase,phaseLabel,status,daysOverdue,phases[]}`, `nextPeriod {date,inDays,...}`, `timeline[3] {start,end,isPredicted}`, `loggedPeriodCount`, `insight` (today's stored AI insight `{phase,tips,remedies,generatedAt}` or `null`; never triggers the AI) |
| `/menstrual/period-logs?page&limit` | `summary {totalLogs,averageCycleLengthDays,averagePeriodLengthDays}`, `logs[]` newest first `{id,periodStartDate,periodEndDate,durationDays,flowIntensity,flowLabel,symptoms[{key,label}],notes,cycleLengthDays,loggedAt}` + pagination |

## Notes
- Source data: the user app's collections (`bloodpressures`, `bloodsugars`, `heartrates`, `steps`, `waterintakes`, `moods`, `menstrualprofiles`, `periodlogs`, `menstrualinsights`), mirrored read-only in `src/db/mongo/healthLog.mongo.ts` and `menstrual.mongo.ts`. Field names come from the `health-tracker` repo.
- Steps: the app keeps one record per day (overwritten), so a day's steps is the latest record of that day. Water: sum of the day's entries.
- Cycle maths (`menstrualCycle.service.ts`): start = latest logged period (else the profile); cycle length = mean of logged gaps of 15–60 days (else the profile); ovulation 14 days before the next period with a 3-day window; a period past its predicted date is `status:"late"` with `daysOverdue`.
- Admin Flutter client: `UsersRepository` (`lib/data/repositories/users.repository.dart`) → `UserDetailsViewModel` (`HealthKey` sections) → the `user_details_*` widgets.
