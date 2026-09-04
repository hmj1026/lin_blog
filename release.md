# Lin Blog Release Process（PR 驅動 Git Flow）

本文件是 Lin Blog 從日常開發到正式發布的主要流程規範。分支命名、合併方向、版本管理、品質閘門與部署方式以本文件為準；其他文件只保留摘要並連結回本文件。

本專案採用 Git Flow 的分支模型，但以 GitHub Pull Request（PR）完成合併。`main` 受保護，不能透過本機 `git flow release finish` 直接完成發布，也不能直接 push；`git-flow` CLI 可協助建立分支，但不是發布合併的必要工具。

## 流程概覽

```text
feature/*、fix/*
        │
        └─ PR ─► develop ── 建立 release/vX.Y.Z ── PR ─► main
                                                        │
                                                        ├─ tag vX.Y.Z
                                                        ├─ CI 建置 GHCR image
                                                        ├─ 人工部署 immutable image
                                                        └─ PR main → develop

hotfix/* ── PR ─► main ── tag vX.Y.Z ── PR main → develop
```

功能開發合併到 `develop` 與正式發布是兩個不同事件。功能完成即可先合併到 `develop`，發布時再由 `develop` 建立 release branch，將一批已完成的變更一起發布。

## 分支規範

| 分支 | 基準分支 | 用途 | 合併目標 | 規則 |
|---|---|---|---|---|
| `main` | — | 正式版本與 production deploy 基準 | — | 受保護，只能透過 PR 合併 |
| `develop` | `main` 同步後 | 日常整合與下一版開發基準 | — | 永久保留；功能不可直接提交到此分支 |
| `feature/<name>` | `develop` | 新功能、改善或非緊急變更 | `develop` | 一項工作一個分支與 PR |
| `fix/<name>` | `develop` | 一般錯誤修正 | `develop` | 不應從 `main` 建立 |
| `release/vX.Y.Z` | `develop` | 版本號、CHANGELOG、release gate 與發布前修正 | `main` | 暫時分支；發布完成後刪除 |
| `hotfix/<name>` | `main` | production 緊急修正 | `main`，再同步至 `develop` | 僅限無法等待一般 release 的重大事故 |

### 基本限制

- `main` 不可直接 push；所有進入 `main` 的變更都必須透過 PR、Code Review 與必要 checks。
- `feature/*`、`fix/*` 必須從最新 `develop` 建立，並以 PR 合併回 `develop`。
- `release/*` 必須從 `develop` 建立，不得從 `main` 建立。
- 正式版本 tag 必須指向已合併到 `main` 的 commit，格式固定為 `vX.Y.Z`。
- 發布完成後必須把 `main` 的 release commit 回併到 `develop`，避免下一個 release 遺失版本或 CHANGELOG 變更。
- 不使用 `latest` 作為正式部署版本；正式環境只接受 SemVer tag 或 immutable commit SHA。

## 日常開發流程

### 1. 更新整合分支並建立工作分支

```bash
git fetch origin --prune
git switch develop
git pull --ff-only origin develop
git switch -c feature/<name>
```

一般錯誤修正使用 `fix/<name>`；只有 production 無法等待正常 release 的重大事故才使用 `hotfix/<name>`，並從 `main` 建立。

### 2. 依 TDD 完成變更

遵循 `Study → Red → Green → Refactor → Commit`：

1. 先閱讀相似功能與架構邊界。
2. 先新增會失敗的測試。
3. 寫出讓測試通過的最小實作。
4. 在測試維持綠燈下重構。
5. 以 Conventional Commit 小步提交，訊息說明變更原因。

所有程式碼、測試與 migration 都必須留在同一個工作分支，不能為了讓 CI 通過而停用測試或使用 `--no-verify`。

### 3. 執行本地品質閘門

在 `web/` 目錄執行：

```bash
npm ci
npx prisma generate
npm run check
npm run test -- --coverage
npm run test:integration
npm run build
npm run test:e2e
```

若變更涉及 GitHub Actions，另執行 `actionlint`。若變更包含 Prisma migration，必須在可丟棄資料庫上執行 `npm run db:migrate:deploy`，並確認空資料庫與既有 schema 演進情境都能完成。

### 4. 建立 PR 合併到 develop

```bash
git push -u origin feature/<name>
gh pr create --base develop --head feature/<name> --title "feat(<scope>): <說明>"
gh pr checks <PR> --watch
```

`fix/*` 使用相同流程。PR 必須說明變更目的、影響範圍、測試結果與對應的 OpenSpec change（若有）。CI 與 E2E 皆通過後，才可由具權限的人員合併。

## CI 與合併閘門

目前 workflow 的實際責任如下：

