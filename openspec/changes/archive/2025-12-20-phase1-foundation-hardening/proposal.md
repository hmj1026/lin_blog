# Phase 1: Foundation Hardening

## Why
Strengthen the application foundation by improving environment configuration, adding development tools, establishing comprehensive testing for core security features (RBAC, Rate Limiting), and refactoring legacy service layers to Clean Architecture/Use Cases.

## What Changes

### 1. Environment & Config
- Add `APP_ENV` to `env.ts`.
- Update `.env.example`.

### 2. Testing & Security
- Implement RBAC unit tests.
- Implement Middleware Rate Limit tests.

### 3. Refactoring
- Replace `lib/services/` with Use Cases.
- Remove obsolete service tests.
- Migrate `siteSettingService` to `siteSettingsUseCases`.

### 4. Dev Tools
- Add `DevToolbar` component.

## Impact
- **Reliability:** Higher test coverage for security-critical paths.
- **Maintainability:** Standardized Use Case architecture.
- **DX:** Better environment control and dev tools.
