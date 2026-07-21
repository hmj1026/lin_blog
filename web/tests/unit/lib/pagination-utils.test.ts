import { describe, it, expect } from "vitest";
import { computeTotalPages, resolveOverflowPage } from "@/lib/server/pagination-utils";

describe("computeTotalPages", () => {
  it("ceils total/pageSize", () => {
    expect(computeTotalPages(25, 10)).toBe(3);
  });

  it("never returns less than 1, even for zero total", () => {
    expect(computeTotalPages(0, 10)).toBe(1);
  });
});

describe("resolveOverflowPage", () => {
  it("returns totalPages when the requested page overshoots an empty result with a non-zero total", () => {
    const overflow = resolveOverflowPage({ itemCount: 0, total: 25, page: 5, totalPages: 3 });
    expect(overflow).toBe(3);
  });

  it("returns null for a genuinely empty result (total is 0)", () => {
    const overflow = resolveOverflowPage({ itemCount: 0, total: 0, page: 5, totalPages: 1 });
    expect(overflow).toBeNull();
  });

  it("returns null when the requested page is within range", () => {
    const overflow = resolveOverflowPage({ itemCount: 10, total: 25, page: 1, totalPages: 3 });
    expect(overflow).toBeNull();
  });

  it("returns null when items exist even if page happens to be past totalPages", () => {
    const overflow = resolveOverflowPage({ itemCount: 1, total: 25, page: 5, totalPages: 3 });
    expect(overflow).toBeNull();
  });
});
