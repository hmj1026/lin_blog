# Lin Blog 權限與角色管理指南 (RBAC)

本文件詳細說明 Lin Blog 後台的權限架構、RBAC（Role-Based Access Control，基於角色的存取控制）模型、權限清單定義、相依關係以及安全原則。

---

## 1. 設計原則與安全邊界

Lin Blog 採用嚴格的後端權限控制，遵循以下原則：
- **最小權限原則 (Principle of Least Privilege)**：使用者僅擁有執行其工作所需的最小權限（例如：EDITOR 預設沒有訂閱者個資與系統設定權限）。
- **後端強制驗證 (Backend Enforcement)**：前端側邊欄與功能入口的隱藏僅作為「操作提示」，真正的安全邊界是由 **後端 API**、**Next.js 路由** 與 **Database 交易** 強制執行的 403 拒絕狀態。
- **自訂角色支援**：除了系統預設的 `ADMIN` 與 `EDITOR` 外，系統管理員可於後台自由建立自訂角色，並分配精細的權限組合。

---

## 2. 權限目錄清單 (Permissions Catalog)

系統目前定義了 12 個細粒度的權限，每個權限皆有其明確保護的範圍與對應的 API 路由：

| 權限鍵值 (Key) | 權限名稱 | 保護範圍與 API 路由 | 說明 |
| :--- | :--- | :--- | :--- |
| `admin:access` | **後台存取** | `/admin/*` 路由 | 進入後台管理介面與存取基本儀表板的通行證。所有後台操作權限皆相依於此權限。 |
| `posts:write` | **文章管理** | `/api/posts/*`, `/api/import-export/*` | 允許建立、編輯、發布文章與 About 頁面，以及執行文章批次匯入/匯出。 |
| `uploads:write` | **檔案上傳** | `/api/media/*`, `/api/files/*` | 允許將圖片/檔案上傳至媒體庫，以及在媒體庫執行刪除操作。 |
| `analytics:view` | **文章統計** | `/api/analytics/*` (彙總資料) | 查看部落格全站與單篇文章的瀏覽量、前期趨勢對比與流量來源佔比。 |
| `analytics:view_sensitive` | **統計敏感資料** | `/api/analytics/*` (原始日誌明細) | 查看包含造訪 IP、詳細瀏覽時間與 UserAgent 在內的原始造訪明細。IP 預設去識別化遮罩。 |
| `categories:manage` | **分類管理** | `/api/categories/*` | 建立、編輯、刪除分類，以及執行分類的「安全合併」。 |
| `tags:manage` | **標籤管理** | `/api/tags/*` | 建立、編輯、刪除標籤，以及執行標籤合併。 |
| `users:manage` | **使用者管理** | `/api/users/*` | 新增後台使用者、修改使用者資料、重設密碼與停用帳號。 |
| `roles:manage` | **角色權限管理** | `/api/roles/*` | 建立/刪除自訂角色、配置各角色的權限關聯矩陣。 |
| `settings:manage` | **站點設定** | `/api/site-settings/*` | 修改部落格名稱、SEO 描述、社交連結等全域站點配置。 |
| `subscribers:view` | **訂閱者名單** | `/api/subscribers/*` | 查看電子報訂閱者 Email 清單、訂閱時間，以及執行單筆 Email 複製。 |
| `audit:view` | **活動紀錄** | `/api/audit/*` | 存取系統高風險管理活動日誌，查詢「誰、在什麼時候、對什麼資源、做了什麼變更」。 |

---

## 3. 預設角色權限矩陣

系統內建三個核心角色，其預設權限配置如下：

