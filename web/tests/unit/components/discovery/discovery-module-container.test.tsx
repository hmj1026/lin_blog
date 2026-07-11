import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscoveryModuleContainer } from "@/components/discovery/discovery-module-container";
import type { DiscoverySectionState } from "@/components/discovery/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/env.public", () => ({ publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: undefined } }));

const summary = (slug: string) => ({
  slug,
  title: `Title ${slug}`,
  excerpt: "",
  coverImage: null,
  publishedAt: null,
  category: null,
});

const content = (slugs: string[]): DiscoverySectionState => ({ status: "content", items: slugs.map(summary) });

describe("DiscoveryModuleContainer", () => {
  it("renders sections in the strict order: search, newsletter, popular, latest", () => {
    render(
      <DiscoveryModuleContainer popular={content(["p1"])} latest={content(["l1"])} />
    );

    const headingsAndLabels = screen.getAllByText(/站內搜尋|Newsletter|熱門文章|最新文章/);
    const texts = headingsAndLabels.map((el) => el.textContent);
    const searchIdx = texts.findIndex((t) => t === "站內搜尋");
    const newsletterIdx = texts.findIndex((t) => t === "Newsletter");
    const popularIdx = texts.findIndex((t) => t === "熱門文章");
    const latestIdx = texts.findIndex((t) => t === "最新文章");

    expect(searchIdx).toBeGreaterThanOrEqual(0);
    expect(searchIdx).toBeLessThan(newsletterIdx);
    expect(newsletterIdx).toBeLessThan(popularIdx);
    expect(popularIdx).toBeLessThan(latestIdx);
  });

  it("caps popular and latest lists at 5 items each with stable slug keys", () => {
    const slugs = Array.from({ length: 8 }, (_, i) => `s${i}`);
    render(<DiscoveryModuleContainer popular={content(slugs)} latest={content(slugs)} />);

    expect(screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/blog/"))).toHaveLength(10);
  });

  it("isolates errors: a failed popular section still renders latest content and the search/newsletter modules", () => {
    render(
      <DiscoveryModuleContainer popular={{ status: "error" }} latest={content(["l1"])} />
    );

    expect(screen.getByLabelText("站內搜尋")).toBeInTheDocument();
    expect(screen.getByText("Newsletter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Title l1/ })).toBeInTheDocument();
  });

  it("shows empty states for popular/latest independently", () => {
    render(<DiscoveryModuleContainer popular={{ status: "empty" }} latest={content(["l1"])} />);

    expect(screen.getByText("目前沒有熱門文章。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Title l1/ })).toBeInTheDocument();
  });
});
