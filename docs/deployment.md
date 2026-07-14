# 部署指南

## 概述

本專案使用 GitHub Actions 自動建置 Docker image 並推送到 GitHub Container Registry (ghcr.io)，Linode 伺服器只需拉取預編譯的 image 即可快速部署。

## 架構流程

```
feature/fix → PR develop → release/vX.Y.Z → PR main → vX.Y.Z tag → CI/Docker Build → ghcr.io → Linode deploy → sync develop
```

### 分支模型與命名慣例

本專案採 git-flow-lite（`develop` 整合／`main` 發布／`release/vX.Y.Z` 發版分支）。以下分支前綴
為**文件慣例，非由 workflow 強制**（無 prefix 檢查、無 git-flow CLI 工具）：

| 分支前綴 | 從何切出 | 合併目標 | 用途 |
|----------|----------|----------|------|
| `feature/<topic>` | `develop` | PR → `develop` | 一般功能開發 |
| `fix/<topic>` | `develop` | PR → `develop` | 非緊急錯誤修正 |
| `hotfix/<topic>` | `main` | PR → `main`，release 後 sync 回 `develop` | 正式環境緊急修補 |
| `release/vX.Y.Z` | `develop`（版本 bump） | PR → `main` | 發版分支 |

- `feature/*`、`fix/*` 從 `develop` 切出，經 PR 回 `develop`(走 PR→develop 功能閘門:單一
  Node 22 CI + E2E)。
- `hotfix/*` 從 `main` 切出、PR→`main`(走 release 閘門),合併並發布後需 sync 回 `develop`
  (與現行 release 後 `main → develop` 同步流程一致),避免修補在 `develop` 遺失。
- 完整 release／版本／tag 流程見根目錄 [release.md](../release.md)。

> [!NOTE]
> **CD（自動部署）目前已停用**（2026-07-05）。`.github/workflows/cd.yml` 原設計為
> push 到 `develop` 自動部署 Staging、手動觸發部署 Production，但 Staging 主機尚未
> 建置、GitHub Environments 也尚未設定必要 secrets，首次自動觸發已因缺少
> `DEPLOY_HOST` 等設定而失敗。目前已移除 `cd.yml` 的自動觸發、將部署 job 擋下，
> 並在 GitHub 執行 `gh workflow disable cd.yml`（程式碼保留供未來重新啟用；細節見本機限定
> 文件 `docs/private/staging-deploy-guide.md`。該檔案在 `docs/private/`，已列入 `.gitignore`，
> 僅存在本機，不會出現在其他 clone）。
> **正式環境部署持續採用下方「快速更新」的人工執行 `/var/www/products/deploy.sh` 方式。**

> [!NOTE]
> **網域與反向代理**：正式站由**主機層 systemd nginx**（非容器內 nginx）反向代理到
> lin_blog 容器對外埠 `127.0.0.1:3100`。WordPress 下線後，apex `linstar.win` 與
> `nx.linstar.win` **兩個網址皆導向 lin_blog**。憑證為 Let's Encrypt wildcard
> `*.linstar.win`（Cloudflare DNS-01 自動續期）。nginx 設定範本見
> [`nginx/conf.d/blog.conf`](../nginx/conf.d/blog.conf)，實際檔案在伺服器
> `/etc/nginx/sites-available/nx-linstar-win`。

### CI/CD Workflows

| Workflow | 檔案 | 觸發條件 | 功能 |
|----------|------|----------|------|
| **CI** | `ci.yml` | PR to `main`·`develop`／`workflow_call`（**無** `push:[main]`，決策 C：main push 的驗證改由 `docker-build.yml` 呼叫本 workflow） | Lint、TypeScript、單元測試、Build（單一 Node 22 矩陣） |
| **E2E** | `e2e.yml` | PR to `main`·`develop`／手動觸發（`workflow_dispatch`）（**無** `push:[main]`：release PR 已跑過 E2E，push→main 重跑屬冗餘） | Playwright 端對端測試（PR→develop 功能閘門、PR→main release 閘門） |
| **Docker Build** | `docker-build.yml` | Push to `main`（paths 過濾：限 `web/**` 與相關 workflow 檔變更）／tag `v*.*.*`（tag push 不受 paths 過濾，release 必建置）／手動觸發（`workflow_dispatch`）；先以 `workflow_call` 呼叫 CI（單一 Node 22），通過後建置 | 建置並推送 Docker image |
| **CD**（⚠️ 已停用） | `cd.yml` | `workflow_dispatch` only；且 deploy jobs（staging／production）以 `if: false` 擋下，並已於 GitHub 執行 `gh workflow disable cd.yml`，故 `workflow_dispatch` 目前實際上也無法觸發 | 原設計為自動部署 Staging/Production，現階段完全停用 |

