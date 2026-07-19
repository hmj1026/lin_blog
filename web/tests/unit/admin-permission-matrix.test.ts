import { beforeEach, describe, expect, it, vi } from "vitest";

import { requirePermission } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { sessionHasPermission } from "@/lib/rbac";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

type RoleKey = "ADMIN" | "EDITOR" | "ANALYTICS_VIEWER" | "NO_PERMISSIONS";

type PermissionFixture = {
  permission: string;
  routes: string[];
  apis: string[];
  allowedRoles: RoleKey[];
};

const rolePermissions: Record<RoleKey, string[]> = {
  ADMIN: [
    "admin:access",
    "posts:write",
    "analytics:view",
    "analytics:view_sensitive",
    "subscribers:view",
    "categories:manage",
    "tags:manage",
    "uploads:write",
    "users:manage",
    "roles:manage",
    "settings:manage",
  ],
  EDITOR: ["admin:access", "posts:write", "categories:manage", "tags:manage", "uploads:write"],
  ANALYTICS_VIEWER: ["admin:access", "analytics:view"],
  NO_PERMISSIONS: [],
};

const permissionMatrix: PermissionFixture[] = [
  {
    permission: "posts:write",
    routes: ["/admin/posts", "/admin/import-export"],
    apis: ["/api/posts", "/api/posts/batch", "/api/posts/import", "/api/posts/export"],
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    permission: "analytics:view",
    routes: ["/admin/analytics/posts"],
    apis: ["/api/analytics/stats", "/api/admin/analytics/posts"],
    allowedRoles: ["ADMIN", "ANALYTICS_VIEWER"],
  },
  {
    permission: "analytics:view_sensitive",
    routes: ["/admin/analytics/posts/:postId"],
    apis: ["/api/admin/analytics/posts/:postId/events"],
    allowedRoles: ["ADMIN"],
  },
  {
    permission: "subscribers:view",
    routes: ["/admin/subscribers"],
    apis: ["/api/admin/subscribers"],
    allowedRoles: ["ADMIN"],
  },
  {
    permission: "categories:manage",
    routes: ["/admin/categories"],
    apis: ["/api/categories"],
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    permission: "tags:manage",
    routes: ["/admin/tags"],
    apis: ["/api/tags"],
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    permission: "uploads:write",
    routes: ["/admin/media"],
    apis: ["/api/uploads", "/api/uploads/:id"],
    allowedRoles: ["ADMIN", "EDITOR"],
  },
  {
    permission: "users:manage",
    routes: ["/admin/users"],
    apis: ["/api/users", "/api/users/:id"],
    allowedRoles: ["ADMIN"],
  },
  {
    permission: "roles:manage",
    routes: ["/admin/roles"],
    apis: ["/api/roles", "/api/roles/:id"],
    allowedRoles: ["ADMIN"],
  },
  {
    permission: "settings:manage",
    routes: ["/admin/settings", "/admin/about"],
    apis: ["/api/site-settings", "/api/site-settings/about"],
    allowedRoles: ["ADMIN"],
  },
];

/** 建立只含權限快照的測試 session。 */
function sessionFor(role: RoleKey) {
  return {
    user: {
      id: role.toLowerCase(),
      roleId: `${role.toLowerCase()}-role`,
      permissions: rolePermissions[role],
    },
  };
}

describe("admin permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(permissionMatrix)(
    "$permission keeps route and API authorization aligned",
    async ({ permission, routes, apis, allowedRoles }) => {
      expect(routes.length).toBeGreaterThan(0);
      expect(apis.length).toBeGreaterThan(0);

      for (const role of Object.keys(rolePermissions) as RoleKey[]) {
        const session = sessionFor(role);
        const expected = allowedRoles.includes(role);

        expect(sessionHasPermission(session as never, permission), `${role} route access`).toBe(expected);

        vi.mocked(getSession).mockResolvedValueOnce(session as never);
        const apiResult = await requirePermission(permission);
        expect(apiResult?.status ?? 200, `${role} API access`).toBe(expected ? 200 : 403);
      }
    }
  );

  it("returns 401 for an unauthenticated API session", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);

    const result = await requirePermission("admin:access");

    expect(result?.status).toBe(401);
  });
});
