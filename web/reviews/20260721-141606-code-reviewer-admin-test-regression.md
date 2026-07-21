---
category: reviews
verdict: APPROVE
scope: web/tests/unit/components/admin/category-admin-client.test.tsx, web/tests/unit/components/admin/tag-admin-client.test.tsx
---

Verdict: APPROVE

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 |

[LOW] Missing delete-failure regression test for TagAdminClient
File: web/tests/unit/components/admin/tag-admin-client.test.tsx
Issue: category-admin-client.test.tsx got both a merge-failure test and a delete-failure test, but tag-admin-client.test.tsx only got the merge-failure test, even though TagAdminClient's `remove()` has the identical try/catch/finally pattern (pendingDelete cleared unconditionally in `finally`, web/src/components/admin/tag-admin-client.tsx:81-92). Not a defect in what was added, just an asymmetric coverage gap versus the sibling file's regression fix.
Fix: optionally add a matching "刪除標籤失敗時仍會關閉確認對話框並顯示錯誤" test mirroring the category one, if the same regression class applies to tags.

Verified: assertions trace correctly to the real fetch → parseApiResponse → isApiSuccess → getApiErrorMessage → throw → catch(setMessage) → finally(setPendingDelete/setPendingMerge(null)) flow (web/src/components/admin/category-admin-client.tsx:104-120, 139-160; web/src/lib/api-client.ts). `findByText` used correctly for the async state update after the mocked promise resolves; synchronous `getByRole`/`queryByRole` checks occur only where prior awaits (`userEvent.click`/`selectOptions`) already flushed the relevant state. No unhandled rejections — mocked fetch always resolves. Naming, `within(row)`, and aria-label query conventions match the rest of the file. Confirmed both new tests fail pre-fix / pass post-fix per user report, and full suite/lint/typecheck are green.
