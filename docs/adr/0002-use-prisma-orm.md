# ADR 0002: 使用 Prisma ORM

## 狀態

✅ 已採納

## 上下文

專案使用 PostgreSQL 作為資料庫，需要選擇一個 ORM 來：
- 提供型別安全的資料庫存取
- 支援資料庫 Migration
- 與 TypeScript 良好整合

## 決策

選擇 **Prisma ORM** 作為資料存取層：

```prisma
model Post {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  content   String
  status    PostStatus
  createdAt DateTime @default(now())
}
```

## 後果

### 優點
- ✅ 自動生成 TypeScript 型別
- ✅ 直觀的 Schema 定義語法
- ✅ 內建 Migration 工具
- ✅ 活躍的社群支援

### 缺點
- ⚠️ 複雜查詢需使用 Raw SQL
- ⚠️ 部分進階功能需學習曲線
- ⚠️ Schema 變更需重新生成 Client

## 替代方案

| ORM | 考量 |
|-----|------|
| TypeORM | 較成熟但 TypeScript 支援較弱 |
| Drizzle | 更輕量但社群較小 |
| Knex.js | 只是 Query Builder |
