# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Development philosophy, TDD, and commit rules live in AGENTS.md — read it too:
@AGENTS.md

## Repository layout

All application code lives under `web/` (a standalone Next.js 15 app — no npm workspaces). The
repo root holds only infra/docs (`docker-compose.yml`, `nginx/`, `docs/`, `openspec/`,
`.github/`). **Run every `npm` / `npx` / `prisma` command from `web/`.** Ignore `.worktrees/`
(git worktree copies of the tree).

## Commands (run from `web/`)

    npm run dev                     # dev server → http://localhost:3000
    npm run build                   # production build
    npm run lint                    # ESLint (next lint)
    npm run typecheck               # tsc --noEmit
    npm run check                   # lint + typecheck (the pre-commit gate)

    npm run test                    # unit tests (Vitest, run once)
    npm run test:ui                 # Vitest watch mode
    npx vitest run tests/x.test.ts  # single unit file
    npx vitest run -t "name"        # single unit test by name

    npm run test:e2e                # Playwright e2e (auto-starts dev server)
    npx playwright test -g "name"   # single e2e test by name

    npx prisma generate             # REQUIRED before typecheck/test/build (CI runs it every job)
    npm run db:migrate:dev          # Prisma migrations (dev)
    npm run db:push                 # sync schema without a migration
    npm run db:seed                 # seed data

From the repo root: `docker compose up -d` starts the prod stack (`blog` + `postgres`).

## Architecture

Next.js 15 App Router · TypeScript · React 18 · Prisma 5 / PostgreSQL · NextAuth v4 · Tailwind ·
Vitest + Playwright. Strict **Clean Architecture / DDD** (see `docs/adr/`, `web/src/modules/AGENTS.md`).

**Modules** (`web/src/modules/<name>/` — posts, media, analytics, security-admin, site-settings):
- `domain/` — pure business logic, entities, repository interfaces. No Prisma, Next, or React.
- `application/` — use-cases + ports (repository interfaces).
- `infrastructure/prisma/` — concrete repositories + Prisma↔domain mappers.
- `index.ts` — DI composition root; wires repos into the use-case factory and exports a singleton
  (`postsUseCases`, `siteSettingsUseCases`, `securityAdminUseCases`, ...).

**Reads vs writes (most important convention — the recent `useCases → queries` refactor):**
- **Reads** go through `web/src/lib/server-queries.ts` (`postsQueries` / `siteSettingsQueries`),
  which wrap use-case reads in React `cache()` for per-request dedupe. RSCs and GET handlers use these.
- **Writes/mutations** call the `*UseCases` singletons directly (e.g. `postsUseCases.createPost`).
- Reading via a raw use case in an RSC breaks per-request caching — don't.

**The dependency rule is ESLint-enforced** (`web/.eslintrc.json`, ADR-0003): `@/lib/db` and
`@prisma/client` are banned in `app/`, `components/`, and `domain/`; `next/*` is banned in `domain/`.
A violation fails the build, not just lint.

**Other boundaries:**
- `toFrontendPost` (`web/src/lib/frontend/post.ts`) is the mandatory domain→view mapper; UI consumes
  `FrontendPost`, never raw Prisma/domain shapes. Soft-delete filtering of categories/tags happens here.
- DB-backed pages set `export const dynamic = "force-dynamic"` so the build never connects to Postgres;
  metadata/settings reads are wrapped in try/catch for the same reason.
- Env is Zod-validated and split: `env.ts` (server, `server-only`), `env.public.ts` (`NEXT_PUBLIC_*`),
  `env.auth.ts` (auth secret). Server env is not importable from client code.
- Auth: NextAuth v4 credentials + JWT (`lib/auth.ts`); DB-backed RBAC via `lib/rbac.ts` /
  `lib/api-utils.ts` (`requirePermission("posts:write")`). `middleware.ts` does in-memory API rate
  limiting + `/admin/*` auth guard.
- API route handlers return a uniform `ApiResponse<T>` envelope via `jsonOk` / `jsonError` /
  `handleApiError`.

## Gotchas

- Run `npx prisma generate` before `typecheck` / `test` / `build`, or they fail on missing client types.
- `web/src/data/posts.ts` is dead sample data (zero importers) — real content is in Postgres via the posts module.
- Soft deletes (`deletedAt`) everywhere; respect `isReadablePost` and category/tag filters in read paths.
