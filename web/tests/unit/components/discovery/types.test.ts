import { describe, it, expect } from "vitest";
import { toDiscoverySectionState, DISCOVERY_SECTION_MAX_ITEMS } from "@/components/discovery/types";

const item = (slug: string) => ({
  slug,
  title: `Title ${slug}`,
  excerpt: "excerpt",
  coverImage: null,
  publishedAt: null,
  category: null,
});

describe("toDiscoverySectionState", () => {
  it("returns an error state when the query result failed", () => {
    const state = toDiscoverySectionState({ ok: false, items: [] });
    expect(state).toEqual({ status: "error" });
  });

  it("returns an empty state when the query succeeded with no items", () => {
    const state = toDiscoverySectionState({ ok: true, items: [] });
    expect(state).toEqual({ status: "empty" });
  });

  it("returns a content state carrying the items when the query succeeded", () => {
    const items = [item("a"), item("b")];
    const state = toDiscoverySectionState({ ok: true, items });
    expect(state).toEqual({ status: "content", items });
  });

  it("caps content items at the max (5)", () => {
    const items = Array.from({ length: 8 }, (_, i) => item(`s${i}`));
    const state = toDiscoverySectionState({ ok: true, items });
    expect(state.status).toBe("content");
    if (state.status === "content") {
      expect(state.items).toHaveLength(DISCOVERY_SECTION_MAX_ITEMS);
      expect(DISCOVERY_SECTION_MAX_ITEMS).toBe(5);
    }
  });
});
