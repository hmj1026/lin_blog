# architecture Specification (Delta)

## MODIFIED Requirements
### Requirement: Layered Architecture
The system SHALL adhere to a layered architecture for all core modules.

#### Scenario: Presentation Layer Isolation (App Router)
- **GIVEN** code under `web/src/app/**` (server components, route handlers) or `web/src/components/**`
- **WHEN** implementing business operations or data access
- **THEN** it SHALL call module use cases (`web/src/modules/**`) and SHALL NOT import `@/lib/db`, `@prisma/client`, or `web/prisma` directly

## ADDED Requirements
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

