# 資料庫管理指南

## 技術棧

- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Schema**: `prisma/schema.prisma`

---

## 常用指令

### 開發環境

```bash
# 同步 Schema 到資料庫（開發用，不會建立 migration）
npm run db:push

# 建立新的 migration
npm run db:migrate:dev

# 執行 seed（初始資料）
npm run db:seed

# 開啟 Prisma Studio（GUI 管理資料）
npx prisma studio
```

### 正式環境

```bash
# 部署所有未執行的 migrations
npm run db:migrate:deploy

# 檢查 migration 狀態
npm run db:migrate:status

# 重置資料庫（危險！會刪除所有資料）
npx prisma migrate reset
```

---

## Migration 流程

### 1. 修改 Schema

編輯 `prisma/schema.prisma`：

```prisma
model Post {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  content   String
  // 新增欄位
  viewCount Int      @default(0)
}
```

### 2. 建立 Migration

```bash
npm run db:migrate:dev -- --name add_view_count
```

這會：
1. 產生 `prisma/migrations/YYYYMMDDHHMMSS_add_view_count/migration.sql`
2. 自動執行 migration
3. 重新生成 Prisma Client

### 3. 部署到正式環境

```bash
npm run db:migrate:deploy
```

---

## 注意事項

> ⚠️ `db:push` 不會建立 migration 歷史，只適合開發階段快速測試

> ⚠️ 正式環境**務必**使用 `db:migrate:deploy`

> ⚠️ 避免直接修改 `migrations/` 目錄下的檔案

---

## Schema 設計原則

1. **Soft Delete**: 使用 `deletedAt` 欄位而非實際刪除
2. **時間戳記**: 所有 model 應有 `createdAt` 和 `updatedAt`
3. **索引**: 為常用查詢欄位建立索引
