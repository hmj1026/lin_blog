/**
 * 生產環境初始化腳本
 * 用於初始化權限、角色、站點設定和預設分類
 * 
 * 執行方式: docker exec blog_app node scripts/init-admin.js
 * 
 * 注意：此腳本不再建立使用者，請使用 create-user.js
 * 使用者建立: ADMIN_PASSWORD=密碼 docker exec blog_app node scripts/create-user.js --email=admin@example.com --role=ADMIN
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 初始化資料庫...");

  // 建立權限
  // 此清單須與 web/prisma/permission-catalog.ts 保持同步（SSOT 為 permission-catalog.ts；本檔為 production container 內的 plain-JS 版本）
  const permissions = [
    { key: "admin:access", name: "後台存取" },
    { key: "posts:write", name: "文章管理" },
    { key: "uploads:write", name: "檔案上傳" },
    { key: "analytics:view", name: "文章統計" },
    { key: "analytics:view_sensitive", name: "文章統計（IP/UA）" },
    { key: "categories:manage", name: "分類管理" },
    { key: "tags:manage", name: "標籤管理" },
    { key: "users:manage", name: "使用者管理" },
    { key: "roles:manage", name: "角色權限管理" },
    { key: "settings:manage", name: "站點設定" },
    { key: "subscribers:view", name: "訂閱者名單" },
    { key: "audit:view", name: "活動紀錄" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name },
      create: { key: p.key, name: p.name },
    });
  }
  console.log("✅ 權限已建立");

  // 建立角色
  const adminRole = await prisma.role.upsert({
    where: { key: "ADMIN" },
    update: { name: "管理者", deletedAt: null },
    create: { key: "ADMIN", name: "管理者" },
  });

  const editorRole = await prisma.role.upsert({
    where: { key: "EDITOR" },
    update: { name: "編輯", deletedAt: null },
    create: { key: "EDITOR", name: "編輯" },
  });

  await prisma.role.upsert({
    where: { key: "READER" },
    update: { name: "讀者", deletedAt: null },
    create: { key: "READER", name: "讀者" },
  });
  console.log("✅ 角色已建立");

  // 設定角色權限
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [adminRole.id, editorRole.id] } },
  });

  await prisma.rolePermission.createMany({
    data: [
      ...permissions.map((p) => ({ roleId: adminRole.id, permissionKey: p.key })),
      { roleId: editorRole.id, permissionKey: "admin:access" },
      { roleId: editorRole.id, permissionKey: "posts:write" },
      { roleId: editorRole.id, permissionKey: "uploads:write" },
      { roleId: editorRole.id, permissionKey: "analytics:view" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ 角色權限已設定");

  // 建立預設站點設定（含區塊標題）
  await prisma.siteSetting.upsert({
    where: { key: "default" },
    update: { showBlogLink: true },
    create: {
      key: "default",
      showBlogLink: true,
      // 站點基本資訊
      siteName: "Lin Blog",
      siteTagline: "內容．社群．設計",
      siteDescription: "以社群為核心的繁體中文部落格",
      contactEmail: "hello@lin.blog",
      copyrightText: "以內容連結社群",
      // Hero 區塊
      heroBadge: "Client-First Blog · 社群驅動",
      heroTitle: "打造以「社群參與」為核心的內容體驗",
      heroSubtitle: "每篇文章都經過設計、敘事與互動的精修，讓讀者不只點擊，更願意分享、回訪與共創。",
      heroImage: "/images/hero-community.svg",
      // 統計數據
      statsArticles: "120+",
      statsSubscribers: "35K",
      statsRating: "4.8 ★",
      // Featured 區塊
      featuredTitle: "熱門精選：近期最受討論的文章",
      featuredDesc: "從設計到營運的實戰拆解，帶你快速套用到自己的內容與社群場景。",
      // Categories 區塊
      categoriesTitle: "三大主題，讓內容與社群形成循環",
      categoriesDesc: "從策略到設計、從社群到執行，這些分類幫助你快速找到需要的工具與視角。",
      // Latest 區塊
      latestTitle: "最新文章",
      latestDesc: "每篇都附上可落地的步驟、檢查清單與案例，直接帶回你的團隊。",
      // Community 區塊
      communityTitle: "每週 AMA 與讀者共創",
      communityDesc: "提交你的問題，或分享你的執行成果。精選會被收錄進下一篇案例拆解。",
      // Newsletter & Contact (暫時隱藏)
      showNewsletter: false,
      showContact: false,
    },
  });
  console.log("✅ 站點設定已建立");

  // 建立預設分類
  const categories = [
    { name: "策略", showInNav: true, navOrder: 10, description: "架構內容飛輪、Newsletter 成長、關鍵指標設計。" },
    { name: "設計", showInNav: true, navOrder: 20, description: "版面節奏、模組化設計、無障礙與響應式實踐。" },
    { name: "社群", showInNav: true, navOrder: 30, description: "儀式感、參與機制與活動腳本，累積忠誠度。" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.name },
      update: { name: cat.name, showInNav: cat.showInNav, navOrder: cat.navOrder, description: cat.description, deletedAt: null },
      create: { slug: cat.name, name: cat.name, showInNav: cat.showInNav, navOrder: cat.navOrder, description: cat.description, deletedAt: null },
    });
  }
  console.log("✅ 預設分類已建立");

  // 全域權限版本遞增，使既有 JWT 權限快取失效
  // 重跑本腳本後，已登入的管理者 session 會依版本號自動重新載入權限
  await prisma.permissionVersion.upsert({
    where: { id: "global" },
    create: { id: "global", value: 1 },
    update: { value: { increment: 1 } },
  });

  console.log("\n🎉 初始化完成！");
  console.log("\n📌 下一步：建立管理員帳號");
  console.log("ADMIN_PASSWORD=密碼 docker exec blog_app node scripts/create-user.js --email=admin@example.com --role=ADMIN");
}

main()
  .catch((e) => {
    console.error("❌ 初始化失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
