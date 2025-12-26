import { describe, it, expect } from "vitest";
import { getPost, getRelatedPosts, posts } from "@/data/posts";

describe("data/posts", () => {
  describe("getPost", () => {
    it("returns post by slug", () => {
      const slug = posts[0].slug;
      const result = getPost(slug);
      expect(result).toBeDefined();
      expect(result?.slug).toBe(slug);
    });

    it("returns undefined for non-existent slug", () => {
      const result = getPost("non-existent-slug");
      expect(result).toBeUndefined();
    });
  });

  describe("getRelatedPosts", () => {
    it("returns related posts by category or tags", () => {
      // Find a post that definitely has related contents
      // "community-first-blog-strategy" (Strategy)
      const target = posts[0];
      
      const related = getRelatedPosts(target.slug);
      
      expect(related.length).toBeGreaterThan(0);
      expect(related.length).toBeLessThanOrEqual(3);
      
      // Should not include itself
      expect(related.find(p => p.slug === target.slug)).toBeUndefined();
      
      // Should match category or tags
      related.forEach(p => {
        const hasCommonTag = p.tags.some(t => target.tags.includes(t));
        const sameCategory = p.category === target.category;
        expect(hasCommonTag || sameCategory).toBe(true);
      });
    });

    it("returns empty for unknown slug", () => {
      const related = getRelatedPosts("unknown");
      expect(related).toEqual([]);
    });

    it("respects take limit", () => {
      const target = posts[0];
      const related = getRelatedPosts(target.slug, 1);
      expect(related.length).toBeLessThanOrEqual(1);
    });
  });
});
