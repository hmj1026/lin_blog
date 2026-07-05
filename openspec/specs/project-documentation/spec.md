# project-documentation Specification

## Purpose
定義專案文件完整性的需求，涵蓋環境變數範例（`web/.env.example` 與 Zod schema 對齊）、OpenSpec 規格 Purpose 完整性（無 `TBD` 佔位）、公開 API 端點文件（`docs/api.md`）與貢獻指南（`CONTRIBUTING.md`），確保開發者與貢獻者能依循一致且與程式碼同步的文件進行開發。

## Requirements
### Requirement: Environment Variable Example File
專案 SHALL 提供 `web/.env.example`，列舉所有必要與選用的環境變數（含名稱與用途註解），且其涵蓋範圍與 `web/src/env.ts`／`env.public.ts`／`env.auth.ts` 的 Zod schema 保持一致。

#### Scenario: Example file enumerates all validated variables
- **GIVEN** 伺服器端環境變數由 `env.ts` 的 Zod schema 驗證
- **WHEN** 開發者檢視 `web/.env.example`
- **THEN** schema 中所有必要變數皆在範例檔中出現，且標示為必要或選用

#### Scenario: New required variable is reflected in example
- **GIVEN** 有新的必要環境變數被加入 Zod schema（例如 `CRON_SECRET`、storage 相關變數）
- **WHEN** 該變更完成
- **THEN** `web/.env.example` 同步新增對應條目

### Requirement: Specification Purpose Completeness
所有 `openspec/specs/*/spec.md` SHALL 具備非 `TBD` 的 Purpose 描述，說明該 capability 的職責範圍。

#### Scenario: No spec retains a TBD purpose
- **WHEN** 檢視 `openspec/specs/` 下任一 capability 的 `spec.md`
- **THEN** 其 Purpose 區塊為具體描述，且不含 `TBD` 佔位字樣

### Requirement: Public API Endpoint Documentation
專案 SHALL 提供 `docs/api.md`，記錄所有公開 API 端點，包含路徑、方法、所需權限、請求／回應格式。

#### Scenario: Documented endpoint set matches implemented routes
- **GIVEN** `web/src/app/api/` 下的公開路由
- **WHEN** 開發者查閱 `docs/api.md`
- **THEN** 每個公開端點皆有對應條目，載明方法、權限需求與請求／回應格式

### Requirement: Contribution Guide
專案 SHALL 提供 `CONTRIBUTING.md`，說明開發流程、分支與 PR 規範、commit 訊息規範。

#### Scenario: Contributor can follow documented workflow
- **WHEN** 新貢獻者開啟 `CONTRIBUTING.md`
- **THEN** 文件載明本機開發流程、PR 提交規範與 commit 訊息慣例，且文件間連結有效
