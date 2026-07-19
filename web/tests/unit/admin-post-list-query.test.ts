import { describe, expect, it } from "vitest";

import { normalizeAdminPostListQuery } from "@/modules/posts/application/admin-post-list-query";

describe("normalizeAdminPostListQuery", () => {
  it("clamps invalid pagination and falls back to the default sort", () => {
    expect(normalizeAdminPostListQuery({ page: "-9", pageSize: "999", sort: "invalid" })).toMatchObject({
      page: 1,
      pageSize: 100,
      sort: "updated-desc",
    });
  });

  it("accepts URL-driven filters and trims the search query", () => {
    expect(normalizeAdminPostListQuery({
      q: "  launch  ",
      status: "DRAFT",
      category: "cat-1",
      tag: "tag-1",
      featured: "true",
      view: "trash",
      sort: "title-asc",
      page: "2",
      pageSize: "25",
    })).toEqual({
      query: "launch",
      status: "DRAFT",
      categoryId: "cat-1",
      tagId: "tag-1",
      featured: true,
      deleted: true,
      sort: "title-asc",
      page: 2,
      pageSize: 25,
    });
  });

  it("drops illegal enum and boolean filters", () => {
    expect(normalizeAdminPostListQuery({ status: "UNKNOWN", featured: "sometimes", view: "all" })).toMatchObject({
      status: undefined,
      featured: undefined,
      deleted: false,
    });
  });
});