| 權限鍵值 (Key) | 說明 | ADMIN (管理員) | EDITOR (編輯) | READER (讀者/唯讀) |
| :--- | :--- | :---: | :---: | :---: |
| `admin:access` | 後台存取 | ✓ | ✓ | ✓ |
| `posts:write` | 文章管理 | ✓ | ✓ | — |
| `uploads:write` | 檔案上傳 | ✓ | ✓ | — |
| `analytics:view` | 文章統計 | ✓ | ✓ | — |
| `analytics:view_sensitive` | 統計敏感資料 | ✓ | — | — |
| `categories:manage` | 分類管理 | ✓ | — | — |
| `tags:manage` | 標籤管理 | ✓ | — | — |
| `users:manage` | 使用者管理 | ✓ | — | — |
| `roles:manage` | 角色權限管理 | ✓ | — | — |
| `settings:manage` | 站點設定 | ✓ | — | — |
| `subscribers:view` | 訂閱者名單 | ✓ | — | — |
| `audit:view` | 活動紀錄 | ✓ | — | — |

*備註：`subscribers:view` 與 `analytics:view_sensitive` 涉及個資與敏感資訊，預設僅授予 `ADMIN`。*

---

## 4. 權限相依關係 (Permission Dependencies)

在配置角色權限時，系統會強制執行以下邏輯相依性：

1. **後台基本存取限制**：
   - 除了 `admin:access` 本身之外，所有的權限都相依於 `admin:access`。
   - **規則**：若要為角色啟用任何一項管理權限（如 `posts:write`），必須同時啟用 `admin:access`。在後台編輯角色權限時，若取消勾選 `admin:access`，系統會自動警告並阻擋儲存。
2. **統計敏感度分層**：
   - `analytics:view_sensitive`（原始日誌）相依於 `analytics:view`（彙總統計）。
   - **規則**：必須先擁有 `analytics:view`，才能勾選或使用 `analytics:view_sensitive` 權限。

---

## 5. 代碼實作與驗證機制

### A. Next.js 路由層保護 (Middleware)
在 `web/src/middleware.ts` 中，會解密 JWT Session 並進行路由過濾。如果使用者造訪 `/admin/*` 但其角色不具備 `admin:access`，Middleware 會直接返回 403 錯誤頁面，或跳轉至 `/login`。

### B. API 路由層保護 (`requirePermission`)
後台的 API 路由統一在進入控制器前進行權限校驗。範例如下：

```typescript
// web/src/app/api/posts/route.ts
import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";

export async function POST(request: Request) {
  // 驗證當前登入者是否具備 posts:write 權限
  const authError = await requirePermission("posts:write");
  if (authError) {
    return authError; // 直接回傳 403 Forbidden 響應
  }

  // 執行文章新增邏輯...
  return jsonOk({ success: true });
}
```

### C. 帳號安全不變式控制
為了防止系統因人為誤操作鎖死，後台在 `users` 與 `roles` 寫入時，由領域層 (Domain) 與應用層 (Application Use Cases) 強制檢驗不變式，不受前端 UI 限制繞過：
- **禁止自我停用**：API 檢測到更新的 `userId` 等於 session 的 `userId` 時，若 `status` 為停用則拋出錯誤。
- **最後管理者保護**：在更新使用者或變更角色權限時，若資料庫中 `role = ADMIN` 且 `status = ACTIVE` 的使用者僅剩 1 人，系統會阻擋將該使用者設為停用、修改其角色，或刪除其 `admin:access`/`users:manage` 權限。

---

## 6. 生產環境部署與資料庫遷移

- **初始權限佈建**：權限目錄的資料在 `web/prisma/seed.ts`（透過 `web/prisma/permission-catalog.ts` 提供定義）中定義，首次部署或重設資料庫時，執行 `npm run db:seed` 會冪等性地建立與更新這些權限資料。
- **既有系統遷移 (Migration)**：
  - 新增 `admin:access` 等新權限時，系統提供自動回填遷移檔（如 `20260721000000_backfill_admin_access_permission`）。
  - 在執行 `npx prisma migrate deploy` 時，遷移檔會以 SQL 原子操作自動將新權限插入 `Permission` 資料表，並將其與資料庫中所有現存角色（`Role`）進行關聯綁定，確保新權限上線後既有後台使用者不會被無預警鎖定。
