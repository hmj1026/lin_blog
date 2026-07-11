import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostDiscoveryPanel } from "@/components/discovery/post-discovery-panel";
import type { DiscoverySectionState } from "@/components/discovery/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/env.public", () => ({ publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: undefined } }));

const empty: DiscoverySectionState = { status: "empty" };

describe("PostDiscoveryPanel", () => {
  it("sidebar variant is sticky, width-bounded within 280-320px, and clips overflow with scroll", () => {
    const { container } = render(<PostDiscoveryPanel variant="sidebar" popular={empty} latest={empty} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toMatch(/sticky/);
    expect(root.className).toMatch(/top-24/);
    expect(root.className).toMatch(/w-\[(28|29|30|31|32)0px\]/);
    expect(root.className).toMatch(/max-h-\[calc\(100vh-8rem\)\]/);
    expect(root.className).toMatch(/overflow-y-auto/);
  });

  it("sidebar variant is hidden on narrow viewports (visible only at lg breakpoint)", () => {
    const { container } = render(<PostDiscoveryPanel variant="sidebar" popular={empty} latest={empty} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toMatch(/\bhidden\b/);
    expect(root.className).toMatch(/lg:block/);
  });

  it("stacked variant is a full-width block with no sticky/width-cap classes and no horizontal overflow classes", () => {
    const { container } = render(<PostDiscoveryPanel variant="stacked" popular={empty} latest={empty} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).not.toMatch(/sticky/);
    expect(root.className).not.toMatch(/w-\[280px\]/);
    expect(root.className).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
    expect(root.className).toMatch(/lg:hidden/);
  });

  it("stacked variant renders the four discovery sections in order", () => {
    render(<PostDiscoveryPanel variant="stacked" popular={empty} latest={empty} />);
    const texts = screen.getAllByText(/站內搜尋|Newsletter|熱門文章|最新文章/).map((el) => el.textContent);
    expect(texts.indexOf("站內搜尋")).toBeLessThan(texts.indexOf("Newsletter"));
    expect(texts.indexOf("Newsletter")).toBeLessThan(texts.indexOf("熱門文章"));
    expect(texts.indexOf("熱門文章")).toBeLessThan(texts.indexOf("最新文章"));
  });

  it("grid variant renders a responsive grid container with no horizontal overflow and no iframe inside", () => {
    const { container } = render(<PostDiscoveryPanel variant="grid" popular={empty} latest={empty} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toMatch(/grid/);
    expect(root.className).toMatch(/grid-cols-1/);
    expect(root.className).toMatch(/md:grid-cols-2/);
    expect(root.className).toMatch(/xl:grid-cols-4/);
    expect(root.className).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
  });
});
