import { PrismaClient, PostStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { posts as frontendPosts } from "../src/data/posts";

const prisma = new PrismaClient();

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function richContentToHtml(blocks: Array<{ type: string; [key: string]: unknown }>) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return `<p>${escapeHtml(String(block.text ?? ""))}</p>`;
      }
      if (block.type === "subheading") {
        return `<h2>${escapeHtml(String(block.text ?? ""))}</h2>`;
      }
      if (block.type === "quote") {
        const quote = escapeHtml(String(block.text ?? ""));
        const cite = block.cite ? `<cite>— ${escapeHtml(String(block.cite))}</cite>` : "";
        return `<blockquote><p>${quote}</p>${cite}</blockquote>`;
      }
      if (block.type === "list") {
        const items = Array.isArray(block.items) ? (block.items as unknown[]).map((item) => `<li>${escapeHtml(String(item))}</li>`).join("") : "";
        const ordered = Boolean(block.ordered);
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

async function main() {
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
  ];

  await prisma.$transaction(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { name: p.name },
        create: { key: p.key, name: p.name },
      })
    )
  );

  const [adminRole, editorRole, readerRole] = await prisma.$transaction([
    prisma.role.upsert({
      where: { key: "ADMIN" },
      update: { name: "管理者", deletedAt: null },
      create: { key: "ADMIN", name: "管理者" },
    }),
    prisma.role.upsert({
      where: { key: "EDITOR" },
      update: { name: "編輯", deletedAt: null },
      create: { key: "EDITOR", name: "編輯" },
    }),
    prisma.role.upsert({
      where: { key: "READER" },
      update: { name: "讀者", deletedAt: null },
      create: { key: "READER", name: "讀者" },
    }),
  ]);

  await prisma.rolePermission.deleteMany({ where: { roleId: { in: [adminRole.id, editorRole.id, readerRole.id] } } });

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

  const adminPasswordHash = await bcrypt.hash("admin", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@lin.blog" },
    update: { password: adminPasswordHash, roleId: adminRole.id, name: "Lin Admin", deletedAt: null },
    create: { email: "admin@lin.blog", name: "Lin Admin", roleId: adminRole.id, password: adminPasswordHash, deletedAt: null },
  });

  await prisma.siteSetting.upsert({
    where: { key: "default" },
    update: {
      showBlogLink: true,
    },
    create: {
      key: "default",
      showBlogLink: true,
      // 站點基本資訊
      siteName: "Lin Blog",
      siteTagline: "內容．社群．設計",
      siteDescription: "以社群為核心的繁體中文部落格，分享內容策略、設計實務、Newsletter 與社群營運心法。",
      contactEmail: "hello@lin.blog",
      copyrightText: "以內容連結社群",
      // Hero 區塊
      heroBadge: "Client-First Blog · 社群驅動",
      heroTitle: "打造以「社群參與」為核心的內容體驗",
      heroSubtitle: "每篇文章都經過設計、敘事與互動的精修，讓讀者不只點擊，更願意分享、回訪與共創。在這裡，你會找到實戰框架、版型拆解與可直接複製的腳本。",
      heroImage: "/images/hero-community.svg",
      // 統計數據
      statsArticles: "120+",
      statsSubscribers: "35K",
      statsRating: "4.8 ★",
      // Newsletter (暫時隱藏)
      showNewsletter: false,
      newsletterTitle: "每週兩封，帶你精讀內容策略與設計實務",
      newsletterDesc: "以繁體中文精選案例、框架與模板。訂閱後將收到最新文章與工作坊第一手資訊。",
      // Contact (暫時隱藏)
      showContact: false,
      contactTitle: "需要內容策略、設計審視或社群啟動？",
      contactDesc: "簡述你的需求與時程，我們將提供一份初步建議與時間表。表單送出後會在 48 小時內回覆。",
    },
  });

  // 分類資料，包含描述
  const categoryData: Array<{ name: string; showInNav: boolean; navOrder: number; description: string }> = [
    { name: "策略", showInNav: true, navOrder: 10, description: "架構內容飛輪、Newsletter 成長、關鍵指標設計。" },
    { name: "設計", showInNav: true, navOrder: 20, description: "版面節奏、模組化設計、無障礙與響應式實踐。" },
    { name: "社群", showInNav: true, navOrder: 30, description: "儀式感、參與機制與活動腳本，累積忠誠度。" },
  ];

  // 先 upsert 預設分類（含描述）
  const categoryDataMap = new Map(categoryData.map(c => [c.name, c]));

  const categoryNames = Array.from(new Set([
    ...categoryData.map(c => c.name),
    ...frontendPosts.map((post) => post.category),
  ]));
  const categories = await prisma.$transaction(
    categoryNames.map((name) => {
      const predefined = categoryDataMap.get(name);
      const showInNav = predefined?.showInNav ?? false;
      const navOrder = predefined?.navOrder ?? 0;
      const description = predefined?.description ?? null;
      return prisma.category.upsert({
        where: { slug: name },
        update: { name, showInNav, navOrder, description, deletedAt: null },
        create: { slug: name, name, showInNav, navOrder, description, deletedAt: null },
      });
    })
  );

  const categoryByName = new Map(categories.map((category) => [category.name, category]));

  const tagNames = Array.from(new Set(frontendPosts.flatMap((post) => post.tags)));
  const tags = await prisma.$transaction(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { slug: name },
        update: { name, deletedAt: null },
        create: { slug: name, name, deletedAt: null },
      })
    )
  );
  const tagByName = new Map(tags.map((tag) => [tag.name, tag]));

  await prisma.$transaction(
    frontendPosts.map((post) => {
      const category = categoryByName.get(post.category);
      const connectCategory = category ? [{ id: category.id }] : [];
      const connectTags = post.tags
        .map((tag) => tagByName.get(tag))
        .filter(Boolean)
        .map((tag) => ({ id: (tag as { id: string }).id }));

      return prisma.post.upsert({
        where: { slug: post.slug },
        update: {
          title: post.title,
          excerpt: post.excerpt,
          coverImage: post.hero,
          readingTime: post.readingTime,
          featured: Boolean(post.featured),
          content: richContentToHtml(post.content as unknown as Array<{ type: string; [key: string]: unknown }>),
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(post.date),
          deletedAt: null,
          authorId: admin.id,
          categories: { set: connectCategory },
          tags: { set: connectTags },
        },
        create: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          coverImage: post.hero,
          readingTime: post.readingTime,
          featured: Boolean(post.featured),
          content: richContentToHtml(post.content as unknown as Array<{ type: string; [key: string]: unknown }>),
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(post.date),
          deletedAt: null,
          authorId: admin.id,
          categories: { connect: connectCategory },
          tags: { connect: connectTags },
        },
      });
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
