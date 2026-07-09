# Changelog

All notable changes to this project will be documented in this file.

## 1.3.2 — 2026-07-09 — 強化 Rich HTML 偵測與 Sanitizer 修正

本版本主要強化後台 WYSIWYG 編輯器在一般模式下被剝除自訂樣式時的風險警示，並修正 CSS `behavior:` 消毒時誤判 `scroll-behavior` 的問題。

### 新增功能 (feat)
- **view**: 後台文章編輯表單在一般模式偵測到 Rich HTML 時顯示警告橫幅與提供切換原始 HTML 的選項
- **post**: 支援在匯入文章的 Use Case 中識別與保留 `allowRawHtml` 屬性
- **infra**: 新增 `detectStrippedRichHtml` 輔助工具以判斷內容是否含有將被 WYSIWYG sanitizer 剝除的結構或 inline style

### 問題修復 (fix)
- **infra**: 修正 `stripDangerousCss` 中對 `behavior:` 的清理邏輯，確保保留現代瀏覽器支援的 `scroll-behavior` 屬性
