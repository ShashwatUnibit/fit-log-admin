# Workflow: /fix-bug

1. **orchestrator**: analyze bug report, write minimal spec and reproduction steps in `status.md`.
2. **test-agent**: reproduce with a failing test from the bug specification.
3. **Fix**: assigned role (`data-agent`, `service-agent`, or `api-agent`) implements targeted fix (prefer small diffs).
4. **Scoped verification**: run the failing test to verify fix passes (max 2 attempts per owner).
5. **reviewer**: full gates (lint, typecheck, tests, build). If FAIL, route back to owner.
6. **docs-agent**: update docs or changelog if bug affected external contracts or configs.
7. **Final report to me**: files changed, test results (counts), anything unverified. Max 15 lines.

## Rules
- Same rules apply; no new roles.
- Never fix without reproducing with a failing test first.
