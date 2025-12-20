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
    update: { showBlogLink: true },
    create: { key: "default", showBlogLink: true },
  });

  const categoryNames = Array.from(new Set(frontendPosts.map((post) => post.category)));
  const categories = await prisma.$transaction(
    categoryNames.map((name) => {
      const showInNav = name === "策略" || name === "設計" || name === "社群";
      const navOrder = name === "策略" ? 10 : name === "設計" ? 20 : name === "社群" ? 30 : 0;
      return prisma.category.upsert({
        where: { slug: name },
        update: { name, showInNav, navOrder, deletedAt: null },
        create: { slug: name, name, showInNav, navOrder, deletedAt: null },
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
