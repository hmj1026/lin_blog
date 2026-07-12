# Reader Discovery Review Remediation Design

## 目標

修正 `add-reader-discovery-and-subscriptions` 對抗式審查發現的 correctness 與驗證證據問題，並讓 OpenSpec 記錄忠實反映實際核准時序與測試結果。本輪不擴張 Newsletter 資料模型，也不新增 `consentAt`、double opt-in、退訂、匯出、刪除或群發功能。

## 已核准決策

- 保留「實作前未取得人工核准」的歷史事實，不倒填或偽造核准紀錄。
- 以 2026-07-11 使用者明確指示記錄事後 acceptance／waiver，接受既有五項產品決策：30 日熱門與 fallback、標題／摘要搜尋、raw 文末 discovery、目前訂閱生命週期，以及每來源 10 分鐘 5 次限流。
- 本輪不新增明示同意欄位；若日後法規或隱私政策要求 `consentAt`／版本欄位，另開 OpenSpec change。

## 實作設計

### 1. Discovery 時間快照

擴充 `DiscoveryPostsPort.listLatestPublished`，要求呼叫端傳入 `asOf`。`listPopularPosts` 將同一個 `now` 同時傳給熱門查詢與 latest fallback，Prisma adapter 只使用 `asOf` 套用公開時間條件，避免單一 use case 內出現兩個牆鐘快照。

先新增失敗測試：建立一篇發佈時間晚於注入 `now`、但早於實際牆鐘的文章，確認熱門 fallback 不得回傳。測試失敗後才修改 port、use case 與 adapter。

### 2. 搜尋頁碼解析

頁面與 API 共用一個嚴格 page query parser，只接受完整的十進位正整數字串；小數、尾隨字元、指數、零與負數都回到第 1 頁。先新增 API／純函式失敗測試，再以最小共用實作取代兩份 `parseInt`。

### 3. OpenSpec 與驗證證據

- 將 10.8 改寫為「記錄實作前缺失與事後 acceptance／waiver」，保留原始時序事實並完成該 gate。
- 修正 Newsletter rate-limit scenario 的文字，使順序明確為 schema validation → limiter → CAPTCHA。
- 10.1 不再宣稱無證據的 changed-lines 80%；改採可重現且與專案實際門檻一致的 coverage 證據，或保持未完成直到產生足夠證據。
- 10.5 僅在固定 HEAD 的完整 E2E 結果沒有 failure，且每個 skip／did-not-run 都有明確分類後才完成；不得用 exit code 取代執行數核對。

### 4. E2E 穩定性

先重跑與本 change 直接相關的 discovery、newsletter、admin-subscribers suites，區分產品失敗、fixture 問題與既有全域 login／iframe flake。任何修改皆先以可重現的失敗測試為起點；不以增加 retry、延長 timeout 或新增 skip 作為修正。

完整 E2E 最終必須 exit 0。既有明確標記且與本 change 無關的靜態 skip 可保留，但驗證紀錄必須逐項揭露；因前置失敗造成的 did-not-run 不視為通過。

## 驗證順序

1. 聚焦 RED／GREEN 測試：時間快照與嚴格頁碼。
2. `npm run check`。
3. `npm test` 與 coverage。
4. `npm run test:integration`。
5. `npm run build`。
6. 受影響 E2E suites。
7. 完整 `npm run test:e2e`。
8. `openspec validate add-reader-discovery-and-subscriptions --strict --json --no-interactive`。

## 完成標準

- 排程未到文章不會經熱門 fallback 提前公開。
- 非完整正整數 page query 不會被部分解析。
- OpenSpec 80/80，且 10.8 明確記錄事後 acceptance／waiver，而非實作前核准。
- 所有宣稱都有本次固定 HEAD 的可重現輸出支持。
- check、unit、integration、build、受影響 E2E、完整 E2E 與 strict OpenSpec validation 均符合上述規則。
