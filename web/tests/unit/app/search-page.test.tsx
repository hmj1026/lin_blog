import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server-queries", () => ({
  discoveryQueries: {
    searchPublicPosts: vi.fn(),
  },
}));

vi.mock("@/components/discovery/search-result-card", () => ({
  SearchResultCard: () => null,
}));

import SearchPage from "@/app/(frontend)/search/page";
import { discoveryQueries } from "@/lib/server-queries";

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoveryQueries.searchPublicPosts).mockResolvedValue({
      kind: "empty-query",
      query: "test",
    });
  });

  it.each(["2junk", "2.9", "1e2"])(
    "defaults malformed page %s to page 1",
    async (page) => {
      await SearchPage({ searchParams: Promise.resolve({ q: "test", page }) });

      expect(discoveryQueries.searchPublicPosts).toHaveBeenCalledWith({ query: "test", page: 1 });
    }
  );
});
