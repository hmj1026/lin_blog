# admin-editor Specification

## Purpose
定義後台文章 WYSIWYG 編輯器的需求，包括輸出 HTML 內容、以相對路徑插入圖片，以及伺服器端對編輯內容進行 HTML 消毒的安全機制。
## Requirements
### Requirement: Admin WYSIWYG Editor Outputs HTML
系統 SHALL 在後台提供 WYSIWYG 編輯器，並以 HTML 字串輸出存入 `Post.content`。

#### Scenario: Admin saves HTML content
- **GIVEN** 管理員在後台編輯文章內容
- **WHEN** 送出儲存
- **THEN** API 收到並儲存 HTML 字串到 DB `Post.content`

### Requirement: Image Insert With Relative Paths
系統 SHALL 讓視覺編輯器與原始 HTML 文章撰寫模式共用既有圖片上傳能力。上傳成功後 SHALL 以相對路徑
表示圖片；視覺模式將圖片插入編輯器，原始 HTML 模式則 SHALL 提供替代文字、複製相對 URL、複製
`<img>` 片段與插入目前 textarea 游標位置的操作。

#### Scenario: Visual editor insert produces relative src
- **GIVEN** 管理員使用視覺編輯器
- **WHEN** 管理員上傳圖片並插入內容
- **THEN** 文章 HTML 內的 `<img src>` SHALL 使用 `/api/files/<id>` 形式的相對路徑
- **AND** 圖片 SHALL 插入目前的視覺內容

#### Scenario: Raw HTML insert produces accessible img fragment
- **GIVEN** 管理員使用原始 HTML 撰寫模式並在 textarea 中放置游標
- **WHEN** 管理員上傳圖片、輸入替代文字並選擇插入
- **THEN** 系統 SHALL 在目前 selection range 插入包含相對 `src` 與 escaped `alt` 的 `<img>` 片段
- **AND** 插入後 SHALL 恢復 textarea 焦點與可預期的游標位置

#### Scenario: Raw HTML author can copy relative URL
- **GIVEN** 圖片已成功上傳
- **WHEN** 原始 HTML 作者選擇複製圖片 URL
- **THEN** 剪貼簿內容 SHALL 為 `/api/files/<id>` 相對 URL

#### Scenario: Raw HTML author can copy img fragment
- **GIVEN** 圖片已成功上傳且作者已提供替代文字
- **WHEN** 原始 HTML 作者選擇複製 HTML
- **THEN** 剪貼簿內容 SHALL 為包含相對 URL 與 escaped 替代文字的 `<img>` 片段

#### Scenario: Upload failure does not mutate content
- **GIVEN** 管理員在任一文章撰寫模式上傳圖片
- **WHEN** 上傳、裁切或插入流程失敗
- **THEN** 系統 SHALL 顯示可辨識的錯誤訊息
- **AND** SHALL NOT 修改目前文章內容

### Requirement: Server-side HTML Sanitization
系統 SHALL 在寫入 DB 前對 HTML 做 sanitize，以降低 XSS 風險。當文章的 `allowRawHtml` 為 `true` 時，
系統 SHALL 改用寬鬆消毒規則（允許 `class`/`style`/`<style>` 等），但仍必須移除 `<script>`、`on*` 事件
屬性與危險 CSS 構造；當 `allowRawHtml` 為 `false`（預設）時，行為與現行嚴格消毒規則完全相同。

#### Scenario: Dangerous HTML is sanitized on save
- **GIVEN** 內容包含 `<script>` 或事件屬性
- **WHEN** API 嘗試儲存內容
- **THEN** 危險內容被移除/清理後才寫入 DB

#### Scenario: Raw HTML mode preserves custom styling while still stripping scripts
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，內容包含 `class`、`style` 屬性、`<style>` 標籤，以及
  `<script>` 或事件屬性
- **WHEN** API 嘗試儲存內容
- **THEN** `class`/`style`/`<style>` 被保留，但 `<script>` 與事件屬性仍被移除

