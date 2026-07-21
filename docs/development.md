# 本地開發環境指南

本文件說明如何在本機建立開發環境。

---

## 系統需求

- **Node.js** 20+
- **PostgreSQL** 15+
- **Git**

---

## 快速開始

### 1. Clone 專案

```bash
git clone <repository-url>
cd lin_blog/web
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 環境設定

複製並編輯環境變數：

```bash
cd ..
cp .env.example .env
cd web && ln -sf ../.env .env
```

編輯 `.env` 填入以下必要設定：

```bash
# 資料庫連線（必填）
DATABASE_URL="postgresql://postgres:password@localhost:5432/lin_blog"

# NextAuth 設定（必填）
NEXTAUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. 建立資料庫

```bash
# 建立 PostgreSQL 資料庫
createdb lin_blog

# 同步 Schema
npm run db:push

# 建立初始資料
npm run db:seed
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000 即可看到前台。

---

## 預設帳號

| 角色 | Email | Password |
|-----|-------|----------|
| 管理員 | admin@example.com | admin123 |

---

## 常用指令

| 指令 | 說明 |
|-----|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 建置正式版本 |
| `npm run lint` | 執行 ESLint 檢查 |
| `npm run test` | 執行單元測試 |
| `npm run test:integration` | 執行整合測試（真實 PostgreSQL，需本機 docker postgres；自動建立 `lin_blog_test` 資料庫） |
| `npm run test:e2e` | 執行 E2E 測試 |
| `npm run db:push` | 同步 Schema 到資料庫 |
| `npm run db:migrate:dev` | 建立 Migration |
| `npm run db:seed` | 執行 Seed |
| `npm run key:generate` | 產生 NEXTAUTH_SECRET |

---

## PostgreSQL 安裝指南

### Windows

1. 下載 [PostgreSQL Installer](https://www.postgresql.org/download/windows/)
2. 執行安裝程式，記住設定的密碼
3. 將 `C:\Program Files\PostgreSQL\15\bin` 加入 PATH

### macOS

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Docker（推薦）

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lin_blog \
  -p 5432:5432 \
  postgres:15-alpine
```

---

## 常見問題

### Q: `prisma db push` 失敗

確認 PostgreSQL 服務已啟動：

```bash
# Windows
net start postgresql-x64-15

# macOS
brew services start postgresql@15

# Docker
docker start postgres
```

### Q: `NEXTAUTH_SECRET` 如何產生

使用內建指令（推薦）：

```bash
npm run key:generate
```

輸出範例：
```
✨ Generated Secret Key:
   N6sXo/IuGUgSy2MUmscb3z/iu2OmMbc0OlWDbpr03A0=

📋 Copy to .env file:
   NEXTAUTH_SECRET="N6sXo/IuGUgSy2MUmscb3z/iu2OmMbc0OlWDbpr03A0="
```

或使用 openssl：

```bash
openssl rand -base64 32
```

### Q: 如何重置資料庫

```bash
npm run db:push -- --force-reset
npm run db:seed
```

> ⚠️ 這會刪除所有資料

---

## 開發規範與共用元件

### 1. 後台資料表元件 (`AdminTable`)
後台所有呈現列表資料的表格，必須統一使用 `web/src/components/admin/table.tsx` 中的 `AdminTable` 元件（原 `AdminDataTable` 已棄用並移除）。
- **特點**：內建響應式包裝容器、無障礙屬性（`role="region"`、`aria-label`）以及窄螢幕下的鍵盤可捲動支援。
- **範例**：
  ```tsx
  import { AdminTable } from "@/components/admin/table";
  
  // 在頁面中使用：
  <AdminTable ariaLabel="使用者列表">
    <thead>
      <tr>
        <th>名稱</th>
        <th>動作</th>
      </tr>
    </thead>
    <tbody>
      {/* 資料列 */}
    </tbody>
  </AdminTable>
  ```

### 2. 分頁溢位處理 (`pagination-utils`)
在實作分頁列表查詢時，若因為刪除資料、搜尋條件改變或手動變更 URL 頁碼，導致請求頁碼大於實際最大頁數，應統一使用 `web/src/lib/server/pagination-utils.ts` 進行安全重查。
- **函數說明**：
  - `computeTotalPages(total: number, pageSize: number): number` — 計算總頁數（最少回傳 1 頁，適用於 Prisma 分頁計算）。
  - `resolveOverflowPage(params: { itemCount: number; total: number; page: number; totalPages: number }): number | null` — 判斷是否需要重導向至最後一頁。若需要重查，會回傳應重查的頁碼（如 `totalPages`），否則回傳 `null`。
- **後台 Use Case 範例**：
  ```ts
  import { computeTotalPages, resolveOverflowPage } from "@/lib/server/pagination-utils";
  
  // 取得初始查詢結果...
  const totalPages = computeTotalPages(total, pageSize);
  const overflowPage = resolveOverflowPage({
    itemCount: items.length,
    total,
    page,
    totalPages
  });
  
  if (overflowPage !== null) {
    // 使用 overflowPage 重新查詢資料庫或 API
    effectivePage = overflowPage;
  }
  ```

---

## IDE 設定

### VS Code 推薦擴充套件

- **Prisma** - Prisma Schema 語法高亮
- **ESLint** - 程式碼檢查
- **Tailwind CSS IntelliSense** - CSS 自動補全

