import { prisma } from "@/lib/db";
import type { MediaReference, MediaReferenceRepository } from "../../application/ports";

/** 查詢精確欄位、文章內容與需人工確認的 Raw HTML 媒體候選。 */
export const mediaReferenceRepositoryPrisma: MediaReferenceRepository = {
  async listStructuredReferences(uploadId) {
    const src = `/api/files/${uploadId}`;
    const [posts, settings] = await Promise.all([
      prisma.post.findMany({
        where: {
          deletedAt: null,
          OR: [{ coverImage: src }, { ogImage: src }, { content: { contains: uploadId } }],
        },
        select: { id: true, title: true, coverImage: true, ogImage: true, content: true, allowRawHtml: true },
      }),
      prisma.siteSetting.findMany({
        where: { heroImage: src },
        select: { key: true },
      }),
    ]);

    const references: MediaReference[] = [];
    for (const post of posts) {
      if (post.coverImage === src) {
        references.push({ resourceType: "post", resourceId: post.id, field: "coverImage", certainty: "exact", label: `文章封面：${post.title}` });
      }
      if (post.ogImage === src) {
        references.push({ resourceType: "post", resourceId: post.id, field: "ogImage", certainty: "exact", label: `文章 OG 圖片：${post.title}` });
      }
      if (post.content.includes(uploadId)) {
        const exact = post.content.includes(src);
        references.push({
          resourceType: "post",
          resourceId: post.id,
          field: "content",
          certainty: exact ? "exact" : "manual-review",
          label: exact
            ? `文章內文：${post.title}`
            : `${post.allowRawHtml ? "Raw HTML" : "文章內文"} 可能引用：${post.title}（需人工檢查）`,
        });
      }
    }
    for (const setting of settings) {
      references.push({ resourceType: "site-setting", resourceId: setting.key, field: "heroImage", certainty: "exact", label: "站點 Hero 圖片" });
    }
    return references;
  },
};
