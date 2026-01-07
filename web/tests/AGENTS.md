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
  - Auth: Uses `e2e/auth.setup.ts` to share session (skips login).

## COMMANDS
```bash
# Inside web/ directory
npm run test         # Run Unit tests (Vitest)
npm run test:ui      # Vitest UI / Watch mode
npm run test:e2e     # Run E2E tests (Playwright)
npx playwright show-report # View E2E report
```

## E2E AUTH FLOW
- `auth.setup.ts` performs login once and saves state to `.auth/user.json`.
- Most specs use `test.use({ storageState: '.auth/user.json' })`.
- To test login specifically, use `test.use({ storageState: { cookies: [], origins: [] } })`.
