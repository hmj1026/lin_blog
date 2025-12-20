## 1. Proposal Confirmation
- [x] 1.1 確認 IP/UA 權限：新增 `analytics:view_sensitive`，僅 ADMIN 可看事件明細與敏感欄位。
- [x] 1.2 確認篩選條件：IP 支援 equals + contains；UA/referrer 為 contains；deviceType 精確比對；時間為 from/to + days 快捷。

## 2. Analytics DDD Module (Phase 2)
- [x] 2.1 建立 `web/src/modules/analytics`（application ports/use cases + prisma repositories）。
- [x] 2.2 將「文章統計彙總」查詢抽到 repository/use case。
- [x] 2.3 新增「事件明細查詢」use case（支援 where 條件 + 分頁 + total count）。

## 3. Admin UI
- [x] 3.1 更新 `/admin/analytics/posts`：改用 analytics use case；增加「查看事件」連結。
- [x] 3.2 新增 `/admin/analytics/posts/[postId]`：顯示文章資訊 + 事件列表 + 篩選表單 + 分頁。
- [x] 3.3 UI 顯示長字串（UA/referrer）需 truncate + tooltip/可展開。

## 4. Tests
- [x] 4.1 Use case 單元測試：filters → repository call、分頁參數與安全邊界（pageSize 上限）。
- [x] 4.2 既有測試全數通過（`npm test`）。

## 5. Verification
- [x] 5.1 事件明細可依條件篩選與分頁，且顯示 UA/IP。
- [x] 5.2 權限不足者無法進入 analytics 頁面。
