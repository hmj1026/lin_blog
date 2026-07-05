# Lin Blog API 文件

## 概述

所有 API 端點位於 `/api/` 路徑下。回應格式統一為：

```json
// 成功
{ "success": true, "data": { ... } }

// 失敗
{ "success": false, "message": "錯誤訊息" }
```

## 認證

需登入的 API 使用 NextAuth.js Session Cookie 認證。未授權請求回傳 `401`。

登入/登出/Session 交握由 NextAuth 內建路由處理：

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth 內建處理器（signin/signout/session/callback/csrf 等） | Public（依 NextAuth 內部流程，session 端點需已登入才回傳有效 session） |

---

## 文章 Posts

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/posts` | 取得已發布文章列表 | Public |
| POST | `/api/posts` | 新增文章 | `posts:write` |
| GET | `/api/posts/[id]` | 取得單篇文章（已發布為 Public；未發布需 `posts:write`，無權限一律回 404） | Public / `posts:write` |
| PUT | `/api/posts/[id]` | 更新文章（含版本快照） | `posts:write` |
| PATCH | `/api/posts/[id]` | 局部更新文章（目前僅支援切換 `featured`） | `posts:write` |
| DELETE | `/api/posts/[id]` | 刪除文章 | `posts:write` |
| POST | `/api/posts/batch` | 批次操作 | `posts:write` |
| GET | `/api/posts/export` | 匯出文章（JSON/Markdown） | `posts:write` |
| POST | `/api/posts/import` | 匯入文章 | `posts:write` |
| GET | `/api/posts/[id]/versions` | 取得版本歷史 | `posts:write` |
| GET | `/api/posts/[id]/versions/[vId]` | 取得特定版本 | `posts:write` |
| POST | `/api/posts/[id]/versions/[vId]` | 還原版本 | `posts:write` |

---

## 分類 Categories

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/categories` | 取得分類列表 | Public |
| POST | `/api/categories` | 新增分類 | `categories:manage` |
| PUT | `/api/categories/[id]` | 更新分類 | `categories:manage` |
| DELETE | `/api/categories/[id]` | 刪除分類 | `categories:manage` |

---

## 標籤 Tags

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/tags` | 取得標籤列表 | Public |
| POST | `/api/tags` | 新增標籤 | `tags:manage` |
| PUT | `/api/tags/[id]` | 更新標籤 | `tags:manage` |
| DELETE | `/api/tags/[id]` | 刪除標籤 | `tags:manage` |

---

## 媒體 Uploads

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/uploads` | 取得上傳列表 | `uploads:write` |
| POST | `/api/uploads` | 上傳檔案 | `uploads:write` |
| DELETE | `/api/uploads/[id]` | 刪除檔案 | `uploads:write` |
| GET | `/api/files/[id]` | 取得檔案內容（僅限 `visibility=PUBLIC` 的檔案，否則 403） | Public |
| POST | `/api/uploadthing` | UploadThing 供應商端點（尚未串接，目前為佔位實作，固定回傳 `501` 並提示需設定 `UPLOADTHING_TOKEN`） | Public（佔位） |

---

## 使用者 Users

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/users` | 取得使用者列表 | `users:manage` |
| POST | `/api/users` | 新增使用者 | `users:manage` |
| PUT | `/api/users/[id]` | 更新使用者 | `users:manage` |
| DELETE | `/api/users/[id]` | 刪除使用者 | `users:manage` |

---

## 角色 Roles

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/roles` | 取得角色列表 | `roles:manage` |
| POST | `/api/roles` | 新增角色 | `roles:manage` |
| PUT | `/api/roles/[id]` | 更新角色 | `roles:manage` |
| DELETE | `/api/roles/[id]` | 刪除角色 | `roles:manage` |

---

## 網站設定 Site Settings

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/site-settings` | 取得網站設定 | Public |
| PUT | `/api/site-settings` | 更新網站設定 | `settings:manage` |

---

## 分析 Analytics

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/analytics/views` | 記錄瀏覽事件（僅計入已發布且非預覽來源的文章） | Public |
| GET | `/api/analytics/stats` | 取得統計數據 | `analytics:view` |

---

## 預覽 Preview

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/preview?slug=...` | 啟用草稿預覽（設定 draft bypass cookie 後重導向至 `/blog/[slug]`，未帶 `slug` 則導向 `/blog`），使該瀏覽器繞過 ISR 快取看到草稿內容 | `posts:write`（無權限重導向至 `/login`） |
| GET | `/api/preview/disable` | 退出草稿預覽（清除 draft bypass cookie 後重導向至首頁） | Public |

---

## 其他

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/search` | 全站搜尋 | Public |
| GET | `/api/nav` | 取得導覽列分類 | Public |
| GET/POST | `/api/cron/publish-scheduled` | 發布排程文章（需帶 `Authorization: Bearer <CRON_SECRET>`；未設定 `CRON_SECRET` 一律拒絕） | Cron Secret |

---

## 錯誤碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 400 | 請求格式錯誤 |
| 401 | 未授權 |
| 403 | 無權限 |
| 404 | 資源不存在 |
| 429 | 請求過多（Rate Limit） |
| 500 | 伺服器錯誤 |
