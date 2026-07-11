# MODULES KNOWLEDGE BASE (Clean Architecture & DDD)

**Location**: `web/src/modules/`
**Standard**: Strict Clean Architecture + Domain-Driven Design (DDD)

## LAYER STRUCTURE
Each module must follow this internal structure:
- `domain/`: Pure business logic. Entities, Value Objects, Repository Interfaces.
- `application/`: Use Cases (Services). Entry points for UI. Orchestration.
- `infrastructure/`: Prisma implementations, External Adapters, Persistence logic.

## DEPENDENCY RULE
**Flow**: `UI (App Router) -> Application -> Domain <- Infrastructure`
- **Inner Circle**: Domain must have ZERO external dependencies (No Prisma, No Next.js).
- **Inversion**: Infrastructure depends on Domain by implementing its interfaces.
- **Entry Point**: UI must ONLY call Application Use Cases (sole exception: pure domain re-exports via a module's `client.ts` — see next bullet).
- **Client-safe barrel (`client.ts`)**: When a `"use client"` component needs a module's *pure* domain logic (e.g. SSOT pre-submit validation), the module MAY expose `client.ts` re-exporting only framework-free domain functions/types. Components import `@/modules/<mod>/client`. It MUST NOT import `server-only`, Prisma, or `index.ts`. The server barrel `index.ts` stays `server-only`; `domain/**` stays off-limits to components.

## CORE COMPONENTS
- **Use Cases**: Encapsulate one specific business action (e.g., `CreatePost`).
- **Repositories**: Injected via interfaces defined in Domain.
- **DTA/DTO**: Application layer handles conversion between UI and Domain models.

## ANTI-PATTERNS (BAN LIST)
- ❌ **Direct DB access**: UI/App importing `prisma` or `@prisma/client` directly.
- ❌ **Leaky Domain**: Domain importing `next/*`, `react`, or server-only libs.
- ❌ **Cross-Module Logic**: Accessing another module's `infrastructure` or `domain` directly. Use `application` services.
- ❌ **God Services**: Putting logic in UI components instead of Use Cases.

## MODULE REGISTRY
| Module | Responsibility |
| :--- | :--- |
| `posts` | Blog content, taxonomy, publishing workflow |
| `media` | File uploads, storage provider abstraction |
| `analytics` | Event tracking, stats aggregation |
| `security-admin` | RBAC, audit logs, session management |
| `site-settings` | Site-wide configuration bounded context |
| `newsletter` | 訂閱資料/reCAPTCHA/限流 bounded context |
| `discovery` | 公開文章探索唯讀 facade |