| 事件 | Workflow | 主要驗證 |
|---|---|---|
| PR → `develop` | `ci.yml`、`e2e.yml` | Node 22 品質檢查、整合測試、build、Playwright E2E |
| PR → `main` | `ci.yml`、`e2e.yml` | Node 22 品質檢查、整合測試、build、Playwright E2E |
| 符合 paths 的 push → `main` | `docker-build.yml`、`e2e.yml` | reusable CI、Docker image 建置與 GHCR 推送、E2E |
| push `vX.Y.Z` tag | `docker-build.yml` | release tag 的 reusable CI、版本化 Docker image 建置與 GHCR 推送 |
| `cd.yml` | 已停用 | 目前不提供自動 staging 或 production deploy |

`main` 的 branch protection required checks 以 GitHub 目前設定與 workflow 實際產生的名稱為準。修改 CI 矩陣或 job 名稱時，必須同步檢查 branch protection，避免 required check 指向不存在的 context。

上表的 Node 版本以 `ci.yml` 的 `detect` job 實際輸出為準（目前所有觸發情境一律單一 Node 22；Node 20 已於 2026-04-30 EOL 並自矩陣移除）。**調整 Node 矩陣時，`.github/workflows/ci.yml`、本文件上表與 `main` 的 branch protection required checks 三處必須一併檢查**：required check 綁定的是 workflow 實際產生的 check 名稱，文件若殘留已移除的版本，會誤導維護者把 required check 指向永不存在的 context，使 PR 永久停在 pending 而無法合併。此約束的規格層依據為 `openspec/specs/project-documentation/spec.md` 的 `Deployment Documentation Accuracy` 要求；該要求原僅涵蓋 [`docs/deployment.md`](docs/deployment.md) 的 CI/CD 章節，其涵蓋範圍由 change `fix-release-gate-and-ci-cost` 擴充至本文件，並於該 change 歸檔後生效。

## Release 前置條件

開始 release 前必須確認：

- 所有要發布的 `feature/*`、`fix/*` 已合併到 `develop`。
- `develop` 工作樹乾淨，且已同步 `origin/develop`。
- release 版本符合 SemVer `X.Y.Z`，Git tag 使用 `vX.Y.Z`。
- `web/package.json` 與 `web/package-lock.json` 的根 package version 一致。
- `CHANGELOG.md` 已準備本版本的結構化變更說明。
- 若有 schema 變更，migration 已完成可丟棄資料庫與既有資料庫升級演練。
- GitHub secrets 已備妥：`NEXT_PUBLIC_SITE_URL` 與 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`。tag 建置缺少任一必要 secret 時，`docker-build.yml` 必須失敗。
- production deploy 使用的 image tag 已確認為版本 tag 或 commit SHA，不能使用 `latest`。
- **GitHub Actions 額度可用**：確認帳戶的 Actions included minutes 未耗盡、且 billing 狀態正常。此項必須在推送 `vX.Y.Z` tag（第 5 步）**之前**完成確認。

```bash
# 確認 Actions 額度與 billing 狀態；亦可於 GitHub 網頁 Settings → Billing → Plans and usage 查看
gh api /users/{owner}/settings/billing/actions
```

額度確認之所以必須前置於 tag 推送：tag 一經推送即為不可變的發布事實，但 `docker-build.yml` 若因額度不足而未啟動，會產生「tag 已存在於遠端、對應 GHCR 映像卻不存在」的半完成狀態。該狀態下依本文件既有規範，既不可部署（見「Release 完成條件」），也不得以移動或重寫 tag 補救（見第 5 步）。復原方式見「回滾與失敗處理 › 常見阻塞」。

## Release 流程

以下以 `X.Y.Z` 代表新版本，例如 `1.5.0`。

### 1. 從 develop 建立 release branch

```bash
NEW_VERSION=X.Y.Z

git fetch origin --prune
git switch develop
git pull --ff-only origin develop
git switch -c release/v$NEW_VERSION
```

確認遠端尚未存在相同 release branch 或 tag：

```bash
git ls-remote --exit-code --heads origin "release/v$NEW_VERSION"
git ls-remote --exit-code --tags origin "refs/tags/v$NEW_VERSION"
```

上述命令若以非零狀態結束，代表該 ref 不存在；若已存在，停止流程並先確認是否為重複發布。

### 2. 同步版本與 CHANGELOG

在 release branch 執行：

```bash
cd web
npm version --no-git-tag-version "$NEW_VERSION"
cd ..
```

此命令會同步 `web/package.json` 與 `web/package-lock.json`。接著在 `CHANGELOG.md` 最上方加入：

```markdown
## X.Y.Z — YYYY-MM-DD — <發布摘要>

