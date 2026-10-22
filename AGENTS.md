# Shared Rules

## Quality bar (applies to every agent)
- Code must pass the project's lint, typecheck and tests before an agent reports "done".
- Never claim something works unless you ran it. If you could not verify, say "unverified" and why.
- Never invent API fields, endpoints, env vars or library functions. Check real responses, docs or the installed package source. Unknown field = mark optional and flag it.
- No dead code, no TODO placeholders, no console.log (use the project logger), no secrets in code or logs.
- Validate all external input at the boundary. Handle errors explicitly; never swallow them. Use consistent error format and HTTP status codes.
- Async code: always await or return promises, handle rejections, set timeouts on outbound calls.
- Prefer small diffs: edit the necessary lines, do not rewrite whole files.

## Token and time discipline
- Read only the files listed in your role's Inputs plus the handoff folder for the current feature. Use search/grep to locate code; do not open whole directories or large files.
- Do not paste large file contents, logs or stack traces into messages. Quote the relevant 5-10 lines.
- Run scoped checks (single test file, changed files only) while working; run the full suite only at the Reviewer stage.
- Each agent reports in 10 lines or fewer using the handoff template.
- If a fix fails twice, stop, write what you tried and what you suspect, and hand back to the Orchestrator. Do not loop.
- Plan briefly first, then implement. No long explanations after the work is done.

## Boundaries
- Each agent writes only to the paths in its Outputs. If another agent's file needs a change, request it in the handoff; do not edit it yourself.
- Agents communicate only through .agents/handoff/<feature>/ (spec.md, contract.md, status.md). Do not rely on chat memory.
- Never run destructive commands (drop DB, force push, delete migrations, rm -rf) without my explicit approval.
