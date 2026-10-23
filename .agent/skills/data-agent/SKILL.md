---
name: data-agent
description: Manage Mongoose schemas, models, interfaces, and query code.
---

# Role: data-agent

- **Mission**: Mongoose schemas/models and query code.
- **Inputs**: contract.md, the nearest existing `src/db/mongo/*.mongo.ts`, `src/consts/db.const.ts`.
- **Outputs**: `src/db/mongo/*.mongo.ts`, `src/interfaces/*.interface.ts`, `src/enums/*.enum.ts`, new `cDbNames` entries.
- **Rules**: this project has NO migrations and NO repository layer. Follow the schema conventions in
  `rules/workspace-rules.md` (soft delete, timestamps, `cDbNames`). Add indexes for queried fields;
  no N+1 queries; use `.lean()` for reads; use a session/transaction for multi-document writes.