### 新增功能 (feat)

### 問題修復 (fix)

### 測試與維運 (test/ci/chore)
```

CHANGELOG 標題的版本號不加 `v`，但必須保留版本號後的空白，例如 `## 1.5.0 — 2026-07-13 — ...`。Git tag 與 GitHub Release 標題才使用 `v1.5.0`。

### 3. 執行 release candidate gate

```bash
cd web
npm ci
npx prisma generate
npm run check
npm run test -- --coverage
npm run test:integration
npm run build
npm run test:e2e
cd ..

git diff --check
git diff -- web/package.json web/package-lock.json CHANGELOG.md
```

release branch 只允許版本、CHANGELOG、必要的 release 修正。若發現產品功能仍有問題，應回到 `develop` 修正後再更新或重新建立 release branch，不應在 release branch 直接累積未經整合的功能。

### 4. 提交 release branch 並建立 PR

```bash
git add web/package.json web/package-lock.json CHANGELOG.md
git commit -m "chore(release): bump version to $NEW_VERSION and update changelog"
git push -u origin release/v$NEW_VERSION

gh pr create \
  --base main \
  --head release/v$NEW_VERSION \
  --title "release: v$NEW_VERSION — <發布摘要>"
```

release PR 必須通過 `ci.yml`、`e2e.yml`、Code Review 與 `main` branch protection。不得在本機使用 `git flow release finish` 取代 PR，因為該命令會嘗試直接操作受保護的 `main`。

### 5. 合併 main 並建立版本 tag

PR 合併完成後，確認版本 commit 已在 `main`，再建立 annotated tag：

```bash
git fetch origin --prune
git switch main
git pull --ff-only origin main

test "$(node -p "require('./web/package.json').version")" = "$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "v$NEW_VERSION"
```

tag 必須建立在 `origin/main` 當下的 release commit 上。不得先在其他分支建立 tag，再以移動或重寫 tag 的方式補救。
若 PR 合併時沒有啟用自動刪除分支，確認 tag 與 image 驗證完成後刪除遠端 release branch：

```bash
git push origin --delete "release/v$NEW_VERSION"
```

### 6. 驗證 GitHub Release 與 GHCR image

目前沒有啟用中的自動 GitHub Release workflow。推送 tag 後：

1. `docker-build.yml` 會先執行 reusable CI。
2. CI 通過後建置並推送 `ghcr.io/hmj1026/lin_blog:vX.Y.Z`，以及 Docker metadata 產生的其他 SemVer tag。
3. 維護者從 CHANGELOG 建立 GitHub Release。

```bash
gh run list --workflow=docker-build.yml -L 5
gh run view <RUN_ID> --log-failed

awk -v version="$NEW_VERSION" '
  $0 ~ "^## " version " " { in_section=1; next }
  in_section && /^## / { exit }
  in_section { print }
' CHANGELOG.md > /tmp/lin-blog-release-notes.md

test -s /tmp/lin-blog-release-notes.md
gh release create "v$NEW_VERSION" \
  --title "v$NEW_VERSION" \
  --notes-file /tmp/lin-blog-release-notes.md
```

若該 tag 的 Docker build 使用了尚未包含 tag trigger 的 workflow commit，該 tag 不會自動補讀較新的 workflow。此時必須確認 tag 指向的 commit 已包含目前的 `docker-build.yml`，再重新建立正確的 release tag；不得以未驗證的 image 直接部署。

### 7. 部署 immutable image

正式環境目前使用人工部署，`cd.yml` 不會代為執行：

```bash
ssh paul@your-server-ip
BLOG_IMAGE_TAG=v$NEW_VERSION /var/www/products/deploy.sh
```

`scripts/deploy.sh` 會拉取指定 image、更新容器、執行 `prisma migrate deploy`、等待 PostgreSQL 與 application healthcheck，最後檢查 HTTP endpoint。部署完成後仍需人工驗證首頁、文章頁、登入、後台與本次變更涉及的功能。

部署失敗時保留現場 log，先確認容器與 migration 狀態，再決定修復或回滾；不可用 `latest` 覆蓋問題。

### 8. 將 main 回併到 develop

release 與 tag 驗證完成後，必須建立 `main → develop` 的同步 PR：

```bash
gh pr create \
  --base develop \
  --head main \
  --title "chore: sync main to develop after v$NEW_VERSION"
```

同步 PR 若發生衝突，先在本機以最新遠端分支重現並解決，再推送同步分支；不得靜默忽略 `web/package.json`、`web/package-lock.json` 或 `CHANGELOG.md` 的衝突。

## Hotfix 流程

production 發生無法等待下一次正常 release 的重大事故時：

