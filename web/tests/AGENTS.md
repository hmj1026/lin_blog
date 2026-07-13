# TESTS KNOWLEDGE BASE

**Generated:** 2026-01-07
**Context**: Dual-runner suite (Vitest + Playwright) for Next.js 15.

## WHERE TO LOOK
| Type | Location | Notes |
|------|----------|-------|
| **Unit** | `web/tests/unit/` | Logic, Domain, Components |
| **E2E** | `web/tests/e2e/` | Critical User Flows |
| **Visual** | `web/tests/visual/` | UI/CSS Regression |

## CONVENTIONS
- **Unit**:
  - File: `*.test.ts` or `*.test.tsx`.
  - DB: Mocked (Prisma Client).
  - Mocking: `server-only` is aliased to `src/test/mocks/server-only.ts`. Setup at `src/test/setup.ts`.
- **E2E**:
  - File: `*.spec.ts`.
  - DB: Real PostgreSQL (Docker service).
  - Auth: `global-setup.ts` logs in once per run and writes storageState to
    `e2e/.auth/user.json` (`AUTH_FILE` in `helpers/auth.ts`); the
    `chromium-authed` project reuses it, so pure-admin specs don't call
    `loginAsAdmin()` themselves.

## COMMANDS
```bash
# Inside web/ directory
npm run test         # Run Unit tests (Vitest)
npm run test:ui      # Vitest UI / Watch mode
npm run test:e2e     # Run E2E tests (Playwright)
npx playwright show-report # View E2E report
```

## E2E AUTH FLOW
- Two mutually exclusive projects cover `tests/e2e/**/*.spec.ts`:
  - `chromium-authed` — admin-only specs listed in `AUTHED_SPECS`
    (`playwright.config.ts`); `use.storageState` is `AUTH_FILE`, produced by
    `global-setup.ts` after its admin warmup login. Test bodies do not call
    `loginAsAdmin()` again.
  - `chromium-anon` — everything else (`testIgnore: AUTHED_SPECS`); no
    storageState. Specs that need an admin session (e.g. editor preview in
    `isr-draft-preview.spec.ts`) call `loginAsAdmin()`/`login()` explicitly.
- Mixed-role specs inside `chromium-authed` (e.g. `admin-subscribers.spec.ts`)
  clear the inherited admin state per-`describe` with
  `test.use({ storageState: { cookies: [], origins: [] } })`, then log in
  explicitly with the role under test (or stay anonymous).
- Manual `browser.newContext()` (in `beforeAll`/`afterAll`, or
  `admin-management.spec.ts`) does **not** inherit project `use.storageState`.
  Pass `{ storageState: AUTH_FILE }` explicitly for admin access, or call
  `loginAsAdmin()` if the context needs its own real login (e.g. to seed data
  as a distinct user).
- `helpers/auth.ts` still owns `login()`/`loginAsAdmin()` for the auth
  exceptions above (login-flow tests, editor preview, mixed-role subgroups).
