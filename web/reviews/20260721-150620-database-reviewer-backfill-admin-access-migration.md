---
verdict: FAIL
scope: web/prisma/migrations/20260721000000_backfill_admin_access_permission/migration.sql (commit d0a1c30, backlog item, unrelated to current session's pagination/dead-code work)
---

Verdict: FAIL

## DB Review
✅ Pass:
- Backfill INSERT uses NOT EXISTS guard on (roleId, permissionKey) → safe to re-run manually.
- Literal 'admin:access' matches ADMIN_ACCESS_PERMISSION SSOT in web/src/modules/security-admin/domain/permissions.ts (no drift).
- PermissionVersion 'global' row is guaranteed to exist (seeded by 20260704105212_add_permission_version), so the UPDATE at the end always finds a row — no silent no-op.
- Table scope is tiny (Role/RolePermission), no large-table lock concern; no explicit locking used beyond standard row inserts.
- Only backfills roles that already have ≥1 permission (matches stated intent: don't grant admin:access to intentionally-empty roles).
- gen_random_uuid()::text pattern is already used by two prior migrations (20260712050000, 20260719013000) against postgres:16-alpine, which has gen_random_uuid() built-in — no missing extension risk.
- No down/rollback script — consistent with every other migration in this repo (Prisma forward-only convention here), not a regression specific to this file.

❌ Fix:
- migration.sql lines 6-15: the RolePermission insert references permissionKey = 'admin:access' via FK to Permission.key, but this migration never inserts/upserts that row into "Permission" first. Both sibling data-backfill migrations that this one otherwise copies (20260712050000_provision_subscribers_view_permission and 20260719013000_add_audit_events) explicitly do `INSERT INTO "Permission" (...) ON CONFLICT ... DO NOTHING/UPDATE` before touching RolePermission — this one omits that step. In every environment where 'admin:access' is not already present in the Permission catalog table but Roles already have other RolePermission rows (e.g., a DB restored from a pre-2025-12-25 backup — that's when 'admin:access' was first added to seed.ts/init-admin.js per `git log -S"admin:access"` — then brought forward via `prisma migrate deploy` for disaster recovery, or any environment whose Permission catalog was provisioned by a partial/custom script instead of seed.ts/init-admin.js), this INSERT will throw a foreign-key violation and abort the migration transaction, blocking `migrate deploy` entirely. Confirmed this migration is a no-op (and thus currently masks the gap) on today's only two automated fresh-DB paths (docker-build.yml pr-docker-verify and the e2e workflow), because those run `migrate deploy` before any Role rows exist — but that's incidental, not a guarantee, and does not protect a restore-then-migrate production DR scenario.
  - Fix: add `INSERT INTO "Permission" ("key", "name") VALUES ('admin:access', '後台存取') ON CONFLICT ("key") DO NOTHING;` before the RolePermission insert, matching the established pattern.

⚠️ Warn:
- Manually re-running this migration.sql outside of Prisma's migration tracking (e.g. via psql) will still increment PermissionVersion.value even when the NOT EXISTS guard causes 0 RolePermission rows to be inserted — harmless (extra JWT-cache invalidation) but slightly wasteful; same behavior exists in the two prior sibling migrations, so not new.
- No down-migration exists for any migration in this repo; if this specific backfill needs to be reverted, there's no scripted way to distinguish rows this migration inserted from rows added by normal app usage afterward (same gap as the subscribers:view and audit:view migrations — a pre-existing pattern, not unique to this file).

Suggestions:
- Add the missing `INSERT INTO "Permission" ... ON CONFLICT DO NOTHING` guard for 'admin:access' before the RolePermission backfill, mirroring 20260712050000 and 20260719013000, so `migrate deploy` cannot FK-fail on any environment where the Permission catalog row hasn't been seeded yet.
