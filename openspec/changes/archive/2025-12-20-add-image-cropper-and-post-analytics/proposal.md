## Why
目前後台上傳圖片（封面/內文）只做尺寸提醒，缺少「讓圖片符合版面比例」的工具；同時缺少文章點擊/瀏覽的統計資料，無法在儀表板與分析頁呈現文章熱度。

## What Changes
- 圖片上傳強化（封面優先）：
  - 加入圖片裁切/縮放 UI（上傳前在瀏覽器端處理），提供固定比例（例如 1200×630 / 16:9 / 1:1）與自由裁切。
  - 產生裁切後的圖片 blob 上傳到現有私有 storage（`/api/uploads` → `storage/` → `/api/files/<id>`）。
  - 保留「微調」能力：可調整裁切框、縮放、（可選）旋轉；可重新編輯/重新上傳。
- Admin Sidebar/狀態：
  - 修正「儀表板永遠顯示 active」的狀態判斷（`/admin` 不應覆蓋所有子路徑）。
- 文章瀏覽統計（熱度分析）：
  - 前台文章頁在 render 後送出「view event」到受控 API（僅計算公開/允許的瀏覽）。
  - DB 儲存 view event（含時間、slug/postId、user agent、referer、裝置資訊、ip）。
  - 後台儀表板增加統計卡（總瀏覽、近 7 天、熱門文章 Top N）。
  - 新增 `/admin/analytics/posts`（或等價）頁面：文章熱度分析（列表 + 篩選 + 排序 + 期間）。

## Selection Rationale (Image Cropper)
預設選用常見開源裁切 UI（MIT）並在前端用 Canvas 輸出裁切後圖片：
- `react-easy-crop`：採用率高、API 精簡、適合「固定比例 + 微調」。
（替代方案：`cropperjs` / `react-cropper`，功能更全但相對重。）

## Security / Privacy Notes
- IP 與 UA 屬個資/敏感資料：需要定義保存策略（保存期限、是否 hash/truncate、是否排除內部/管理者流量）。
- 需避免「預覽」與管理者行為污染統計（可標記 `source=preview/admin` 或直接不計）。

## Open Questions (Need Confirmation)
1) IP 要「原文保存」還是「hash/truncate」？保存多久？（預設建議：hash + 90 天）
2) 需要排除 bot/爬蟲嗎？（預設：簡單 UA 黑名單 + 只計算有 JS 的事件）
3) 統計的定義：同一 IP/同一裝置在 X 分鐘內重複瀏覽要不要去重？（預設：30 分鐘去重）
4) Analytics 頁面哪些角色可看？（預設：ADMIN + EDITOR 可看；只有有對應 permission 才可用）

## Impact
- Affected code: `web/src/components/admin/post-form.tsx`, `web/src/components/admin/tiptap-editor.tsx`, `web/src/app/(frontend)/blog/[slug]/*`, admin dashboard, new analytics models/services/routes.
