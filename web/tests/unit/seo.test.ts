import { describe, expect, it } from "vitest";
import { buildArticleJsonLd } from "@/lib/utils/seo";

describe("seo", () => {
    describe("buildArticleJsonLd", () => {
        it("產生正確的 JSON-LD 物件", () => {
            const params = {
                url: "https://example.com/post/1",
                title: "Test Post",
                description: "Description",
                datePublished: "2023-01-01",
                authorName: "Author",
                image: "img.jpg",
            };
            const result = buildArticleJsonLd(params);
            
            expect(result["@context"]).toBe("https://schema.org");
            expect(result["@type"]).toBe("Article");
            expect(result.headline).toBe(params.title);
            expect(result.description).toBe(params.description);
            expect(result.image).toEqual([params.image]);
            expect(result.author.name).toBe(params.authorName);
            expect(result.datePublished).toBe(params.datePublished);
            expect(result.dateModified).toBe(params.datePublished); // fallback to published
        });

        it("處理可選欄位", () => {
             const params = {
                url: "https://example.com/post/1",
                title: "Test Post",
                description: "Description",
            };
            const result = buildArticleJsonLd(params);

            expect(result.image).toBeUndefined();
            expect(result.author.name).toBeUndefined();
            expect(result.dateModified).toBeUndefined();
        });
        
         it("使用 dateModified 當已提供時", () => {
             const params = {
                url: "https://example.com/post/1",
                title: "Test Post",
                description: "Description",
                datePublished: "2023-01-01",
                dateModified: "2023-01-02",
            };
            const result = buildArticleJsonLd(params);

            expect(result.datePublished).toBe("2023-01-01");
            expect(result.dateModified).toBe("2023-01-02");
        });
    });
});
