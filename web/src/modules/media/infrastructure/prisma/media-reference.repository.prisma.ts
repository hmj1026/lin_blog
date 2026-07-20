import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MediaReference, MediaReferenceRepository } from "../../application/ports";

/** Prisma 交易在可序列化隔離下遇到寫入衝突時回傳的錯誤碼。 */
const SERIALIZATION_FAILURE = "P2034";

/**
 * 收集某上傳在文章結構化欄位、內容與站點 Hero 的引用。
 *
 * 刻意「不」以 deletedAt 過濾文章：已移入垃圾桶的文章仍可被還原，
 * 若其封面／OG／內容引用此媒體，刪除媒體會讓還原後的 URL 失效，
 * 故垃圾桶文章的引用同樣視為有效引用。
 */
async function collectReferences(
  client: Prisma.TransactionClient,
  uploadId: string
): Promise<MediaReference[]> {
  const src = `/api/files/${uploadId}`;
  const [posts, settings] = await Promise.all([
    client.post.findMany({
      where: {
        OR: [{ coverImage: src }, { ogImage: src }, { content: { contains: uploadId } }],
      },
      select: { id: true, title: true, coverImage: true, ogImage: true, content: true, allowRawHtml: true },
    }),
    client.siteSetting.findMany({
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
}

/** 查詢精確欄位、文章內容與需人工確認的 Raw HTML 媒體候選。 */
export const mediaReferenceRepositoryPrisma: MediaReferenceRepository = {
  listStructuredReferences(uploadId) {
    return collectReferences(prisma, uploadId);
  },

  async softDeleteUploadIfUnreferenced(uploadId) {
    // 於同一可序列化交易內重新確認引用後才軟刪除，關閉「確認無引用後、刪除前另一管理員新增引用」的競態；
    // 並行的文章儲存會與此讀取序列化衝突（P2034），落敗方保守視為衝突而不刪除。
    try {
      return await prisma.$transaction(
        async (tx) => {
          const references = await collectReferences(tx, uploadId);
          // 僅高確定性 exact 引用（作用中封面/OG/Hero、內文含完整 URL）硬阻擋；
          // 低確定性 manual-review 候選由 UI 覆寫路徑確認後放行，不在交易層阻擋。
          const blocking = references.filter((reference) => reference.certainty === "exact");
          if (blocking.length > 0) return { ok: false as const, reason: "referenced" as const, references: blocking };
          await tx.upload.update({ where: { id: uploadId }, data: { deletedAt: new Date() } });
          return { ok: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_FAILURE) {
        // 並行寫入衝突：保守起見不刪除，回報為 conflict 讓呼叫端提示重試（而非誤稱仍被引用）。
        return { ok: false as const, reason: "conflict" as const };
      }
      throw error;
    }
  },
};
