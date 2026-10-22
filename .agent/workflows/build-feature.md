# Workflow: /build-feature

1. **orchestrator**: read request, write `spec.md`, `contract.md`, `status.md`.
2. **Approval Gate**: Show me the contract and task list in under 20 lines and wait for my "go" (this is the one approval gate; it prevents expensive rework).
3. **test-agent**: write failing tests from the contract.
4. **Parallel batch A** (independent files): `integration-agent` (if needed) and `data-agent`.
5. **service-agent**, then **api-agent**. Run **security-agent** in parallel with `api-agent` once routes exist.
6. **Scoped verification**: Run the scoped tests; owners fix their own failures (max 2 attempts each).
7. **reviewer**: full gates. If FAIL, route each item back to its owner, then re-run only the failed checks.
8. **docs-agent**: sync documentation, API specs, and changelog.
9. **Final report to me**: files changed, test results (counts), anything unverified, anything needing my decision. Max 15 lines.

## Parallel Rule
Only run roles in parallel when their Outputs do not overlap and neither needs the other's output.
