# Phase 2: 功能補齊 - 搜尋、分頁、RSS

## 1. 概述

本次變更專注於提升前台使用者體驗與內容可發現性：

1. **全站搜尋** - 讓讀者快速找到內容
2. **文章列表分頁** - 改善大量文章時的載入效能
3. **RSS Feed** - 讓讀者訂閱新文章

> ⚠️ **注意**：「文章排程發佈」因涉及後端 cron job 或外部服務，複雜度較高，移至 Phase 3 實作。

## 2. 變更詳情

### 2.1 全站搜尋

#### 需求
- 在導覽列提供搜尋入口
- 支援關鍵字搜尋標題、摘要
- 搜尋結果頁面顯示匹配文章

#### 技術方案
- **Simple Approach**: 使用 Prisma `contains` 查詢（適合小量資料）
- 未來可擴展為 PostgreSQL Full-Text Search 或 Elasticsearch

#### 新增/修改檔案
- `modules/posts/application/ports.ts` - 新增 `search()` 方法
- `modules/posts/infrastructure/prisma/post.repository.prisma.ts` - 實作搜尋
- `app/api/search/route.ts` - 搜尋 API
- `app/(frontend)/search/page.tsx` - 搜尋結果頁
- `components/navbar-client.tsx` - 新增搜尋輸入框

### 2.2 文章列表分頁

#### 需求
- Blog 列表頁支援分頁（每頁 10 篇）
- 顯示上/下一頁按鈕與頁碼
- 保持 category/tag 篩選同時分頁

#### 技術方案
- 使用 query parameter `?page=1`
- Repository 新增 `skip` / `take` 參數

#### 新增/修改檔案
- `modules/posts/application/ports.ts` - 更新 `listPublished` 支援分頁
- `modules/posts/application/use-cases.ts` - 新增分頁參數
- `app/(frontend)/blog/page.tsx` - 實作分頁 UI
- `components/pagination.tsx` - 分頁元件

### 2.3 RSS Feed

#### 需求
- 提供標準 RSS 2.0 feed（`/feed.xml`）
- 包含最新 20 篇文章

#### 技術方案
- 使用 Next.js Route Handler 動態生成 XML

#### 新增檔案
- `app/feed.xml/route.ts` - RSS 生成

## 3. API 規格

### GET /api/search
```typescript
// Query
{ q: string }

// Response
{
  success: true,
  data: Array<{
    slug: string;
    title: string;
    excerpt: string;
    coverImage: string | null;
    publishedAt: string;
  }>
}
```

### GET /api/posts (更新)
```typescript
// Query (新增)
{ page?: number; pageSize?: number; category?: string; tag?: string }

// Response (新增 pagination)
{
  success: true,
  data: PostRecord[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }
}
```

## 4. 驗證計畫

### 自動化測試
```bash
npm run test
```

新增測試：
- `tests/unit/posts.use-cases.test.ts` - 搜尋與分頁測試

### 建置驗證
```bash
npm run build
```

### 手動驗證
1. **搜尋功能**
   - 導覽列輸入關鍵字，按 Enter 進入搜尋頁
   - 搜尋結果顯示匹配文章
   - 無結果時顯示友善訊息

2. **分頁功能**
   - `/blog` 頁面顯示分頁控制
   - 點擊下一頁正確載入
   - 篩選分類同時保持分頁

3. **RSS Feed**
   - 訪問 `/feed.xml` 取得有效 RSS
   - 使用 RSS 閱讀器訂閱測試

## 5. 實作順序

1. 搜尋功能
   - 新增 Repository search 方法
   - 新增搜尋 API
   - 新增搜尋結果頁
   - 整合到導覽列

2. 分頁功能
   - 更新 Repository 支援分頁
   - 更新 Blog 頁面
   - 新增分頁元件

3. RSS Feed
   - 實作 Route Handler
