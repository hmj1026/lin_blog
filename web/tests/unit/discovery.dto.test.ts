import { describe, it, expect } from "vitest";
import { toPublicPostSummary } from "@/modules/discovery/application/dto";
import type { PostSourceRecord } from "@/modules/discovery/application/ports";

describe("toPublicPostSummary", () => {
  const source: PostSourceRecord = {
    id: "internal-id-1",
    slug: "hello-world",
    title: "Hello World",
    excerpt: "excerpt text",
    coverImage: "/images/cover.png",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: "Tech",
  };

  it("maps only the public whitelist fields", () => {
    const dto = toPublicPostSummary(source);
    expect(Object.keys(dto).sort()).toEqual(
      ["category", "coverImage", "excerpt", "publishedAt", "slug", "title"].sort()
    );
  });

  it("excludes internal id and admin-only fields", () => {
    const dto = toPublicPostSummary(source);
    expect(dto).not.toHaveProperty("id");
    expect(dto).not.toHaveProperty("status");
    expect(dto).not.toHaveProperty("deletedAt");
    expect(dto).not.toHaveProperty("authorId");
    expect(dto).not.toHaveProperty("content");
  });

  it("returns frozen (immutable) output", () => {
    const dto = toPublicPostSummary(source);
    expect(Object.isFrozen(dto)).toBe(true);
  });

  it("formats publishedAt as an ISO string", () => {
    const dto = toPublicPostSummary(source);
    expect(dto.publishedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("keeps publishedAt null when the source has no publishedAt", () => {
    const dto = toPublicPostSummary({ ...source, publishedAt: null });
    expect(dto.publishedAt).toBeNull();
  });

  it("preserves category null when the post has no category", () => {
    const dto = toPublicPostSummary({ ...source, category: null });
    expect(dto.category).toBeNull();
  });
});
