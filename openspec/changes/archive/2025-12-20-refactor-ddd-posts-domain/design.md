# DDD Design (Phase 1: Posts)

## Goals
- 將資料存取（Prisma/SQL）與商業規則分離，提高可測性與可維護性。
- 建立可逐步遷移的結構：先落地一個領域，再擴展至其他領域。

## Layering

### Domain
- 負責：Entity/Value Object、領域規則、領域事件（如需要）。
- 不允許：依賴 Prisma、Next.js、HTTP、環境變數（可透過 port 介面取得）。

### Application
- 負責：Use Case / Service，協調 repository、RBAC、sanitize、交易等跨實作細節。
- 允許：依賴 domain、repository interface（port）、共用 util（例如 sanitize helper 透過 interface/fn 注入）。
- 不允許：直接 import Prisma client。

### Infrastructure
- 負責：Prisma repository 實作、外部系統（storage、email、queue）實作。
- 允許：依賴 Prisma client、Node APIs、env。

### Presentation
- 負責：Next.js route handlers / server components / actions；做 request parsing、response formatting。
- 允許：依賴 application use cases。
- 不允許：直接寫 Prisma query。

## Module Layout (proposed)
```
web/src/modules/posts/
  domain/
    post.ts
    category.ts
    tag.ts
    errors.ts
  application/
    ports.ts
    use-cases/
      create-post.ts
      update-post.ts
      delete-post.ts
      list-posts.ts
      get-post-by-slug.ts
  infrastructure/
    prisma/
      post.repository.prisma.ts
      category.repository.prisma.ts
      tag.repository.prisma.ts
  presentation/
    mappers.ts
```

## Dependency Rules (non-enforced initial)
- `domain` MUST NOT import from `application|infrastructure|presentation|next|prisma`.
- `application` MUST NOT import from `infrastructure|prisma`.
- `presentation` MUST NOT import Prisma client.

初期以 code review + 測試守門；若需要可後續再導入 boundaries lint 工具。
