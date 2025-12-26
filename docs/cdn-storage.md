# CDN 與 Storage 架構指南

本文件說明如何設定 CDN 和 Storage 以降低流量成本並提升存取速度。

## 目錄

- [流量成本說明](#流量成本說明)
- [圖片壓縮功能](#圖片壓縮功能)
- [Cloudflare R2 設定](#cloudflare-r2-設定)
- [Cloudflare CDN 設定](#cloudflare-cdn-設定)
- [其他 Storage 選項](#其他-storage-選項)

---

## 流量成本說明

### 未優化架構（成本高）

```
用戶 → Next.js Server → Cloud Storage → Server → 用戶
             ↑              ↑
        Server 頻寬     Storage Egress
```

每次請求都會產生雙重流量成本。

### 優化後架構（推薦）

```
用戶 → CDN (快取) → Cloud Storage (公開讀取)
         ↑
   快取命中時免費
```

| 方案 | 月流量 100GB 成本 |
|------|------------------|
| Server Proxy（未優化） | ~$10-15 |
| **R2 + CDN（推薦）** | **~$0** |
| GCS + CDN | ~$8 |
| S3 + CloudFront | ~$9 |

> [!TIP]
> **建議**：小型部落格使用 Cloudflare R2 + CDN 可達到零成本。

---

## 圖片壓縮功能

系統內建 Sharp 圖片壓縮，可有效降低檔案大小 50-80%。

### 環境變數

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `UPLOAD_IMAGE_COMPRESSION` | `true` | 啟用/停用圖片壓縮 |
| `UPLOAD_IMAGE_MAX_WIDTH` | `1920` | 圖片最大寬度 |
| `UPLOAD_IMAGE_QUALITY` | `85` | 壓縮品質 (1-100) |

### 處理流程

1. 上傳圖片 (JPEG/PNG/WebP)
2. 自動調整尺寸（不放大）
3. 轉換為 WebP 格式
4. 儲存到 Storage

---

## Cloudflare R2 設定

> [!TIP]
> R2 是 Cloudflare 提供的 S3 相容物件儲存，**免 Egress 費用**，適合存放部落格圖片。

### 1. 建立 R2 Bucket

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 選擇您的帳號 → 左側選單點擊 **R2 Object Storage**
3. 點擊 **Create bucket**
4. 設定：
   - **Bucket name**: `lin-blog-uploads`（或自訂名稱）
   - **Location**: 選擇接近您伺服器的區域（如 APAC）
5. 點擊 **Create bucket**

### 2. 建立 API Token

1. 在 R2 頁面，點擊 **Manage R2 API Tokens**
2. 點擊 **Create API token**
3. 設定：
   - **Token name**: `lin-blog-upload`
   - **Permissions**: 選擇 **Object Read & Write**
   - **Specify bucket(s)**: 選擇剛建立的 bucket
   - **TTL**: 選擇 Forever 或適當期限
4. 點擊 **Create API Token**
5. **重要**：複製以下資訊（只會顯示一次）
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL**（格式：`https://<account-id>.r2.cloudflarestorage.com`）

### 3. 設定公開存取

有兩種方式讓用戶可以直接存取 R2 中的檔案：

#### 方式一：使用 R2.dev 子網域（簡單，適合測試）

1. 進入 bucket → 點擊 **Settings** 標籤
2. 找到 **Public access** 區塊
3. 在 **R2.dev subdomain** 下點擊 **Allow Access**
4. 確認後，複製產生的 URL（格式：`https://pub-xxx.r2.dev`）

> [!WARNING]
> R2.dev 網域由 Cloudflare 控制，無法使用快取規則。建議生產環境使用 Custom Domain。

#### 方式二：使用 Custom Domain（推薦，生產環境）

1. 進入 bucket → 點擊 **Settings** 標籤
2. 找到 **Custom Domains** 區塊
3. 點擊 **Connect Domain**
4. 輸入您的子網域（需要是已在 Cloudflare 上的網域）
   - 例如：`uploads.yourdomain.com`
5. 點擊 **Continue** → Cloudflare 會自動設定 DNS 記錄
6. 等待 SSL 憑證生效（通常幾分鐘內）

### 4. 設定環境變數

在伺服器的 `.env` 檔案中新增：

```env
# ===== Storage 設定 =====
STORAGE_PROVIDER=r2
STORAGE_BUCKET=lin-blog-uploads
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key

# 公開存取 URL（使用 Custom Domain 或 R2.dev）
NEXT_PUBLIC_UPLOAD_BASE_URL=https://uploads.yourdomain.com
```

### 5. 驗證設定

```bash
# 重啟容器套用新設定
docker-compose down && docker-compose up -d

# 查看日誌確認無錯誤
docker logs blog_app | grep -i storage

# 確認 Storage 類型
docker exec blog_app printenv STORAGE_PROVIDER
```

在管理後台上傳一張測試圖片，確認：
- ✅ 圖片成功上傳（無錯誤訊息）
- ✅ 圖片 URL 指向您的公開網址
- ✅ 可以直接在瀏覽器開啟圖片

### R2 費用說明

| 項目 | 免費額度（每月） | 超出費用 |
|------|-----------------|---------|
| 儲存空間 | 10 GB | $0.015/GB |
| Class A 操作（寫入） | 100 萬次 | $4.50/百萬次 |
| Class B 操作（讀取） | 1000 萬次 | $0.36/百萬次 |
| **Egress（出站流量）** | **無限制** | **$0（免費）** |

> [!NOTE]
> 一般部落格每月上傳幾十張圖片、幾千次瀏覽，完全在免費額度內。

---

## Cloudflare CDN 設定

如果您的網域已經託管在 Cloudflare，預設就已經啟用 CDN。以下是優化設定：

### 1. 確認 Proxy 狀態

1. 前往 Cloudflare Dashboard → 選擇您的網域
2. 點擊 **DNS** → **Records**
3. 確認您網站的 A/CNAME 記錄旁邊的雲朵是**橘色**（已啟用 Proxy）

```
Type    Name              Content           Proxy
A       blog              123.456.789.0     ☁️ Proxied
CNAME   uploads           xxx.r2.dev        ☁️ Proxied
```

### 2. 設定快取規則

1. 前往 **Caching** → **Cache Rules**
2. 點擊 **Create rule**
3. 設定規則：

**規則 1：快取所有上傳檔案**

```
Rule name: Cache uploads
When: URI Path starts with "/uploads"
Then: 
  - Cache eligibility: Eligible for cache
  - Edge TTL: Override - 1 month
  - Browser TTL: Override - 1 week
```

**規則 2：快取 R2 Custom Domain**

如果使用 Custom Domain（如 `uploads.yourdomain.com`）：

```
Rule name: Cache R2 uploads
When: Hostname equals "uploads.yourdomain.com"
Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: Override - 1 year
  - Browser TTL: Override - 1 month
```

### 3. 設定 Page Rules（舊版替代方案）

如果沒有 Cache Rules 功能，可以使用 Page Rules：

1. 前往 **Rules** → **Page Rules**
2. 點擊 **Create Page Rule**
3. 設定：
   - **URL**: `uploads.yourdomain.com/*`
   - **Cache Level**: Cache Everything
   - **Edge Cache TTL**: a month
   - **Browser Cache TTL**: a week

### 4. 啟用額外優化

前往 **Speed** → **Optimization**：

| 設定 | 建議值 | 說明 |
|------|--------|------|
| Auto Minify | 勾選 JS, CSS, HTML | 自動壓縮程式碼 |
| Brotli | On | 更好的壓縮演算法 |
| Early Hints | On | 預載資源 |
| Rocket Loader | 視情況 | 可能影響某些 JS |

前往 **Speed** → **Image Optimization**（需付費方案）：

| 設定 | 說明 |
|------|------|
| Polish | 自動壓縮圖片 |
| Mirage | 延遲載入圖片 |
| WebP | 自動轉換格式 |

### 5. 驗證 CDN 運作

```bash
# 檢查回應標頭
curl -I https://uploads.yourdomain.com/test-image.webp

# 確認有以下標頭
# cf-cache-status: HIT    ← 表示從 CDN 快取回應
# cf-ray: xxx             ← Cloudflare 請求 ID
```

快取狀態說明：
- `HIT` - 從 CDN 快取回應（最佳）
- `MISS` - 首次請求，從源站取得
- `EXPIRED` - 快取過期，重新驗證
- `BYPASS` - 繞過快取

---

## 其他 Storage 選項

### AWS S3 + CloudFront

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret

NEXT_PUBLIC_UPLOAD_BASE_URL=https://dxxxxxxx.cloudfront.net
```

**設定步驟**：
1. 建立 S3 bucket
2. 設定 Bucket Policy 允許公開讀取
3. 建立 CloudFront Distribution，Origin 指向 S3

### Google Cloud Storage + Cloud CDN

```env
STORAGE_PROVIDER=gcs
STORAGE_BUCKET=your-bucket
GCS_PROJECT_ID=your-project
GCS_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

NEXT_PUBLIC_UPLOAD_BASE_URL=https://storage.googleapis.com/your-bucket
```

**設定步驟**：
1. 建立 GCS bucket
2. 設定公開讀取：`gsutil iam ch allUsers:objectViewer gs://your-bucket`
3. （選用）設定 Cloud CDN 加速

---

## URL 重寫機制

設定 `NEXT_PUBLIC_UPLOAD_BASE_URL` 後，系統會自動重寫內容中的圖片 URL：

```
原始：/api/files/abc123
重寫：https://uploads.yourdomain.com/uploads/abc123.webp
```

此功能由 `src/lib/utils/content.ts` 的 `resolveUploadUrl()` 處理。

---

## 排錯指南

### 圖片上傳失敗

```bash
# 檢查環境變數
docker exec blog_app printenv | grep STORAGE

# 檢查日誌
docker logs blog_app 2>&1 | grep -i "storage\|upload\|error"
```

常見原因：
- Access Key 或 Secret 錯誤
- Bucket 名稱不符
- Endpoint URL 格式錯誤

### 圖片無法公開存取

1. 確認 R2 bucket 已啟用公開存取
2. 確認 Custom Domain 的 DNS 記錄正確
3. 確認 `NEXT_PUBLIC_UPLOAD_BASE_URL` 設定正確

### CDN 快取未生效

```bash
# 檢查快取狀態
curl -I https://your-url/image.webp | grep cf-cache-status

# 清除快取
# Cloudflare Dashboard → Caching → Purge Cache
```