> [!NOTE]
> **三種驗證階段別混淆**（成本核算時分開記，勿把仍存在的 image build 當成本變更已移除）：
> - **PR E2E**：`e2e.yml` 只在 PR→develop（功能閘門）與 PR→main（release 閘門）各跑一次；
>   merge 到 `main` 後**不再**重跑 E2E。
> - **path-matched main Docker CI**：符合 `web/**`／workflow paths 的 `main` push 觸發
>   `docker-build.yml`，其內部先以 `workflow_call` 呼叫 `ci.yml`（單一 Node 22，**無 E2E**）再建置一次 image。
>   僅改文件（未符 path filter）的 main push 會被略過，不重建、不重跑 CI，且此 skipped 不是失敗。
> - **tag Docker CI**：`v*.*.*` tag push **不評估 paths**，一定觸發一次 reusable CI（單一 Node 22，**無 E2E**）＋ image build。
>   因此一次 release 可能同時有 main push 與 tag push 各建置一次 image，這是既有發布語意、非本變更移除的重複。

> [!NOTE]
> **`cd.yml` 停用原因**：Staging 主機尚未建置（無任何主機/目錄），且 GitHub Environments
> （staging／production）尚未設定必要 secrets（`DEPLOY_HOST` / `DEPLOY_USER` /
> `DEPLOY_SSH_KEY` / `DEPLOY_PATH`）。正式環境部署目前維持人工執行
> `/var/www/products/deploy.sh`，並要求指定 immutable `BLOG_IMAGE_TAG`（見下方「快速更新」）。
> **重新啟用前置條件**：① 建置 staging 主機、② 在 GitHub Environments 設定上述 secrets，
> 完成後需 `gh workflow enable cd.yml` 並復原本檔頂部的停用註解。

---

## 🔒 Branch Protection / Ruleset 設定

`main` 受一個 **Ruleset「main」**（id `11401094`；`deletion` / `non_fast_forward` /
`required_status_checks` 三條規則）保護。**本 repo 沒有另外設定 classic Branch Protection**
（`gh api repos/{owner}/{repo}/branches/main/protection` 回 404 "Branch not protected"，
2026-07-14 以 repo 轉 public 後直接用 API 確認過，先前文件寫「同時受兩者保護」是誤判）——約束
一律只看這個 Ruleset，不必再另查 classic Branch Protection。目前規則不含 `pull_request`
類型，故「是否強制走 PR、禁止直接 `git push origin main`」實際上未被 Ruleset 規則列表明確
保證，日常操作仍請一律走 PR，但這不是 GitHub 端強制的，若要強制需額外新增 `pull_request` 規則
（本文件不預設已加，需要時再確認）。

> [!IMPORTANT]
> **踩雷重點：必要 status checks 的名稱必須與 CI 實際跑出來的一致。**
> CI 矩陣已收斂為單一 Node 22，實際 check 名為 4 個：`Lint (Node 22)`、
> `Type Check (Node 22)`、`Unit Tests (Node 22)`、`Build (Node 22)`。
> 若 ruleset/branch protection 裡仍填舊的 4 個 `(Node 20)` 名稱（或無 `(Node XX)` 後綴的舊名），
> GitHub 會永遠等這些不再產生的 check → PR 卡在
> `"required status checks are expected"`、`mergeStateStatus: BLOCKED`，看起來像「一直在檢查」。
> **時序**：CI 矩陣變更 merge 進 develop 後、**下一個 release PR 建立之前**，必須把所有實際生效
> 設定（Ruleset 與 classic Branch Protection 可能同時存在，兩者都要查）的必要 check 由 8 個
> （含 4 個 Node 20）更新為 4 個 Node 22。原則：required checks 恆與 CI 矩陣同步。

檢查 / 修正 ruleset 必要 check（需 admin）：

```bash
# 看目前 ruleset 要求的 check 名
gh api repos/hmj1026/lin_blog/rulesets --jq '.[] | {id,name}'
gh api repos/hmj1026/lin_blog/rulesets/<id> \
  --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context'
# 個人 repo 若無人可 approve，admin 可繞過合併：gh pr merge <PR> --admin --merge
```

### API 回應 403 時的替代驗證程序

若 `gh api repos/{owner}/{repo}/branches/main/protection` 因 GitHub 方案限制回傳 403
（classic branch protection API 在部分方案下不可讀），依序嘗試：

1. **改打 rulesets endpoint**：`gh api repos/{owner}/{repo}/rulesets`（該端點的方案限制與
   classic protection endpoint 不同，403 時未必也會擋 rulesets）。
2. **GitHub UI 檢視**：至 Settings → Branches / Rules 人工檢視現有規則，並留下書面紀錄
   （或截圖）存證。
3. **匯出 ruleset JSON**：於 UI 匯出 ruleset 設定為 JSON，作為可比對、可留存的紀錄。

無論用哪一種方式取得結果，都必須將取得的必要 status check 名稱與 CI 實際 job 名比對，
確認為上方列出的 4 個 `Lint (Node 22)`、`Type Check (Node 22)`、`Unit Tests (Node 22)`、
`Build (Node 22)`，避免沿用舊的 `(Node 20)` 名稱造成 PR 卡在 `BLOCKED`。API 因方案限制回傳
403 時不得視為驗證通過，必須改以 UI/export 由具權限者補齊證據。

