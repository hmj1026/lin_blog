# CDN 與 Storage 架構指南

本文件說明如何設定 CDN 和 Storage 以降低流量成本。

## 流量成本說明

目前的 `/api/files/[id]` 路由設計會導致雙重流量成本：

```
用戶 → Next.js Server → Cloud Storage → Server → 用戶
             ↑              ↑
        Server 頻寬     Storage Egress
```

**優化後的架構**：

```
用戶 → CDN (快取) → Cloud Storage (公開讀取)
         ↑
   快取命中時免費
```

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

## CDN 設定方式

### Cloudflare R2 + CDN（推薦）

**優點**：免 Egress 費用

```env
STORAGE_PROVIDER=r2
STORAGE_BUCKET=your-bucket
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret

# 設定公開存取 URL
NEXT_PUBLIC_UPLOAD_BASE_URL=https://your-bucket.your-domain.com
```

**R2 設定步驟**：
1. 在 Cloudflare Dashboard 建立 R2 bucket
2. 設定 Custom Domain 或使用 R2.dev URL
3. 啟用公開存取

---

### Google Cloud Storage + Cloud CDN

```env
STORAGE_PROVIDER=gcs
STORAGE_BUCKET=your-bucket
GCS_PROJECT_ID=your-project
GCS_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

NEXT_PUBLIC_UPLOAD_BASE_URL=https://storage.googleapis.com/your-bucket
```

**GCS 設定步驟**：
1. 建立 GCS bucket
2. 設定 bucket 為公開讀取：`gsutil iam ch allUsers:objectViewer gs://your-bucket`
3. （選用）設定 Cloud CDN 加速

---

### AWS S3 + CloudFront

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret

NEXT_PUBLIC_UPLOAD_BASE_URL=https://dxxxxxxx.cloudfront.net
```

**S3 設定步驟**：
1. 建立 S3 bucket
2. 設定 Bucket Policy 允許公開讀取
3. 建立 CloudFront Distribution

---

## URL 重寫機制

設定 `NEXT_PUBLIC_UPLOAD_BASE_URL` 後，系統會自動將內容中的圖片 URL 重寫：

```
原始：/api/files/abc123
重寫：https://cdn.example.com/uploads/abc123.webp
```

此功能由 `src/lib/utils/content.ts` 的 `resolveUploadUrl()` 處理。

---

## 流量成本比較

| 方案 | 月流量 100GB 成本 |
|------|------------------|
| Server Proxy | ~$10-15 (Egress + Server) |
| R2 + CDN | ~$0 (免費） |
| GCS + CDN | ~$8 |
| S3 + CloudFront | ~$9 |

> [!TIP]
> **建議**：小型部落格使用 Cloudflare R2 + CDN 可達到零成本。
