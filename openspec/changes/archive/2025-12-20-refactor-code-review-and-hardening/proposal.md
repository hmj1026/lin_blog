# Refactor: Code Review & Hardening

## Why
Address technical debt and security concerns identified during code review. Key focus areas include decoupling UI from infrastructure (Prisma), improving component modularity, and hardening authentication flow.

## What Changes

### 1. Component Refactoring
- Refactor `PostForm` from monolithic file to modular components (`web/src/components/admin/post-form/`).
- Decouple `Navbar` and `Footer` from direct Prisma dependency.

### 2. Authentication Hardening
- Implement real-time permission check in Session Callback (fetching role on every session refresh).

### 3. API Hardening
- Implement consistent API error handling and input validation globally.

## Impact
- **Maintainability**: Smaller, focused components are easier to test and maintain.
- **Security**: Reduced risk of privilege escalation (stale session content) and unhandled API errors.
