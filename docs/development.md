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
cp .env.example .env
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

## IDE 設定

### VS Code 推薦擴充套件

- **Prisma** - Prisma Schema 語法高亮
- **ESLint** - 程式碼檢查
- **Tailwind CSS IntelliSense** - CSS 自動補全