---

## ⚡ 快速更新（日常操作）

當有新版本需要部署到伺服器時，執行以下一鍵腳本（版控來源為 repo 的 [`scripts/deploy.sh`](../scripts/deploy.sh)，部署至伺服器 `/var/www/products/deploy.sh`）。`BLOG_IMAGE_TAG` 必須指定版本或 commit SHA：

```bash
BLOG_IMAGE_TAG=vX.Y.Z /var/www/products/deploy.sh
```

部署前必須明確指定 immutable image tag（版本或 commit SHA），腳本會拒絕未設定及
`latest` 等 mutable tag：

```bash
BLOG_IMAGE_TAG=v1.4.0 /var/www/products/deploy.sh
```

這會完成：
1. 拉取指定 immutable Docker image
2. 停止並更新容器
3. 執行資料庫遷移（如有）
4. 健康檢查（`curl http://localhost:3100`）

### Newsletter 訂閱功能先決條件（v1.4.x+）

訂閱表單採 reCAPTCHA fail-closed 設計：**未設定以下變數時，首頁／文章頁的
訂閱表單會呈「目前無法使用訂閱功能」的降級狀態**（此為 spec 既定行為，非故障）。

> [!IMPORTANT]
> `NEXT_PUBLIC_*` 變數是 **build-time 內嵌**進 client bundle 的：site key 必須設為
> GitHub repo secret（`gh secret set NEXT_PUBLIC_RECAPTCHA_SITE_KEY`）才會進入
> CI 建置的 image。**只設在伺服器 `.env` 再重啟容器對前端表單無效**
> （v1.4.3 首頁訂閱表單不可用即此根因，詳見
> `docs/knowledge/newsletter-recaptcha-unavailable/investigation.md`）。

```bash
# GitHub repo secret（build-time，進 client bundle；設定後需重建 image）
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="<reCAPTCHA v2 site key>"   # 前端可見（公開值）

# .env（伺服器端執行期，設定後需重啟容器）
# NEXT_PUBLIC_RECAPTCHA_SITE_KEY 建議同步保留於 .env（compose build fallback），詳見「Newsletter 訂閱與 reCAPTCHA v2 部署」步驟 2
RECAPTCHA_SECRET_KEY="<reCAPTCHA v2 secret key>"           # 僅伺服器
RECAPTCHA_ALLOWED_HOSTNAMES="nx.linstar.win"               # 必填，允許的 hostname 白名單（逗號分隔，缺少即 fail closed）
```

升級部署後的人工作業：

1. 確認上述 reCAPTCHA env 已設定並重啟容器。
2. 首頁訂閱區塊預設隱藏（`showNewsletter` 預設 `false`）：管理者於
   **後台 → 站台設定 → 功能開關** 勾選「顯示 Newsletter 訂閱區塊」並儲存。
3. `subscribers:view` 權限由 migration 於 `migrate deploy` 自動佈建（冪等），
   既有登入工作階段會在下次請求自動刷新權限，無需重跑 `init-admin.js`。

---

## 🚀 完整部署步驟

### 0. Release 前檢查：build-time secrets

`NEXT_PUBLIC_*` 變數於 CI 建置時內嵌進 client bundle，缺失的 secret 會被靜默替換為
空字串。release 前用 `gh secret list` 核對以下清單（`docker-build.yml` 僅檢查
必要項：tag 建置缺少即 fail、main/dispatch 建置僅警告；選填項不檢查，缺少時
靜默內嵌為空字串）：

| Secret | 必要性 |
|--------|--------|
| `NEXT_PUBLIC_SITE_URL` | ✅ 必要 |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | ✅ 必要（缺少時訂閱表單整體降級不可用） |
| `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_FB_PIXEL_ID` | ❌ 選填（缺少時對應追蹤不啟用） |

### 1. Release：依 PR 驅動 Git Flow 發布

完整的分支、版本、tag、GitHub Release、image 與回併規範集中於根目錄
[release.md](../release.md)。本文件只保留部署端摘要，不再維護另一套 release 分支流程。

發布完成後，先確認版本 tag 的 Docker Build 已成功，再執行 immutable image 部署：

```bash
gh run list --workflow=docker-build.yml -L 5
gh run view <RUN_ID> --log-failed
```

### 2. 伺服器端更新

> ℹ️ 伺服器已停用 root 登入（`PermitRootLogin no`）、僅允許金鑰登入，SSH 使用者為 `paul`。

#### 方式一：使用部署腳本（推薦）

```bash
ssh paul@your-server-ip
BLOG_IMAGE_TAG=vX.Y.Z /var/www/products/deploy.sh
```

#### 方式二：手動執行

