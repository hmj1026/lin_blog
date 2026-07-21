import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";
import { securityAdminUseCases } from "@/modules/security-admin";
import { mediaUseCases } from "@/modules/media";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { postsUseCases } from "@/modules/posts";
import { POST as createUser } from "@/app/api/users/route";
import { PUT as updateUser, DELETE as deleteUser } from "@/app/api/users/[id]/route";
import { POST as createRole } from "@/app/api/roles/route";
import { PUT as updateRole, DELETE as deleteRole } from "@/app/api/roles/[id]/route";
import { DELETE as deleteUpload } from "@/app/api/uploads/[id]/route";
import { PUT as updateSettings } from "@/app/api/site-settings/route";
import { POST as batchPosts } from "@/app/api/posts/batch/route";
import { POST as importPosts } from "@/app/api/posts/import/route";
import { DELETE as deletePost, PATCH as patchPost } from "@/app/api/posts/[id]/route";
import { DELETE as deleteCategory, PATCH as patchCategory } from "@/app/api/categories/[id]/route";
import { DELETE as deleteTag, PATCH as patchTag } from "@/app/api/tags/[id]/route";
import { PUT as updateAbout } from "@/app/api/site-settings/about/route";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn().mockResolvedValue(null),
  jsonOk: vi.fn((data, init) => Response.json({ success: true, data }, init)),
  jsonError: vi.fn((message, status) => Response.json({ success: false, message }, { status })),
  handleApiError: vi.fn(() => Response.json({ success: false }, { status: 500 })),
}));
vi.mock("@/lib/server/audit-safe", () => ({
  recordAuditEventSafely: vi.fn(),
  changedFieldNames: (payload: unknown) =>
    payload && typeof payload === "object" && !Array.isArray(payload) ? Object.keys(payload) : [],
}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: "actor-1" } }) }));
vi.mock("@/lib/server-queries", () => ({ securityAdminQueries: {}, siteSettingsQueries: {} }));
vi.mock("@/modules/security-admin", () => ({ securityAdminUseCases: { createUser: vi.fn(), updateUser: vi.fn(), softDeleteUser: vi.fn(), getUserAuthSnapshot: vi.fn(), createRole: vi.fn(), updateRole: vi.fn(), softDeleteRole: vi.fn(), listRolePermissions: vi.fn(), getRoleAuditState: vi.fn() } }));
vi.mock("@/modules/security-admin/presentation/dto", () => ({ toUserAdminRowDto: vi.fn((value) => value), toRoleDto: vi.fn((value) => value), toPermissionDto: vi.fn((value) => value) }));
vi.mock("@/modules/media", () => ({ mediaUseCases: { softDeleteUpload: vi.fn() } }));
vi.mock("@/modules/site-settings", () => ({ siteSettingsUseCases: { updateDefault: vi.fn(), updateAboutContent: vi.fn() } }));
vi.mock("@/modules/posts", () => ({ postsUseCases: { batchPostAction: vi.fn(), importPosts: vi.fn(), removePost: vi.fn(), restorePost: vi.fn(), removeCategory: vi.fn(), mergeCategory: vi.fn(), restoreCategory: vi.fn(), removeTag: vi.fn(), mergeTag: vi.fn(), restoreTag: vi.fn() } }));

