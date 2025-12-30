import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => <div data-testid="ga" data-gaid={gaId} />,
  GoogleTagManager: ({ gtmId }: { gtmId: string }) => <div data-testid="gtm" data-gtmid={gtmId} />,
}));

vi.mock("next/script", () => ({
  default: ({ id }: { id?: string }) => <script data-testid={id ?? "next-script"} />,
}));

describe("AnalyticsProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders analytics providers when ids are present", async () => {
    vi.doMock("@/env.public", () => ({
      publicEnv: {
        NEXT_PUBLIC_GA_ID: "GA-TEST",
        NEXT_PUBLIC_GTM_ID: "GTM-TEST",
        NEXT_PUBLIC_FB_PIXEL_ID: "FB-TEST",
      },
    }));

    const { AnalyticsProvider } = await import("@/components/analytics-provider");
    render(<AnalyticsProvider />);

    expect(screen.getByTestId("ga")).toHaveAttribute("data-gaid", "GA-TEST");
    expect(screen.getByTestId("gtm")).toHaveAttribute("data-gtmid", "GTM-TEST");
    expect(screen.getByTestId("fb-pixel")).toBeInTheDocument();
  });

  it("renders nothing when ids are missing", async () => {
    vi.doMock("@/env.public", () => ({
      publicEnv: {
        NEXT_PUBLIC_GA_ID: undefined,
        NEXT_PUBLIC_GTM_ID: undefined,
        NEXT_PUBLIC_FB_PIXEL_ID: undefined,
      },
    }));

    const { AnalyticsProvider } = await import("@/components/analytics-provider");
    render(<AnalyticsProvider />);

    expect(screen.queryByTestId("ga")).toBeNull();
    expect(screen.queryByTestId("gtm")).toBeNull();
    expect(screen.queryByTestId("fb-pixel")).toBeNull();
  });
});
