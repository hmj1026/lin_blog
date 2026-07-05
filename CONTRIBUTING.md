# 貢獻指南（CONTRIBUTING）

感謝你考慮為 Lin Blog 貢獻程式碼！本文件說明本地開發環境設定、開發流程、分支與 PR 規範，以及 commit 訊息慣例，協助你順利提交第一個變更。

專案背景與功能總覽請見 [README.md](README.md)；開發哲學（SSOT、TDD、Anti-Loop Protocol 等）與詳細的程式碼規範請見 [AGENTS.md](AGENTS.md)；架構邊界、模組職責與常用指令請見 [CLAUDE.md](CLAUDE.md)。

---

## 1. 開發環境設定

專案採單一 Next.js 15 應用，所有程式碼位於 `web/`（不使用 npm workspaces）。**所有 `npm`／`npx`／`prisma` 指令都必須在 `web/` 目錄下執行。**

```bash
# 1. clone 專案
git clone <repo-url>
cd lin_blog

# 2. 安裝依賴（在 web/ 目錄）
cd web
npm install

# 3. 設定環境變數（統一管理於根目錄）
cd ..
cp .env.example .env
cd web && ln -sf ../.env .env     # 建立 symlink，讓 web/ 讀到同一份設定
$EDITOR ../.env                   # 以編輯器開啟，依需求編輯 DB 帳密、NEXTAUTH_SECRET 等

# 4. 產生 Prisma Client（typecheck / test / build 前皆須執行）
npx prisma generate

# 5. 同步資料庫 schema 並建立初始資料
npm run db:push
npm run db:seed

# 6. 啟動開發伺服器
npm run dev   # http://localhost:3000
```

更完整的本地開發設定（含資料庫、初始管理員帳號建立）請參考 [本地開發指南](docs/development.md)。

---

## 2. 開發流程

本專案遵循 TDD 的 Red-Green-Refactor 循環與小步提交，完整開發哲學請見 [AGENTS.md](AGENTS.md)：

1. **Study**：先閱讀相似的既有程式（模組結構、命名慣例），避免重造輪子。
2. **Red**：先寫一個會失敗的測試。
3. **Green**：寫出讓測試通過的**最小**實作。
4. **Refactor**：在測試維持綠燈的前提下優化程式碼。
5. **Commit**：小步提交，訊息需說明「為什麼」（見第 4 節）。

在提交前，於 `web/` 目錄下執行以下指令（等同 CI 的 pre-commit gate）：

```bash
cd web
npx prisma generate    # 確保 Prisma Client 型別為最新
npm run check           # lint（ESLint）+ typecheck（tsc --noEmit）
npm run test            # Vitest 單元測試
npm run test:e2e        # Playwright 端對端測試（會自動啟動 dev server）
```

單一檔案／單一測試可分別使用：

```bash
npx vitest run tests/x.test.ts
npx vitest run -t "測試名稱"
npx playwright test -g "測試名稱"
```

任何 commit 都必須符合 [AGENTS.md](AGENTS.md) 中的 Commit Checklist：可編譯、通過既有測試、為新功能補測試、無 lint 警告或錯誤、commit 訊息清楚說明「為什麼」。

---

## 3. 分支與 PR 規範

本專案採 Git Flow 風格：

- `main`：正式環境分支，受保護，不可直接推送，僅能透過已通過 CI 的 PR 合併。
- `develop`：整合分支，功能分支的合併目標。
- `feature/*`：新功能／變更分支，從 `develop` 切出，完成後發 PR 合併回 `develop`。
- `release/*`：發版分支，從 `develop` 切出，準備並驗證版本後合併至 `main`（並回併 `develop`）。

提交 PR 前請確認：

- 已依第 2 節在本地執行過 `npm run check`、`npm run test`（必要時含 `npm run test:e2e`）。
- 對照 [AGENTS.md](AGENTS.md) 的 Commit Checklist 完成自我審查（self-review）。
- PR 說明清楚描述變更目的與影響範圍；若對應 `openspec/` 中的提案，請於說明中標註對應的 change（見 [openspec/](openspec/)）。
- CI（`.github/workflows/ci.yml`：ESLint、typecheck、Vitest、build）必須全部通過，才可合併。
- 避免使用 `--no-verify` 跳過檢查，或停用測試來讓 CI 通過。

---

## 4. Commit 訊息規範

本專案採 [Conventional Commits](https://www.conventionalcommits.org/) 風格：

```
<type>(<scope>): <subject>
```

依既有 commit 歷史，常見 `type` 包含：

| type | 說明 | 範例 |
|------|------|------|
| `feat` | 新功能 | `feat(admin): 文章表單原始 HTML 模式開關與列表標記` |
| `fix` | 錯誤修正 | `fix(scripts): 修正 renew-ssl（移除已下線流程）` |
| `test` | 新增或調整測試 | `test(e2e): 新增 raw-html-post 端對端測試` |
| `docs` | 文件變更 | `docs(spec): 同步 admin-editor/blog-ui 規格` |
| `chore` | 雜項維護（不影響功能） | `chore: 同步 main（PR 合併）回 develop` |
| `ci` | CI/CD 設定變更 | `ci(docker): 版本 tag 觸發建置並產生 semver image tags` |

`scope` 通常對應變更所在的模組或範疇（如 `admin`、`domain`、`frontend`、`e2e`、`spec`、`scripts`），可依實際情況省略。`subject` 使用正體中文，並著重說明**為什麼**做這個變更，而非單純重述程式碼異動。

---

## 5. 文件連結

- [AGENTS.md](AGENTS.md) — 開發哲學、TDD 流程、程式碼規範與 Commit Checklist 完整說明
- [CLAUDE.md](CLAUDE.md) — 架構邊界（Clean Architecture / DDD）、常用指令與模組慣例
- [README.md](README.md) — 專案簡介、功能特色與快速開始
- [本地開發指南](docs/development.md) — 環境設定、常用指令
- [API 文件](docs/api.md) — API 端點說明
- [openspec/](openspec/) — 規格與變更提案（RFC）系統
- 環境變數範例：[.env.example](.env.example)（根目錄，統一管理，symlink 至 `web/.env`；亦可參考 [web/.env.example](web/.env.example)）