```bash
# SSH 到伺服器
ssh paul@your-server-ip

# 拉取指定 immutable image
export BLOG_IMAGE_TAG=v1.4.0
docker pull "ghcr.io/hmj1026/lin_blog:${BLOG_IMAGE_TAG}"

# 進入專案目錄（實際部署路徑）
cd /var/www/products/lin_blog

# 重啟容器（主機僅安裝 docker-compose v1）
docker-compose down
BLOG_IMAGE_TAG="${BLOG_IMAGE_TAG}" docker-compose up -d

# 執行資料庫遷移（如有 schema 變更）
docker exec blog_app node node_modules/prisma/build/index.js migrate deploy
```

### 3. 驗證部署

```bash
# 檢查容器狀態
docker ps | grep blog

# 查看即時日誌
docker logs -f blog_app

# 測試 API 回應
curl -I http://localhost:3100
```

---

## 📋 首次部署（伺服器設定）

### 1. 設定 GitHub Container Registry (ghcr.io)

> [!NOTE]
> ghcr.io 是 GitHub 內建的 Container Registry，無需額外註冊。
> GitHub Actions 會自動使用 `GITHUB_TOKEN` 推送 image，無需手動設定。

#### 1.1 建立 Personal Access Token（用於伺服器拉取）

1. 前往 GitHub → **Settings** → **Developer settings**
2. 點擊 **Personal access tokens** → **Tokens (classic)**
3. 點擊 **Generate new token (classic)**
4. 設定：
   - **Note**: `linode-docker-pull`
   - **Expiration**: 選擇適當期限或 No expiration
   - **Scopes**: 勾選 `read:packages`
5. 點擊 **Generate token** 並複製 token（只會顯示一次）

#### 1.2 在伺服器登入 ghcr.io

```bash
# 將 YOUR_TOKEN 替換為上一步複製的 token
# 將 YOUR_GITHUB_USERNAME 替換為您的 GitHub 使用者名稱
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

驗證登入成功：
```bash
docker pull ghcr.io/hmj1026/lin_blog:v1.4.0
```

#### 1.3 查看已推送的 Images

推送成功後，可在以下位置查看：
- GitHub Repository → **Packages** 標籤頁
- 直接訪問：`https://github.com/hmj1026/lin_blog/pkgs/container/lin_blog`

### 2. Clone 專案並設定環境

```bash
cd /var/www/products
git clone https://github.com/hmj1026/lin_blog.git
cd lin_blog

# 確認使用 main 分支（如舊版使用 master 需切換）
git checkout main
git branch -u origin/main main

# 複製並編輯環境變數（可改由 docs/private 的機密備份還原，見搬遷手冊）
cp .env.example .env
nano .env
```

> ⚠️ **注意**：如果伺服器舊版本使用 `master` 分支，需要執行以下切換：
> ```bash
> git fetch origin
> git checkout main
> git branch -D master  # 刪除舊的 master 分支
> ```

### 3. 首次啟動

> ℹ️ 自 WordPress/n8n 下線後，`blog` 服務已改為僅使用內部 `blog_network`，**不再需要** 手動建立 `srl_shared_network` 外部網路（反向代理由主機層 nginx 直接連 `127.0.0.1:3100`）。

```bash
docker-compose up -d

# 執行資料庫遷移
docker exec blog_app node node_modules/prisma/build/index.js migrate deploy

# 初始化權限 / 角色 / 站台設定 / 預設分類（冪等，不建立使用者）
docker exec blog_app node scripts/init-admin.js

# 建立管理員帳號（密碼透過 ADMIN_PASSWORD 環境變數傳入）
ADMIN_PASSWORD='your-secure-password' docker exec -e ADMIN_PASSWORD -i blog_app \
  node scripts/create-user.js --email admin@example.com --name Admin --role ADMIN
```

### 4. 安裝維運腳本

部署腳本已納入版控，直接從 repo 複製到伺服器即可（內容見 [`scripts/deploy.sh`](../scripts/deploy.sh)）：

```bash
# 於 /var/www/products/lin_blog 內
sudo cp scripts/deploy.sh scripts/backup-db.sh \
        scripts/start-all-services.sh scripts/check-services.sh /var/www/products/
sudo chmod +x /var/www/products/{deploy,backup-db,start-all-services,check-services}.sh
```

其他維運腳本與 cron 安裝（含每日 DB 備份）說明見 [`scripts/README.md`](../scripts/README.md)。

---

## 🏷️ Image 標籤說明

| 標籤 | 說明 | 使用場景 |
|-----|------|---------|
| `vX.Y.Z` / `X.Y.Z` / `X.Y` | 版本 tag 建置（push `v*.*.*` tag 時由 CI 產生的 semver 標籤，如 `v1.2.0`/`1.2.0`/`1.2`） | 版本釋出、指定版本部署 / 回滾 |
| `<短 sha>` | 特定 commit（裸短 sha，如 `f08e7b7`；metadata `type=sha,prefix=` 無前綴） | 精準回滾 |

---

## 發布版本（Release）與版本化 image

完整 release 流程已集中至 [根目錄 `release.md`](../release.md)，包括：

