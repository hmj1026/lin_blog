export type AdminNavigationItem = {
  href: string;
  label: string;
  statusLabel?: string;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

type NavigationDefinition = AdminNavigationItem & {
  permission: string;
  showsAboutStatus?: boolean;
};

const navigationDefinitions: Array<{ label: string; items: NavigationDefinition[] }> = [
  {
    label: "總覽",
    items: [{ href: "/admin", label: "儀表板", permission: "admin:access" }],
  },
  {
    label: "內容管理",
    items: [
      { href: "/admin/posts", label: "文章列表", permission: "posts:write" },
      {
        href: "/admin/about",
        label: "關於我",
        permission: "settings:manage",
        showsAboutStatus: true,
      },
      { href: "/admin/import-export", label: "匯入／匯出", permission: "posts:write" },
    ],
  },
  {
    label: "內容資源",
    items: [
      { href: "/admin/categories", label: "分類管理", permission: "categories:manage" },
      { href: "/admin/tags", label: "標籤管理", permission: "tags:manage" },
      { href: "/admin/media", label: "媒體庫", permission: "uploads:write" },
    ],
  },
  {
    label: "分析與受眾",
    items: [
      { href: "/admin/analytics/posts", label: "文章統計", permission: "analytics:view" },
      { href: "/admin/subscribers", label: "訂閱者名單", permission: "subscribers:view" },
    ],
  },
  {
    label: "系統管理",
    items: [
      { href: "/admin/users", label: "使用者管理", permission: "users:manage" },
      { href: "/admin/roles", label: "角色權限", permission: "roles:manage" },
      { href: "/admin/settings", label: "站點設定", permission: "settings:manage" },
      { href: "/admin/audit", label: "活動紀錄", permission: "audit:view" },
    ],
  },
];

/** 由伺服器 session 的權限快照建立可序列化的後台導覽 DTO。 */
export function buildAdminNavigation({
  permissions,
  showAbout,
}: {
  permissions: string[];
  showAbout: boolean;
}): AdminNavigationGroup[] {
  const permissionSet = new Set(permissions);

  return navigationDefinitions.flatMap((group) => {
    const items = group.items.filter((item) => permissionSet.has(item.permission)).map((item) => ({
      href: item.href,
      label: item.label,
      ...(item.showsAboutStatus
        ? { statusLabel: showAbout ? "前台已啟用" : "前台未啟用" }
        : {}),
    }));

    return items.length > 0 ? [{ label: group.label, items }] : [];
  });
}
