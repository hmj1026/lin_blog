# ADR 0003: ESLint 強制架構規則

## 狀態

✅ 已採納

## 上下文

Clean Architecture 的分層規則需要被嚴格遵守，但僅靠 Code Review 難以保證：
- 開發者可能無意間違反分層規則
- 大型團隊難以統一架構理解
- 需要自動化的架構守護機制

## 決策

使用 **ESLint `no-restricted-imports`** 規則強制執行架構限制：

```json
{
  "overrides": [
    {
      "files": ["src/components/**/*.{ts,tsx}"],
      "rules": {
        "no-restricted-imports": ["error", {
          "paths": [
            { "name": "@/lib/db", "message": "UI 層不得存取 Prisma" }
          ]
        }]
      }
    },
    {
      "files": ["src/modules/**/domain/**/*.{ts,tsx}"],
      "rules": {
        "no-restricted-imports": ["error", {
          "patterns": [{ "group": ["next/*"], "message": "Domain 層不得依賴 Next.js" }]
        }]
      }
    }
  ]
}
```

## 限制規則

| 層級 | 禁止依賴 |
|-----|---------|
| UI (`components/`) | Prisma, `@/lib/db` |
| App Router (`app/`) | Prisma, `@/lib/db` |
| Domain (`modules/*/domain/`) | Next.js, Prisma |

## 後果

### 優點
- ✅ 架構規則自動檢查，CI 時阻擋違規
- ✅ 開發者即時收到違規警告
- ✅ 新成員自動學習架構限制

### 缺點
- ⚠️ 需要維護 ESLint 規則
- ⚠️ 規則過於嚴格可能影響開發速度
