## ADDED Requirements

### Requirement: Admin WYSIWYG Editor Outputs HTML
系統 SHALL 在後台提供 WYSIWYG 編輯器，並以 HTML 字串輸出存入 `Post.content`。

#### Scenario: Admin saves HTML content
- **GIVEN** 管理員在後台編輯文章內容
- **WHEN** 送出儲存
- **THEN** API 收到並儲存 HTML 字串到 DB `Post.content`

### Requirement: Image Insert With Relative Paths
系統 SHALL 支援在編輯器插入圖片，上傳後以相對路徑寫入 HTML 內容中。

#### Scenario: Insert image produces relative src
- **WHEN** 管理員上傳圖片並插入內容
- **THEN** 文章 HTML 內的 `<img src>` 以相對路徑呈現

### Requirement: Server-side HTML Sanitization
系統 SHALL 在寫入 DB 前對 HTML 做 sanitize，以降低 XSS 風險。

#### Scenario: Dangerous HTML is sanitized on save
- **GIVEN** 內容包含 `<script>` 或事件屬性
- **WHEN** API 嘗試儲存內容
- **THEN** 危險內容被移除/清理後才寫入 DB
