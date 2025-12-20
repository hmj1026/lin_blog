# security-admin Specification

## Purpose
TBD - created by archiving change secure-storage-soft-delete-rbac. Update Purpose after archive.
## Requirements
### Requirement: Role-Based Access Control
系統 SHALL 依角色（ADMIN/EDITOR/READER）限制後台與 API 的操作權限。

#### Scenario: Editor cannot manage users
- **GIVEN** 使用者角色為 EDITOR
- **WHEN** 嘗試存取使用者管理的修改型 API
- **THEN** 系統拒絕存取

### Requirement: Soft Delete For Core Resources
系統 SHALL 對指定資源採用軟刪除機制，刪除時不移除資料而是標記 `deletedAt`。

#### Scenario: Deleted category not shown in lists
- **WHEN** 分類被刪除（soft delete）
- **THEN** 前台/後台列表預設不顯示該分類

### Requirement: Private Storage For Uploads
系統 SHALL 將上傳檔案存放於非公開目錄，並僅透過受控端點輸出，以避免以 URL 直接存取原始檔案路徑。

#### Scenario: Upload cannot be accessed via direct public path
- **GIVEN** 檔案已上傳到 storage
- **WHEN** 使用者嘗試用 `public/` 路徑直接存取
- **THEN** 無法取得檔案內容

#### Scenario: Image is delivered via controlled endpoint
- **WHEN** 前台渲染文章內容圖片
- **THEN** 圖片來源為受控端點（例如 `/api/files/<id>`）並成功顯示

