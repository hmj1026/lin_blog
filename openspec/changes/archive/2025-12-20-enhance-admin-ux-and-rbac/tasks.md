## 1. RBAC Configurable Permissions
- [x] 1.1 新增 Permission 定義與資料表（role -> permissions）。
- [x] 1.2 實作 `requirePermission()` 並更新現有 API/頁面權限檢查。
- [x] 1.3 Seed 預設矩陣：ADMIN 全開、EDITOR 僅文章/上傳/預覽、READER 無。

## 2. Role/Permission Admin UI
- [x] 2.1 新增 `/admin/roles`：角色權限矩陣編輯頁（僅 ADMIN）。
- [x] 2.2 新增對應 API：讀取/更新權限矩陣（僅 ADMIN）。

## 3. Editor UX
- [x] 3.1 TipTap 增加 HTML 模式切換與同步邏輯。

## 4. Admin Navigation UX
- [x] 4.1 AdminSidebar 移除「新增文章」連結。
- [x] 4.2 AdminSidebar/或 header 增加「開前台」新分頁連結。
- [x] 4.3 文章編輯頁加入「預覽」popup（draft 也可預覽）。

## 5. Frontend Auth UI
- [x] 5.1 Navbar 根據 session 顯示「後台」入口與登入資訊。
- [x] 5.2 提供前台登出（NextAuth signout）。

## 6. Verification
- [x] 6.1 單元測試/最小 smoke：permission check、editor 切換。
- [x] 6.2 手動驗證：角色權限調整後 API/頁面行為符合。
