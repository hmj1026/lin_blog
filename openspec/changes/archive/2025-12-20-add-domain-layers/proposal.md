# Add Domain Layers Architecture

## Why
Enforce a clean separation of concerns by introducing a formal Domain Layer within the application architecture. This ensures business logic is decoupled from infrastructure (Prisma) and presentation layers (Next.js components), improving testability and maintainability.

## What Changes

### 1. Module Structure
- Adopt a uniform structure for all modules (`web/src/modules/*`):
    - `domain/`: Pure business logic, types, errors, rules. No external dependencies.
    - `application/`: Use cases and ports (interfaces). Orchestrates domain logic.
    - `infrastructure/`: Implementations (Prisma repos, 3rd party adapters).
    - `presentation/` (Optional): UI components or API handlers specific to the module.

### 2. Implementation
- Refactor `posts` module to follow this structure.
- Implement `analytics` module using this structure.
- Implement `site-settings` module using this structure.

## Impact
- **Testability**: Domain logic can be unit tested without DB mocks.
- **Consistency**: All developers follow the same folder pattern.
