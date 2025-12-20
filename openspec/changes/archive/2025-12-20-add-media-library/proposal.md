## Why

媒體庫管理讓使用者集中管理上傳的圖片和檔案：
- 一覽所有已上傳的媒體
- 方便在文章中重複使用
- 刪除不再需要的檔案

## What Changes

### 後台功能
- **媒體列表頁面**：顯示所有上傳的圖片/檔案
- **媒體預覽**：圖片縮圖、檔案資訊
- **媒體刪除**：移除不需要的檔案
- **媒體搜尋**：搜尋檔案名稱

## Impact

- **Affected specs**: media
- **Affected code**:
  - `app/(admin)/admin/media/` - 媒體庫頁面
  - `app/api/uploads/` - 擴展上傳 API
