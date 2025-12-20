## ADDED Requirements

### Requirement: Layered Architecture
The system SHALL adhere to a layered architecture for all core modules.

#### Scenario: Domain Layer Isolation
- **GIVEN** a module in `src/modules`
- **WHEN** inspecting the `domain/` directory
- **THEN** it SHALL NOT import from `infrastructure/` or `prisma`

#### Scenario: Application Layer Dependency
- **GIVEN** a Use Case in `application/`
- **WHEN** it needs to access data
- **THEN** it SHALL use a Port (Interface) defined in `application/ports.ts`

### Requirement: Use Case Standardization
All business operations SHALL be encapsulated in Use Cases.

#### Scenario: UI Components
- **GIVEN** a UI component (page or client component)
- **WHEN** it performs a business action
- **THEN** it SHALL invoke a Use Case functions, NOT call Prisma directly
