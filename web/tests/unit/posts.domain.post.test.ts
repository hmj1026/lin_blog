import { describe, it, expect } from "vitest";
import { Post } from "@/modules/posts/domain/post";
import type { Slug } from "@/modules/posts/domain/slug";

describe("Post Domain", () => {
  const createSlug = (value: string) => value as Slug;

  describe("Post.create", () => {
    it("應該正確建立 Post 實例", () => {
      const post = Post.create({
        id: "post-1",
        slug: createSlug("my-post"),
        status: "PUBLISHED",
        publishedAt: new Date("2024-01-01"),
        deletedAt: null,
      });

      expect(post.id).toBe("post-1");
      expect(post.slug).toBe("my-post");
      expect(post.status).toBe("PUBLISHED");
    });
  });

  describe("Post.fromData", () => {
    it("應該從資料物件建立 Post 實例", () => {
      const post = Post.fromData({
        id: "post-2",
        slug: "another-post",
        status: "DRAFT",
        publishedAt: null,
        deletedAt: null,
      });

      expect(post.id).toBe("post-2");
      expect(post.isDraft()).toBe(true);
    });
  });

  describe("isPublished", () => {
    it("PUBLISHED 狀態且未刪除應回傳 true", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: null,
      });

      expect(post.isPublished()).toBe(true);
    });

    it("DRAFT 狀態應回傳 false", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "DRAFT",
        publishedAt: null,
        deletedAt: null,
      });

      expect(post.isPublished()).toBe(false);
    });

    it("已刪除的 PUBLISHED 文章應回傳 false", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: new Date(),
      });

      expect(post.isPublished()).toBe(false);
    });
  });

  describe("isDraft", () => {
    it("DRAFT 狀態且未刪除應回傳 true", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "DRAFT",
        publishedAt: null,
        deletedAt: null,
      });

      expect(post.isDraft()).toBe(true);
    });

    it("PUBLISHED 狀態應回傳 false", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: null,
      });

      expect(post.isDraft()).toBe(false);
    });
  });

  describe("isScheduled", () => {
    it("SCHEDULED 狀態且未刪除應回傳 true", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "SCHEDULED",
        publishedAt: new Date("2025-01-01"),
        deletedAt: null,
      });

      expect(post.isScheduled()).toBe(true);
    });
  });

  describe("isDeleted", () => {
    it("deletedAt 有值應回傳 true", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: new Date(),
      });

      expect(post.isDeleted()).toBe(true);
    });

    it("deletedAt 為 null 應回傳 false", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: null,
      });

      expect(post.isDeleted()).toBe(false);
    });
  });

  describe("canView", () => {
    it("已發布文章應可閱讀", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: null,
      });

      expect(post.canView()).toBe(true);
      expect(post.canView(false)).toBe(true);
      expect(post.canView(true)).toBe(true);
    });

    it("草稿文章在 allowDraft=true 時可閱讀", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "DRAFT",
        publishedAt: null,
        deletedAt: null,
      });

      expect(post.canView(false)).toBe(false);
      expect(post.canView(true)).toBe(true);
    });

    it("已刪除文章不可閱讀", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "PUBLISHED",
        publishedAt: new Date(),
        deletedAt: new Date(),
      });

      expect(post.canView()).toBe(false);
      expect(post.canView(true)).toBe(false);
    });
  });

  describe("canEdit", () => {
    it("未刪除文章可編輯", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "DRAFT",
        publishedAt: null,
        deletedAt: null,
      });

      expect(post.canEdit()).toBe(true);
    });

    it("已刪除文章不可編輯", () => {
      const post = Post.create({
        id: "1",
        slug: createSlug("test"),
        status: "DRAFT",
        publishedAt: null,
        deletedAt: new Date(),
      });

      expect(post.canEdit()).toBe(false);
    });
  });

  describe("toData", () => {
    it("應正確轉換為純資料物件", () => {
      const publishedAt = new Date("2024-01-01");
      const post = Post.create({
        id: "post-1",
        slug: createSlug("my-post"),
        status: "PUBLISHED",
        publishedAt,
        deletedAt: null,
      });

      const data = post.toData();

      expect(data).toEqual({
        id: "post-1",
        slug: "my-post",
        status: "PUBLISHED",
        publishedAt,
        deletedAt: null,
      });
    });
  });
});
