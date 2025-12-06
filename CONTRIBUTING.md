# 貢獻指南

感謝您有興趣為 Lin Blog 專案做出貢獻！

## 開發流程

### 1. 環境設定

```bash
# 複製專案
git clone <repository-url>
cd lin_blog/web

# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入實際值

# 初始化資料庫
npm run db:push
npm run db:seed

# 啟動開發伺服器
npm run dev
```

### 2. 開發規範

#### Git 分支
- `main`：穩定版本
- `develop`：開發中版本
- `feature/<name>`：新功能
- `fix/<name>`：修復

#### Commit 訊息

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新增留言系統
fix: 修復深色模式對比度
docs: 更新 README
refactor: 重構 posts use-cases
test: 添加 site-settings 單元測試
chore: 更新依賴
```

### 3. 測試

```bash
# 單元測試
npm run test

# 帶覆蓋率報告
npm run test -- --coverage

# E2E 測試（需先啟動開發伺服器）
npm run test:e2e
```

### 4. 程式碼風格

- 遵循 ESLint 規則：`npm run lint`
- 使用 TypeScript Strict Mode
- 元件使用 PascalCase
- 函數使用 camelCase

### 5. Pull Request

1. Fork 專案並創建分支
2. 確保所有測試通過
3. 確保 ESLint 無錯誤
4. 提交 PR 並描述變更內容

## OpenSpec 規格驅動開發

本專案使用 OpenSpec 進行規格驅動開發，新功能需先建立 proposal：

```bash
# 查看現有規格
openspec list --specs

# 查看進行中的變更
openspec list

# 驗證變更
openspec validate <change-id> --strict
```

詳見 `openspec/AGENTS.md`。

## 問題回報

請使用 GitHub Issues 回報問題，包含：
- 問題描述
- 重現步驟
- 預期行為
- 實際行為
- 環境資訊（OS、Node 版本等）

## 授權

MIT License
