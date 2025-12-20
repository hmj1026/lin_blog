# Task Checklist

## 1. Pillars
- [x] Create `web/src/modules/posts` structure
- [x] Create `web/src/modules/analytics` structure
- [x] Create `web/src/modules/site-settings` structure

## 2. Domain Layer
- [x] Define Post entity and rules (slug, status)
- [x] Define Analytics Events and rules
- [x] Define Site Setting constants and defaults

## 3. Application Layer
- [x] Implement Posts Use Cases (CRUD, Publish, Search)
- [x] Implement Analytics Use Cases (Track, Stats)
- [x] Implement Site Settings Use Cases

## 4. Verification
- [x] Verify no infrastructure imports in domain layer
- [x] Verify use cases depend only on Repository Interfaces (Ports)
