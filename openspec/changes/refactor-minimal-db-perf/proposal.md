## Why
目前 `Post` 列表查詢會一併載入 `Post.content`（長文字欄位），且 `PostViewEvent` 缺少以時間區間為主的索引，未來即使只保留「可看一年」選項也可能逐步造成查詢成本上升。

此提案以「最小必要調整」為目標：不改功能行為，優先降低不必要的資料傳輸與補上關鍵索引，同時保留未來升級到彙總表（反正規化）的空間。

## What Changes
- `Post` 列表相關讀取改為回傳摘要資料（不載入 `content`），詳情頁再讀取全文。
- `PostViewEvent` 增加以 `deletedAt/viewedAt` 為主的索引，支援一年區間查詢。
- 文件化未來升級路徑：當 events 量級上升時再新增 daily/hourly 彙總表。

## Impact
- Affected specs: `posts`, `analytics`, `content-db`
- Affected code:
  - `web/prisma/schema.prisma`
  - `web/src/modules/posts/**`
  - `web/src/modules/analytics/**`（僅索引支援，查詢行為不變）