- 從 `develop` 建立 `release/vX.Y.Z`。
- 同步 `web/package.json`、`web/package-lock.json` 與 `CHANGELOG.md`。
- 以 release PR 合併到受保護的 `main`。
- 建立 `vX.Y.Z` tag，觸發 `docker-build.yml` 建置 GHCR image。
- 從 CHANGELOG 建立 GitHub Release。
- 以 immutable tag 或 SHA 執行部署，並建立 `main → develop` 同步 PR。

本文件後續只描述 image、伺服器與回滾操作；若與 `release.md` 的分支或版本流程不一致，以 `release.md` 為準。

## 🔄 回滾操作

```bash
# 查看本機已有的 image 版本
docker images ghcr.io/hmj1026/lin_blog

# 回滾 / 部署到指定版本（版本 tag 或裸短 sha）——deploy.sh 會 pull + readiness + migrate + 健檢
BLOG_IMAGE_TAG=v1.2.0 /var/www/products/deploy.sh
# 或指定 commit：BLOG_IMAGE_TAG=f08e7b7 /var/www/products/deploy.sh
```

---

## 🔧 監控與除錯

### 日誌查看

```bash
# 即時日誌
docker logs -f blog_app

# 最近 100 行
docker logs --tail 100 blog_app

# 特定時間範圍
docker logs --since 1h blog_app
```

### 進入容器

```bash
docker exec -it blog_app sh
```

### 資料庫操作

```bash
# 連接資料庫（角色/DB 名以容器內環境為準，此部署為 develop / lin_blog）
docker exec -it blog_db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

# 備份資料庫（一次性；每日自動備份請用 scripts/backup-db.sh + cron）
docker exec blog_db sh -c 'exec pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup_$(date +%Y%m%d).sql

# 還原資料庫（由備份檔還原到空庫）
cat backup_YYYYMMDD.sql | docker exec -i blog_db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### 容器狀態

```bash
# 查看資源使用
docker stats blog_app blog_db

# 檢查容器健康
docker inspect blog_app --format='{{.State.Health.Status}}'
```

---

## 📁 環境變數說明

| 變數 | 說明 | 必填 |
|------|------|:----:|
| `DATABASE_URL` | PostgreSQL 連線字串 | ✅ |
| `NEXTAUTH_SECRET` | 認證密鑰（32字元以上） | ✅ |
| `NEXTAUTH_URL` | 網站完整 URL | ✅ |
| `NEXT_PUBLIC_SITE_URL` | 前端網站 URL | ✅ |
| `BLOG_PORT` | 對外 Port（預設 3100） | ❌ |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | ❌ |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Newsletter 訂閱表單 reCAPTCHA v2 site key（**build-time 內嵌，須設為 GitHub repo secret**，只設 `.env` 對前端無效） | ❌ |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v2 secret key（server-only，缺少時訂閱驗證 fail closed） | ❌ |
| `RECAPTCHA_ALLOWED_HOSTNAMES` | reCAPTCHA 允許的 hostname 清單，逗號分隔 | ❌ |
| `NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS` | Newsletter 訂閱限流視窗（秒，預設 600） | ❌ |
| `NEWSLETTER_RATE_LIMIT_MAX` | Newsletter 訂閱限流視窗內最大請求數（預設 5） | ❌ |
| `APP_REPLICA_COUNT` | 目前部署 replica 數（預設 1）；大於 1 時 newsletter 限流器建構會失敗，需先改用共享 store | ❌ |
| `NEWSLETTER_SOURCE_HASH_SECRET` | Newsletter 限流器來源雜湊用的 HMAC 密鑰（未設定時自動產生 per-process 隨機密鑰） | ❌ |

完整範例見：[.env.example](../.env.example)

> [!WARNING]
> `NEWSLETTER_CAPTCHA_TEST_DOUBLE` 與 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=e2e-test` 僅供 Playwright E2E（`playwright.config.ts` `webServer.env`）使用，絕對不可設定於任何部署環境（staging 亦然）；NODE_ENV=production 執行時會強制忽略此旗標。

---

## 📮 Newsletter 訂閱與 reCAPTCHA v2 部署

本節說明如何啟用公開 Newsletter 訂閱功能，包括 Google reCAPTCHA v2 驗證與訂閱專用限流設定。

### 1. 申請 Google reCAPTCHA v2 金鑰

