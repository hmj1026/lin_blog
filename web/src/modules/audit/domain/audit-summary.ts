import { siteSettingSchema, aboutContentSchema } from "@/lib/validations/site-setting.schema";

export type AuditSummaryValue = string | number | boolean | null | string[];
export type AuditSummary = Record<string, AuditSummaryValue>;

const ALLOWED_KEYS = new Set([
  "affectedCount",
  "changedFields",
  "fromRoleId",
  "toRoleId",
  "fromStatus",
  "toStatus",
  "scope",
  "referenceCount",
  "referenceIds",
]);

// 站點設定與 About 的欄位名皆為非敏感識別字（值不會進 changedFields），
// 以 schema shape 作為單一事實來源，讓稽核可記錄實際變更的設定欄位。
const SITE_SETTING_FIELD_KEYS = [
  ...Object.keys(siteSettingSchema.shape),
  ...Object.keys(aboutContentSchema.shape),
];

const ALLOWED_CHANGED_FIELDS = new Set([
  "email",
  "name",
  // 角色識別鍵；僅記錄欄位名而非內容。
  "key",
  "roleId",
  // 僅記錄「密碼曾被重設」的事實，不儲存任何密碼內容。
  "password",
  "status",
  "permissions",
  "visibility",
  "navigation",
  "metadata",
  ...SITE_SETTING_FIELD_KEYS,
]);

/** 將 audit 摘要縮減為有界且不含密碼、token 或完整內容的白名單資料。 */
export function sanitizeAuditSummary(value: unknown): AuditSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: AuditSummary = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (key === "changedFields") {
      if (Array.isArray(rawValue)) {
        result[key] = rawValue
          .filter((item): item is string => typeof item === "string" && ALLOWED_CHANGED_FIELDS.has(item))
          .slice(0, 20);
      }
      continue;
    }
    if (typeof rawValue === "string") result[key] = rawValue.slice(0, 200);
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) result[key] = rawValue;
    else if (typeof rawValue === "boolean" || rawValue === null) result[key] = rawValue;
    else if (Array.isArray(rawValue)) {
      result[key] = rawValue
        .filter((item): item is string => typeof item === "string")
        .slice(0, 20)
        .map((item) => item.slice(0, 100));
    }
  }
  return result;
}