describe("高風險 mutation audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recordAuditEventSafely).mockResolvedValue(true);
  });

  it("記錄使用者角色的舊值與新值，只列實際變更欄位並揭露密碼重設", async () => {
    vi.mocked(securityAdminUseCases.getUserAuthSnapshot).mockResolvedValue({ email: "user@example.com", name: null, roleId: "editor", roleKey: "EDITOR", roleName: "編輯", permissionKeys: [] });
    vi.mocked(securityAdminUseCases.updateUser).mockResolvedValue({ id: "user-1", email: "user@example.com", name: null, roleId: "admin" } as never);
    const response = await updateUser(new Request("http://local/api/users/user-1", { method: "PUT", body: JSON.stringify({ email: "user@example.com", roleId: "admin", password: "secret-value" }) }), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(200);
    // email 未實際變更不記錄；密碼重設只記錄事實（"password"），不含任何密碼值。
    expect(recordAuditEventSafely).toHaveBeenCalledWith({ action: "user.updated", resourceType: "user", resourceId: "user-1", summary: { changedFields: ["roleId", "password"], fromRoleId: "editor", toRoleId: "admin" } });
  });

  it("帳號與角色建立、停用及刪除成功後皆寫入事件", async () => {
    vi.mocked(securityAdminUseCases.createUser).mockResolvedValue({ id: "user-2" } as never);
    vi.mocked(securityAdminUseCases.softDeleteUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(securityAdminUseCases.createRole).mockResolvedValue({ id: "role-2" } as never);
    vi.mocked(securityAdminUseCases.softDeleteRole).mockResolvedValue({ id: "role-1" });
    await createUser(new Request("http://local/api/users", { method: "POST", body: JSON.stringify({ email: "new@example.com", password: "secret" }) }));
    await deleteUser(new Request("http://local/api/users/user-1", { method: "DELETE" }), { params: Promise.resolve({ id: "user-1" }) });
    await createRole(new Request("http://local/api/roles", { method: "POST", body: JSON.stringify({ key: "NEW", name: "新角色", permissionKeys: [] }) }));
    await deleteRole(new Request("http://local/api/roles/role-1", { method: "DELETE" }), { params: Promise.resolve({ id: "role-1" }) });
    expect(vi.mocked(recordAuditEventSafely).mock.calls.map(([event]) => event.action)).toEqual(["user.created", "user.disabled", "role.created", "role.deleted"]);
  });

  it("角色權限實際變更時記錄 name 與 permissions", async () => {
    vi.mocked(securityAdminUseCases.getRoleAuditState).mockResolvedValue({ key: "ADMIN", name: "舊名稱", permissionKeys: ["admin:access"] });
    vi.mocked(securityAdminUseCases.updateRole).mockResolvedValue({ id: "role-1" } as never);
    await updateRole(new Request("http://local/api/roles/role-1", { method: "PUT", body: JSON.stringify({ key: "ADMIN", name: "管理員", permissionKeys: ["admin:access", "audit:view"] }) }), { params: Promise.resolve({ id: "role-1" }) });
    expect(recordAuditEventSafely).toHaveBeenCalledWith({ action: "role.updated", resourceType: "role", resourceId: "role-1", summary: { changedFields: ["name", "permissions"], affectedCount: 2 } });
  });

  it("角色權限未變更時不誤記 permissions", async () => {
    // 更新前後權限集合相同（僅順序不同）→ 只應記錄 name，不得無條件宣稱 permissions 變更。
    vi.mocked(securityAdminUseCases.getRoleAuditState).mockResolvedValue({ key: "ADMIN", name: "舊名稱", permissionKeys: ["admin:access", "audit:view"] });
    vi.mocked(securityAdminUseCases.updateRole).mockResolvedValue({ id: "role-1" } as never);
    await updateRole(new Request("http://local/api/roles/role-1", { method: "PUT", body: JSON.stringify({ key: "ADMIN", name: "新名稱", permissionKeys: ["audit:view", "admin:access"] }) }), { params: Promise.resolve({ id: "role-1" }) });
    expect(recordAuditEventSafely).toHaveBeenCalledWith({ action: "role.updated", resourceType: "role", resourceId: "role-1", summary: { changedFields: ["name"], affectedCount: 2 } });
  });

  it("重複的 permissionKeys 在集合相同時不誤記 permissions", async () => {
    // payload 送出重複 key，但去重後與更新前集合相同 → 只記 name，affectedCount 取去重後數量。
    vi.mocked(securityAdminUseCases.getRoleAuditState).mockResolvedValue({ key: "ADMIN", name: "舊名稱", permissionKeys: ["admin:access"] });
    vi.mocked(securityAdminUseCases.updateRole).mockResolvedValue({ id: "role-1" } as never);
    await updateRole(new Request("http://local/api/roles/role-1", { method: "PUT", body: JSON.stringify({ key: "ADMIN", name: "新名稱", permissionKeys: ["admin:access", "admin:access"] }) }), { params: Promise.resolve({ id: "role-1" }) });
    expect(recordAuditEventSafely).toHaveBeenCalledWith({ action: "role.updated", resourceType: "role", resourceId: "role-1", summary: { changedFields: ["name"], affectedCount: 1 } });
  });

  it("角色 key 變更時記錄 key，name 未變更則不記", async () => {
    // 僅識別鍵 key 變更（ADMIN → ADMINISTRATOR），name/permissions 與更新前相同。
    vi.mocked(securityAdminUseCases.getRoleAuditState).mockResolvedValue({ key: "ADMIN", name: "管理員", permissionKeys: ["admin:access"] });
    vi.mocked(securityAdminUseCases.updateRole).mockResolvedValue({ id: "role-1" } as never);
    await updateRole(new Request("http://local/api/roles/role-1", { method: "PUT", body: JSON.stringify({ key: "ADMINISTRATOR", name: "管理員", permissionKeys: ["admin:access"] }) }), { params: Promise.resolve({ id: "role-1" }) });
    expect(recordAuditEventSafely).toHaveBeenCalledWith({ action: "role.updated", resourceType: "role", resourceId: "role-1", summary: { changedFields: ["key"], affectedCount: 1 } });
  });

  it("媒體刪除、設定更新與文章批次成功後寫入有界摘要", async () => {
    vi.mocked(mediaUseCases.softDeleteUpload).mockResolvedValue({ ok: true } as never);
    vi.mocked(siteSettingsUseCases.updateDefault).mockResolvedValue({} as never);
    vi.mocked(postsUseCases.batchPostAction).mockResolvedValue({ count: 2, results: [] } as never);
    await deleteUpload(new Request("http://local/api/uploads/file-1", { method: "DELETE" }), { params: Promise.resolve({ id: "file-1" }) });
    await updateSettings(new Request("http://local/api/site-settings", { method: "PUT", body: JSON.stringify({ siteName: "新名稱", showBlogLink: false }) }));
    await batchPosts(new NextRequest("http://local/api/posts/batch", { method: "POST", body: JSON.stringify({ action: "publish", postIds: ["post-1", "post-2"] }) }));
    expect(recordAuditEventSafely).toHaveBeenNthCalledWith(1, { action: "media.deleted", resourceType: "upload", resourceId: "file-1", summary: {} });
    // 記錄實際變更的設定欄位名（僅欄位名，非值），而非固定的 "metadata"。
    expect(recordAuditEventSafely).toHaveBeenNthCalledWith(2, { action: "settings.updated", resourceType: "site-settings", resourceId: "default", summary: { changedFields: ["siteName", "showBlogLink"] } });
    expect(recordAuditEventSafely).toHaveBeenNthCalledWith(3, { action: "posts.batch_publish", resourceType: "post", resourceId: "batch", summary: { affectedCount: 2, referenceIds: ["post-1", "post-2"] } });
  });

  it("還原文章、分類與標籤成功後皆寫入 audit", async () => {
    vi.mocked(postsUseCases.restorePost).mockResolvedValue({} as never);
    vi.mocked(postsUseCases.restoreCategory).mockResolvedValue({ id: "category-1" } as never);
    vi.mocked(postsUseCases.restoreTag).mockResolvedValue({ id: "tag-1" } as never);
    await patchPost(new Request("http://local/api/posts/post-1", { method: "PATCH", body: JSON.stringify({ restore: true }) }), { params: Promise.resolve({ id: "post-1" }) });
    await patchCategory(new Request("http://local/api/categories/category-1", { method: "PATCH", body: JSON.stringify({}) }), { params: Promise.resolve({ id: "category-1" }) });
    await patchTag(new Request("http://local/api/tags/tag-1", { method: "PATCH", body: JSON.stringify({}) }), { params: Promise.resolve({ id: "tag-1" }) });
    expect(vi.mocked(recordAuditEventSafely).mock.calls.map(([event]) => event.action)).toEqual(["post.restored", "category.restored", "tag.restored"]);
  });

  it("audit 寫入失敗不改變主要 mutation 的成功回應", async () => {
    vi.mocked(recordAuditEventSafely).mockResolvedValue(false);
    vi.mocked(mediaUseCases.softDeleteUpload).mockResolvedValue({ ok: true } as never);
    const response = await deleteUpload(new Request("http://local/api/uploads/file-1", { method: "DELETE" }), { params: Promise.resolve({ id: "file-1" }) });
    expect(response.status).toBe(200);
  });

  it("記錄覆蓋匯入、單篇刪除、分類標籤整併與 About 更新", async () => {
    vi.mocked(postsUseCases.importPosts).mockResolvedValue({ created: 1, updated: 1, skipped: 0 } as never);
    vi.mocked(postsUseCases.removePost).mockResolvedValue({} as never);
    vi.mocked(postsUseCases.removeCategory).mockResolvedValue({ id: "category-1" } as never);
    vi.mocked(postsUseCases.mergeCategory).mockResolvedValue({ id: "category-1", movedPosts: 2 } as never);
    vi.mocked(postsUseCases.removeTag).mockResolvedValue({ id: "tag-1" } as never);
    vi.mocked(postsUseCases.mergeTag).mockResolvedValue({ id: "tag-1", movedPosts: 3 } as never);
    vi.mocked(siteSettingsUseCases.updateAboutContent).mockResolvedValue({} as never);
    await importPosts(new Request("http://local/api/posts/import", { method: "POST", body: JSON.stringify({ mode: "overwrite", posts: [{ slug: "safe-slug", title: "秘密標題", content: "完整秘密內容" }] }) }));
    await deletePost(new Request("http://local/api/posts/post-1", { method: "DELETE" }), { params: Promise.resolve({ id: "post-1" }) });
    await deleteCategory(new Request("http://local/api/categories/category-1", { method: "DELETE" }), { params: Promise.resolve({ id: "category-1" }) });
    await patchCategory(new Request("http://local/api/categories/category-1", { method: "PATCH", body: JSON.stringify({ mergeIntoId: "category-2" }) }), { params: Promise.resolve({ id: "category-1" }) });
    await deleteTag(new Request("http://local/api/tags/tag-1", { method: "DELETE" }), { params: Promise.resolve({ id: "tag-1" }) });
    await patchTag(new Request("http://local/api/tags/tag-1", { method: "PATCH", body: JSON.stringify({ mergeIntoId: "tag-2" }) }), { params: Promise.resolve({ id: "tag-1" }) });
    await updateAbout(new Request("http://local/api/site-settings/about", { method: "PUT", body: JSON.stringify({ aboutContent: "完整秘密內容" }) }));
    const actions = vi.mocked(recordAuditEventSafely).mock.calls.map(([event]) => event.action);
    expect(actions).toEqual(["posts.import_overwrite", "post.deleted", "category.deleted", "category.merged", "tag.deleted", "tag.merged", "settings.about_updated"]);
    expect(JSON.stringify(vi.mocked(recordAuditEventSafely).mock.calls)).not.toContain("完整秘密內容");
    expect(JSON.stringify(vi.mocked(recordAuditEventSafely).mock.calls)).not.toContain("秘密標題");
  });
});
