## Why
目前後台/前台在可用性與權限控管上仍缺少幾個關鍵能力：
- 文章編輯需要像常見 CMS 一樣可切換「視覺編輯 / HTML 原始碼」以便排錯與進階調整。
- Admin 側邊欄的資訊架構需簡化（移除「新增文章」捷徑），並提供快速開前台入口。
- 角色與權限需要可在後台以列表方式編輯（不再寫死於程式碼），以便後續擴充與調整。
- 文章編輯需要「前台預覽」能力（含 draft/未發布），並可用 popup 查看呈現效果。
- 前台「後台」連結與登入資訊應依登入狀態顯示：登入管理者才看得到後台入口、可在前台登出並看到目前帳號與角色。

## What Changes
- Editor：
  - TipTap 編輯器新增「HTML 模式」切換，提供 textarea 直接編輯 HTML，切回視覺模式時同步內容。
- Admin UI：
  - 側邊欄移除「新增文章」，保留於文章列表頁的 CTA。
  - 新增「開前台」按鈕（新分頁）以及文章編輯頁「預覽」按鈕（popup）。
- RBAC：
  - 將權限檢查由硬編 `requireAdmin/requireEditorOrAdmin` 演進為可配置的 permission matrix（ADMIN 可編輯）。
  - 新增 `/admin/roles`（或 `/admin/permissions`）管理頁：角色列表與權限勾選矩陣。
- Frontend Auth UI：
  - 前台導覽列「後台」按鈕僅登入的 ADMIN/EDITOR 顯示。
  - 前台可顯示目前登入 email 與角色，並提供登出。

## Open Questions
1) 角色仍維持 `Role` enum（ADMIN/EDITOR/READER），僅提供「權限矩陣」可編輯；是否需要新增自訂角色（新增/刪除角色）？
2) 文章預覽是否需要支援「尚未儲存的新文章」？（若需要，需在前端先暫存並以草稿 API/暫存 key 預覽）

## Impact
- Affected code: admin pages/components, api auth helpers, new permission storage, frontend navbar.
