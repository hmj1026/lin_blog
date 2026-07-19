/**
 * 權限目錄與角色矩陣的純資料定義（不含任何 Prisma/DB 呼叫）。
 *
 * 從 `seed.ts` 抽出，讓權限目錄與角色矩陣可在不連線資料庫的情況下被單元測試涵蓋，
 * `seed.ts` 的 `main()` 仍是唯一的執行/寫入進入點，這裡只提供資料。
 *
 * 修改本清單時，須同步更新 web/scripts/init-admin.js（production 容器內的 plain-JS bootstrap）。
 */

export type PermissionDefinition = { key: string; name: string };

/** 全站權限目錄；ADMIN 角色預設取得此清單的全部權限。 */
export const PERMISSIONS: PermissionDefinition[] = [
  { key: "admin:access", name: "後台存取" },
  { key: "posts:write", name: "文章管理" },
  { key: "uploads:write", name: "檔案上傳" },
  { key: "analytics:view", name: "文章統計" },
  { key: "analytics:view_sensitive", name: "文章統計（IP/UA）" },
  { key: "categories:manage", name: "分類管理" },
  { key: "tags:manage", name: "標籤管理" },
  { key: "users:manage", name: "使用者管理" },
  { key: "roles:manage", name: "角色權限管理" },
  { key: "settings:manage", name: "站點設定" },
  { key: "subscribers:view", name: "訂閱者名單" },
  { key: "audit:view", name: "活動紀錄" },
];

/**
 * EDITOR 角色預設授予的權限鍵值（明確白名單）。
 *
 * `subscribers:view` 刻意不在此清單中：訂閱者含個資，預設僅 ADMIN 可讀。
 */
export const EDITOR_PERMISSION_KEYS: readonly string[] = Object.freeze([
  "admin:access",
  "posts:write",
  "uploads:write",
  "analytics:view",
]);