1. 前往 [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. 使用 Google 帳號登入，點擊「建立」或「新增網站」
3. 填入設定：
   - **標籤**：例如 `linstar.win Newsletter`
   - **reCAPTCHA 版本**：選擇「reCAPTCHA v2」
   - **reCAPTCHA v2 類型**：選擇「『我不是機器人』核取方塊（I'm not a robot Checkbox）」
   - **網域**：填入所有正式網域（本站為 `linstar.win`、`www.linstar.win`、`nx.linstar.win`）與 staging 網域；若需支援本機開發，同時新增 `localhost` 與 `127.0.0.1`
4. 點擊「提交」
5. 取得兩組金鑰：
   - **Site Key（公開）**：用於瀏覽器端訂閱表單，儲存於 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - **Secret Key（機密）**：用於伺服器驗證，**絕不可外流**，僅儲存於 `RECAPTCHA_SECRET_KEY`（server-only env）

### 2. 環境變數設定

分兩處設定——**site key 走 GitHub secret（build-time），其餘走伺服器 `.env`（執行期）**：

```bash
# (a) GitHub repo secret — build-time 內嵌進 client bundle，設定後需重建 image 才生效
gh secret set NEXT_PUBLIC_RECAPTCHA_SITE_KEY --repo hmj1026/lin_blog
```

伺服器根目錄 `.env`（設定後重啟容器）：

```bash
# reCAPTCHA v2 必要設定（伺服器驗證用；與上方 site key 三者缺一不可，否則驗證 fail closed）
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your-recaptcha-v2-site-key"  # 供 compose build fallback 與 SSR 一致性，仍建議同步設定
RECAPTCHA_SECRET_KEY="your-recaptcha-v2-secret-key"

# 允許的 hostname 清單（逗號分隔；必須與 Google Admin Console 設定的網域相符，
# 且必須涵蓋所有實際對外服務的網域——本站含 nx.linstar.win，缺漏會導致該網域訂閱 fail closed）
RECAPTCHA_ALLOWED_HOSTNAMES="linstar.win,www.linstar.win,nx.linstar.win"

# Newsletter 訂閱限流設定（可選，皆有預設值）
NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS=600
NEWSLETTER_RATE_LIMIT_MAX=5
NEWSLETTER_SOURCE_HASH_SECRET="a-long-random-secret-string"  # 未設定時自動產生 per-process 隨機密鑰

# 部署 replica 數（預設 1；大於 1 時必須改用共享 store，應用啟動會 fail fast）
APP_REPLICA_COUNT=1
```

> [!NOTE]
> 完整環境變數範例與詳細說明見 [.env.example](../.env.example) 的「Newsletter / reCAPTCHA v2」區塊。

### 3. Fail-Closed 行為

系統設計遵循「fail-closed」原則，保護讀者隱私並防止濫用：

- **三個 reCAPTCHA 環境變數缺一不可**：若 `RECAPTCHA_SECRET_KEY`、`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 或 `RECAPTCHA_ALLOWED_HOSTNAMES` 任一缺少，伺服器驗證一律不寫入資料庫、回傳泛化錯誤「系統發生錯誤，請稍後再試」。
- **CAPTCHA token 缺少/無效/過期**：一律視作驗證失敗，回傳 400 + 泛化訊息，不揭露具體失敗原因。
- **Google reCAPTCHA provider 逾時或 5xx 錯誤**：Google 驗證服務耗時超過 5 秒或回傳 5xx 時，伺服器不寫入資料庫、回傳 500 泛化錯誤。系統不會以「跳過驗證」作為降級策略，全部拒絕。
- **Hostname 不符 Google 後台設定**：即使 token 有效，若其 hostname 與 `RECAPTCHA_ALLOWED_HOSTNAMES` 不符，伺服器拒絕寫入、回傳泛化錯誤。
- **首次與重複訂閱回應相同**：無論 Email 是否已存在，伺服器均回傳相同成功訊息，防止 Email 列舉攻擊。

### 4. 訂閱專用限流

為防止濫用公開訂閱端點，系統實作 process-local 限流：

- **限流粒度**：依來源識別（HMAC-SHA256 雜湊，基於請求 IP 等訊息），每個時間視窗內允許最多 N 次訂閱請求。
- **預設設定**：視窗 600 秒、每視窗 5 次；可由 `NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS` 與 `NEWSLETTER_RATE_LIMIT_MAX` 調整。
- **限流回應**：超過限制回傳 429 Too Many Requests + `Retry-After` header，且在呼叫 Google 與資料庫之前即短路（無網路成本）。
- **限流位置**：Process-local 實作，僅適用單一 replica；`APP_REPLICA_COUNT > 1` 時應用啟動會直接 fail fast 拒絕啟動，水平擴展前必須先改用共享 store（例如 Redis）。
- **來源雜湊金鑰**：`NEWSLETTER_SOURCE_HASH_SECRET` 用於避免低熵輸入（如 IPv4）被預先計算雜湊反查；未設定時會自動產生 per-process 隨機密鑰。

> [!IMPORTANT]
> 系統**不記錄原始 IP**，限流邏輯內部使用雜湊後的來源識別；日誌中僅出現遮罩後的 Email 識別碼和請求結果，不洩露個人資訊。

### 5. 上線檢查清單（本版本所有變更）

本版本包含兩大功能群，上線需求不同：

- **讀者探索模組**（文章頁站內搜尋、近 30 日熱門文章、最新文章側欄與 raw 寬版文末卡片區）：**零設定**，部署新版程式即生效。熱門排行依既有 `PostViewEvent` 瀏覽事件計算，資料不足時自動以最新文章補位，無需任何環境變數或申請。
- **Newsletter 訂閱**（前台表單 + reCAPTCHA v2 + 後台名單）：需完成以下 **全部** 步驟才能正常運作，缺一即 fail closed（表單顯示不可用或送出失敗，但不影響其他功能）。

依序執行：

- [ ] **步驟 1 — 申請 reCAPTCHA v2 金鑰**：依[第 1 節](#1-申請-google-recaptcha-v2-金鑰)於 Google reCAPTCHA Admin Console 建立站點，取得 Site Key 與 Secret Key。這是唯一需要對外申請的項目。

- [ ] **步驟 2 — 設定伺服器 `.env`**：依[第 2 節](#2-環境變數設定)將三個必要變數（`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`、`RECAPTCHA_SECRET_KEY`、`RECAPTCHA_ALLOWED_HOSTNAMES`）寫入部署主機根目錄 `.env`；可選限流變數不設定則用預設值（600 秒 / 5 次）。

- [ ] **步驟 3 — 設定 GitHub Actions Secret（使用 CI 建置 image 時必要）**：`NEXT_PUBLIC_*` 是 **build-time** 變數，會在 `next build` 時內嵌進前端 bundle。若正式環境使用 GHCR 上由 CI（`docker-build.yml`）建置的 image，必須在 GitHub repo 的 **Settings → Secrets and variables → Actions** 新增 secret `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`（值為步驟 1 的 Site Key），CI 已將其帶入 build-args。**未設定此 secret 的舊 image，前台訂閱表單將永遠顯示不可用狀態，即使容器執行期環境變數正確。**

- [ ] **步驟 4 — 資料庫遷移**（additive，與舊版程式相容、可先行）：
   ```bash
   docker exec blog_app node node_modules/prisma/build/index.js migrate deploy
   ```
   建立 `Subscriber` table 與 email 唯一索引，不修改既有資料。

- [ ] **步驟 5 — RBAC 權限 `subscribers:view`**（後台訂閱者名單的存取權限，預設僅 ADMIN）：
   - **全新安裝**：首次啟動流程執行 `docker exec blog_app node scripts/init-admin.js` 即包含此權限，無需額外動作。
   - **既有環境升級（建議路徑，保留後台自訂的角色權限）**：直接對資料庫執行以下 SQL：
     ```bash
     docker exec -i blog_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> <<'SQL'
     INSERT INTO "Permission" ("key", "name") VALUES ('subscribers:view', '訂閱者名單')
     ON CONFLICT ("key") DO NOTHING;
     INSERT INTO "RolePermission" ("id", "roleId", "permissionKey")
     SELECT gen_random_uuid()::text, r."id", 'subscribers:view'
     FROM "Role" r WHERE r."key" = 'ADMIN'
     ON CONFLICT ("roleId", "permissionKey") DO NOTHING;
     INSERT INTO "PermissionVersion" ("id", "value", "updatedAt") VALUES ('global', 1, now())
     ON CONFLICT ("id") DO UPDATE SET "value" = "PermissionVersion"."value" + 1, "updatedAt" = now();
     SQL
     ```
     最後一段會遞增全域權限版本號，使已登入管理者的 JWT 權限快取自動失效並重新載入；若未執行，管理者需登出後重新登入才能看到新選單。
   - **替代路徑**：重新執行 `docker exec blog_app node scripts/init-admin.js`（新版已含此權限與版本號遞增）。**注意**：此腳本會將 ADMIN / EDITOR 的權限矩陣重設為預設值——若曾在後台「角色權限管理」自訂過角色設定，請改用上面的 SQL。

- [ ] **步驟 6 — 重建並部署新版應用**：
   ```bash
   docker-compose up -d --build   # 或 pull CI 建好的新版 image 後 docker-compose up -d
   ```
   > [!IMPORTANT]
   > 本機建置時必須用 `--build` 重新建置 image（site key 是 build-time 內嵌），只 `restart` 容器不會讓前端拿到新的 Site Key。

- [ ] **步驟 7 — 於 Staging 驗證 fail-closed 行為**（建議在正式上線前）：
   - 測試完整訂閱流程（成功、token 過期、缺設定等各個 fail-closed 路徑）
   - 確認應用日誌只記錄遮罩資訊，不洩露 token 或原始 IP

- [ ] **步驟 8 — 部署後驗證**：
   - 開啟任一篇文章頁：桌面版右側欄應依序出現「站內搜尋 → 訂閱 → 熱門文章 → 最新文章」；raw 寬版文章的探索卡片區位於內容之後
   - 實際完成一筆訂閱（勾選 reCAPTCHA），確認顯示泛化成功訊息且 Email 寫入資料庫
   - 檢查應用 log：`newsletter.subscribe.result` 事件應包含 requestId / emailHash 遮罩 / result，**無 token、無完整 Email、無原始 IP**
   - 以 ADMIN 登入後台 `/admin/subscribers`，確認能看見訂閱者名單、姓名/Email 搜尋與分頁正常
   - 以 EDITOR 或未登入身份確認無法存取 `/admin/subscribers` 與其 API

### 6. 回滾

若需要回滾或禁用訂閱功能，詳細步驟與注意事項見 [`runbooks/subscriber-rollback.md`](runbooks/subscriber-rollback.md)。概述如下：

- **階段 1（預設）**：停用前台訂閱表單與 `/api/newsletter/subscribe` 端點，回退應用版本。資料庫 `Subscriber` table 保留，舊版應用程式不查詢該表、不受影響。
- **階段 2（預設）**：保留 additive `Subscriber` table，不影響已回退的舊版程式，供日後重新上線使用。
- **階段 3（僅限已核准）**：完成備份與個資交接後，執行 drop-table 與 migration 歷史清理。

---

## ☁️ CDN 與 Storage 設定（選用）

> [!TIP]
> 使用 Cloudflare R2 + CDN 可達到**零流量成本**，推薦生產環境使用。

### Storage 類型

| 類型 | `NEXT_PUBLIC_UPLOAD_BASE_URL` | 說明 |
|------|-------------------------------|------|
| **Local Storage** | 不設定（使用相對路徑） | 圖片檔案存在容器內，透過 `/api/files/...` 存取 |
| **R2 + CDN** | `https://cdn.yourdomain.com` | 圖片存在 Cloudflare R2，透過 CDN 存取 |

### 快速設定 (R2)

1. **建立 R2 Bucket** - 在 Cloudflare Dashboard 建立
2. **建立 API Token** - 取得 Access Key 和 Endpoint
3. **設定公開存取** - 使用 Custom Domain 或 R2.dev
4. **設定環境變數**：

```env
STORAGE_PROVIDER=r2
STORAGE_BUCKET=lin-blog-uploads
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
NEXT_PUBLIC_UPLOAD_BASE_URL=https://uploads.yourdomain.com
```

📖 **完整設定步驟請參閱**：[CDN 與 Storage 架構指南](cdn-storage.md)

## 🧯 疑難排解（實戰踩雷紀錄）

以下為 2026-07-05 Linode 資源整併 + 上線時實際遇到並解決的問題，日後部署可對照。

### PR 卡在「一直檢查中」/ `BLOCKED`
必要 status check 名稱與 CI 矩陣不符（見上方 Branch Protection 段）。修正 ruleset 的
check 名為 4 個 Node 22 矩陣名即可。個人 repo 無人 approve 時 `gh pr merge <PR> --admin --merge`。

### `deploy.sh` 報 `network ... has active endpoints`
`docker-compose down` 移不掉網路，因為有**孤兒容器**（早期手動建立、缺 compose 標籤，
compose 認不得所以沒停它）仍連在網路上。復原：

```bash
docker rm -f blog_app                    # 移除孤兒容器
cd /var/www/products/lin_blog
docker-compose up -d --remove-orphans    # paul 在 docker group，docker 指令免 sudo
docker exec blog_app node node_modules/prisma/build/index.js migrate deploy
```
之後容器由 compose 建立、帶正確標籤，後續 `deploy.sh` 不再發生。

### DB 備份/還原報 `role "blog_user" does not exist`
本部署的實際 PostgreSQL 角色是 **`develop`**（非 `.env.example` 預設的 `blog_user`），
且以既有 volume 為準。**一律用容器內環境變數展開角色**，勿硬填：

```bash
docker exec blog_db sh -c 'exec pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backup.sql.gz
# 還原
gunzip -c backup.sql.gz | docker exec -i blog_db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
`scripts/backup-db.sh` 已內建此邏輯（自動偵測容器與角色）。

### 其他主機事實（正式機）
- 主機**僅安裝 `docker-compose` v1**（連字號），無 `docker compose` v2；所有指令用連字號版。
- 反向代理為**主機層 systemd nginx**（非容器），`apex linstar.win` 與 `nx.linstar.win`
  兩網域皆導向 lin_blog（`127.0.0.1:3100`）；後台登入走 `nx.linstar.win/admin`（`NEXTAUTH_URL`）。
- postgres 對外埠已綁 `127.0.0.1`（不曝露公網）。
- 每日 03:00 由 root cron 跑 `scripts/backup-db.sh` 自動備份；憑證由 certbot.timer 自動續期
  + `renewal-hooks/deploy/reload-nginx.sh` 續期後自動 reload nginx。
- 伺服器專屬細節（IP、機密、搬遷手冊）見 `docs/private/`（本機限定，未版控）。

## 🔗 延伸閱讀

- [CDN 與 Storage 架構指南](cdn-storage.md) - 流量成本優化與 CDN 設定
- [資料庫設定指南](database.md) - PostgreSQL 設定與維護
- [本地開發環境](development.md) - 開發環境設定
- [CHANGELOG.md](../CHANGELOG.md) - 版本變更紀錄，發布時需手動更新，也是 Release notes 的來源
