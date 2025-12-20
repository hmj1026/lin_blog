## 1. RBAC
- [x] 1.1 定義角色能力矩陣（ADMIN/EDITOR/READER）。
- [x] 1.2 實作 `requireRole/requirePermission` 並套用於 mutation API 與 admin routes。

## 2. Soft Delete
- [x] 2.1 Prisma schema 加入 `deletedAt` 欄位（涵蓋確認的資源）。
- [x] 2.2 更新 services：list/detail 預設排除 deleted。
- [x] 2.3 更新 DELETE API：改為 soft delete；必要時提供 restore（可選）。

## 3. Secure Storage
- [x] 3.1 新增 `Upload` model 與 storage 寫檔路徑。
- [x] 3.2 `POST /api/uploads` 寫入 storage 並回傳 `uploadId`。
- [x] 3.3 `GET /api/files/[id]` 串流輸出（依 visibility/權限）。
- [x] 3.4 更新 TipTap 圖片插入與封面上傳：改用 uploadId/src。
- [x] 3.5 更新前台圖片 URL 組合與內容 rewrite：支援 uploadId/src。

## 4. Verification
- [x] 4.1 單元測試：RBAC/soft delete/檔案路由基本行為。
- [x] 4.2 手動驗證：上傳圖片不在 public、無法用檔案路徑直接取、文章與封面正常顯示。
