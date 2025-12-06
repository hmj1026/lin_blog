import { describe, expect, it } from "vitest";
import { postSchema, postApiSchema, parsePostApiInput } from "@/lib/validations/post.schema";
import { PostStatus } from "@prisma/client";

describe("postSchema", () => {
    it("驗證有效的貼文資料", () => {
        const validPost = {
            slug: "test-slug",
            title: "Test Title",
            excerpt: "Test Excerpt",
            content: "Test Content",
            status: PostStatus.DRAFT,
        };
        const result = postSchema.safeParse(validPost);
        expect(result.success).toBe(true);
    });

    it("拒絕缺少的必填欄位", () => {
        const invalidPost = {
            title: "Missing Slug",
        };
        const result = postSchema.safeParse(invalidPost);
        expect(result.success).toBe(false);
    });
});

describe("postApiSchema", () => {
    it("接受有效的 ISO 日期字串", () => {
        const validApiInput = {
            slug: "test-slug",
            title: "Test Title",
            excerpt: "Test Excerpt",
            content: "Test Content",
            publishedAt: "2023-01-01T00:00:00.000Z",
        };
        const result = postApiSchema.safeParse(validApiInput);
        expect(result.success).toBe(true);
    });

    it("接受 null 作為 publishedAt", () => {
         const validApiInput = {
            slug: "test-slug",
            title: "Test Title",
            excerpt: "Test Excerpt",
            content: "Test Content",
            publishedAt: null,
        };
        const result = postApiSchema.safeParse(validApiInput);
        expect(result.success).toBe(true);
    });

     it("拒絕無效的日期字串", () => {
         const invalidApiInput = {
            slug: "test-slug",
            title: "Test Title",
            excerpt: "Test Excerpt",
            content: "Test Content",
            publishedAt: "invalid-date",
        };
        const result = postApiSchema.safeParse(invalidApiInput);
        expect(result.success).toBe(false);
    });
});


describe("parsePostApiInput", () => {
    it("將 ISO 日期字串轉換為 Date 物件", () => {
        const input = {
            slug: "s",
            title: "t",
            excerpt: "e",
            content: "c",
            publishedAt: "2023-01-01T00:00:00.000Z",
        };
        const output = parsePostApiInput(input);
        expect(output.publishedAt).toBeInstanceOf(Date);
        expect(output.publishedAt?.toISOString()).toBe("2023-01-01T00:00:00.000Z");
    });

    it("將 null 日期保持為 null", () => {
         const input = {
            slug: "s",
            title: "t",
            excerpt: "e",
            content: "c",
            publishedAt: null,
        };
        const output = parsePostApiInput(input);
        expect(output.publishedAt).toBeNull();
    });
});
