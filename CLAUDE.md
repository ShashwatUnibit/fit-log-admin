# FitLog Admin backend

Shared rules, facts and conventions live in `.agents/` so Claude Code and Antigravity read the same files.
Update those files (not this one) when the project changes.

@AGENTS.md
@.agents/project-facts.md
@.agents/rules/workspace-rules.md

## Read on demand (do not preload)
- Controller index: `.agents/skills/controllers-guide/SKILL.md`; per-controller detail: `.agents/docs/controllers/<name>.controller.md`.
- Multi-agent flow (only when the user asks for it): `.agents/workflows/*.md`, roles in `.agents/skills/*/SKILL.md`,
  handoff template `.agents/handoff/TEMPLATE.md`. For normal tasks, work directly; do not spawn role agents.
- If code and these docs disagree, trust the code and fix the doc in the same change.