1. 從最新 `main` 建立 `hotfix/<name>`。
2. 以最小變更與回歸測試修正問題。
3. 建立 PR 合併回 `main`，通過完整 CI/E2E gate。
4. 依相同規則建立下一個 patch tag，例如 `v1.5.1`。
5. 驗證 image 與 production deploy。
6. 建立 `main → develop` 同步 PR，確保 hotfix 不會只存在正式分支。

若 hotfix 同時需要資料庫 migration，必須先確認 migration 對舊版與新版 image 的相容策略，並準備失敗時的 forward-fix 或資料庫復原方案。

## 回滾與失敗處理

### Image 回滾

使用上一個已驗證版本或 immutable SHA：

```bash
BLOG_IMAGE_TAG=v<previous-version> /var/www/products/deploy.sh
# 或
BLOG_IMAGE_TAG=<commit-sha> /var/www/products/deploy.sh
```

回滾 image 不等於回滾資料庫 migration。Migration 已執行後，優先採用向前修正；任何 destructive migration 都必須在 release 前完成備份與復原演練。

### 常見阻塞

| 症狀 | 優先處理 |
|---|---|
| PR CI 失敗 | 查看失敗 job 與 artifact，在原工作分支修正並重新跑 gate |
| tag Docker build 失敗 | 先檢查 `NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 與 tag 指向的 workflow commit |
| GHCR image 未出現 | 確認 `docker-build.yml` 的 tag run 已成功，再檢查 package 權限與 image metadata |
| migration 失敗 | 停止繼續流量切換，保留 log，檢查 migration status 與資料庫備份 |
| deploy healthcheck 失敗 | 檢查 `blog_app`、`blog_db` log 與 endpoint；必要時部署上一個已驗證 tag |
| main → develop 衝突 | 手動解決並重新跑相關測試，不可刪除 release commit 或 CHANGELOG 內容 |
| job 以零 step、數秒內結束且 `conclusion` 為 `failure` | 屬帳務／用量上限而非程式缺陷。改查 check-run annotation 取得成因（見下方「Actions 額度耗盡」） |

#### Actions 額度耗盡

**症狀。** job 未執行任何 step、數秒內結束，`conclusion` 為 `failure`。此形態與程式缺陷造成的失敗難以區分，容易讓維運者把時間全花在排查程式問題上。

**判讀。** `gh run view <run-id> --log-failed` 對此類失敗**取不到任何內容**（沒有 step，就沒有 log），據此判定「無 log 可查」本身即是重要訊號。實際成因只存在於 check-run annotation：

```bash
# 從 annotation 取得帳務成因（--log-failed 對此類失敗無效）
gh api "/repos/{owner}/{repo}/check-runs/$(gh run view <run-id> --json jobs -q '.jobs[0].databaseId')/annotations"

# 或直接列出該 run 各 job 的結論與耗時，確認「零 step、數秒」的形態
gh run view <run-id> --json jobs -q '.jobs[] | {name, conclusion, startedAt, completedAt, steps: (.steps | length)}'
```

**復原。** 額度恢復後，直接重跑既有 run 即可完成發布：

```bash
gh run rerun <run-id>
```

**不得刪除或重建 tag。** tag 指向的 commit 已包含當前的 `docker-build.yml`（含 `v*.*.*` 觸發器），因此重跑原 run 即可產出映像，tag 本身不需任何變動。這與第 5 步「不得以移動或重寫 tag 的方式補救」一致。

在對應的 GHCR 映像產出並可拉取之前，該版本**不得**部署至正式環境，即使 tag 已存在於遠端。

## Release 完成條件

一次 release 必須同時滿足：

- release branch 從 `develop` 建立，且 release PR 已合併到 `main`。
- `web/package.json`、`web/package-lock.json`、`CHANGELOG.md` 版本資料一致。
- CI、integration test、build 與 E2E gate 全部通過。
- `vX.Y.Z` tag 指向 `main` 的 release commit。
- GHCR 對應版本 image 建置成功並可拉取。
- production 以 immutable tag 或 SHA 完成部署與 smoke test。
- `main → develop` 同步 PR 已完成，或已明確記錄阻塞原因與處理責任人。

本地 release candidate 的綠燈只代表本地驗證完成，不等同 GitHub workflow、GHCR image 或 production deploy 已完成；三者必須分開記錄證據。

## 相關文件

- [貢獻指南](CONTRIBUTING.md)：本地開發、TDD、PR 與 commit 規範
- [開發到部署流程](docs/workflow.md)：開發流程摘要與環境操作
- [部署指南](docs/deployment.md)：伺服器、secret、image 與部署細節
- [README](README.md)：專案概覽與快速開始
