# architecture Specification

## Purpose
TBD - created by archiving change add-domain-layers. Update Purpose after archive.
## Requirements
### Requirement: Layered Architecture
The system SHALL adhere to a layered architecture for all core modules.

#### Scenario: Presentation Layer Isolation (App Router)
- **GIVEN** code under `web/src/app/**` (server components, route handlers) or `web/src/components/**`
- **WHEN** implementing business operations or data access
- **THEN** it SHALL call module use cases (`web/src/modules/**`) and SHALL NOT import `@/lib/db`, `@prisma/client`, or `web/prisma` directly

### Requirement: Use Case Standardization
All business operations SHALL be encapsulated in Use Cases.

#### Scenario: UI Components
- **GIVEN** a UI component (page or client component)
- **WHEN** it performs a business action
- **THEN** it SHALL invoke a Use Case functions, NOT call Prisma directly

### Requirement: Thin Next.js Adapters
Next.js App Router entrypoints (route handlers and server components) SHALL act as thin adapters.

#### Scenario: Route handler stays thin
- **GIVEN** an API route under `web/src/app/api/**`
- **WHEN** it needs to apply business rules (RBAC, status transitions, versioning, analytics aggregation)
- **THEN** it SHALL delegate to a Use Case in `web/src/modules/**` and only perform parsing/auth/serialization at the boundary

### Requirement: Boundary Enforcement
The system SHALL enforce architecture boundaries via static checks.

#### Scenario: Lint prevents direct Prisma imports
- **GIVEN** a change introduces `import { prisma } from "@/lib/db"` inside `web/src/app/**`
- **WHEN** running lint
- **THEN** it SHALL fail with a clear message pointing to the required module use case path

#### Scenario: Lint prevents cross-layer infrastructure/domain imports from Presentation
- **GIVEN** code under `web/src/app/**` or `web/src/components/**` imports a path matching `@/modules/*/infrastructure/*` or `@/modules/*/domain/*`
- **WHEN** running lint
- **THEN** it SHALL fail, directing the caller to use the module's read query facade (`server-queries.ts`) or `*UseCases` singleton instead

#### Scenario: Lint prevents domain layer from importing React/Next runtime
- **GIVEN** code under `web/src/modules/*/domain/**` imports `react`, `server-only`, or any `next/*` module
- **WHEN** running lint
- **THEN** it SHALL fail, since the domain layer SHALL remain framework-free

### Requirement: Authorization Query Consolidation

The system SHALL minimize database round-trips for role and permission
resolution within a single request, and SHALL provide a defined
invalidation mechanism so permission changes take effect within a bounded
time window.

#### Scenario: Single role/permission load per authenticated request
- **GIVEN** an authenticated request that both establishes a session and
  checks a permission (e.g. via `requirePermission`)
- **WHEN** the request is processed
- **THEN** the system SHALL resolve the user's role and permissions from a
  single cached source (e.g. JWT token content) instead of issuing
  independent database queries for the session callback and for
  `roleHasPermission`

#### Scenario: Permission change becomes effective within a bounded window
- **GIVEN** an administrator changes a role's permissions or a user's role
- **WHEN** the affected user makes a subsequent request
- **THEN** the system SHALL detect the change (e.g. via a permissions
  version marker) within a bounded, documented time window and refresh the
  cached role/permission data accordingly
- **AND** the system SHALL NOT rely on an unbounded or indefinite cache
  that could allow a revoked permission to remain effective indefinitely

### Requirement: Rate Limit Key Normalization

The API rate limiter SHALL key its buckets on a normalized route pattern
rather than the raw request path, so that requests to the same logical
endpoint with different dynamic path segments share the same limit.

#### Scenario: Dynamic route segments share one bucket
- **GIVEN** an API route with a dynamic segment (e.g. `/api/posts/[id]`)
- **WHEN** a client issues repeated requests to the same route with
  different id values
- **THEN** all such requests SHALL count against the same rate-limit
  bucket for that client (keyed by client identifier + normalized route
  pattern, not the raw pathname)

#### Scenario: Distinct routes remain independently limited
- **GIVEN** two distinct API routes (e.g. `/api/posts/:id` and
  `/api/comments/:id`)
- **WHEN** a client makes requests to both
- **THEN** each route SHALL be tracked in its own bucket, independent of
  the other

### Requirement: Read Query Facade Coverage
Every module whose reads are consumed by React Server Components or GET route handlers SHALL expose a corresponding query facade in `web/src/lib/server-queries.ts`, wrapped in React `cache()` for per-request deduplication.

#### Scenario: Analytics reads use a query facade
- **GIVEN** a Server Component or GET route handler needs analytics dashboard stats or per-post analytics data
- **WHEN** it fetches that data
- **THEN** it SHALL call `analyticsQueries` from `server-queries.ts` and SHALL NOT call `analyticsUseCases` read methods directly

#### Scenario: Media reads use a query facade
- **GIVEN** a Server Component or GET route handler needs uploaded file metadata or listings
- **WHEN** it fetches that data
- **THEN** it SHALL call `mediaQueries` from `server-queries.ts` and SHALL NOT call `mediaUseCases` read methods directly

#### Scenario: Security-admin reads use a query facade
- **GIVEN** a Server Component or GET route handler needs role, permission, or user listings
- **WHEN** it fetches that data
- **THEN** it SHALL call `securityAdminQueries` from `server-queries.ts` and SHALL NOT call `securityAdminUseCases` read methods directly

#### Scenario: Write operations remain unaffected
- **GIVEN** an API route handler performs a create/update/delete operation
- **WHEN** it executes the mutation
- **THEN** it SHALL continue to call the module's `*UseCases` singleton directly, since query facades only cover reads

