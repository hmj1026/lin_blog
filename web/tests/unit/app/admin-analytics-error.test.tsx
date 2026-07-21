import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AdminAnalyticsError from "@/app/(admin)/admin/analytics/posts/error";

describe("AdminAnalyticsError", () => {
  it("presents an accessible error and retries the route", async () => {
    const reset = vi.fn();
    render(<AdminAnalyticsError error={new Error("database unavailable")} reset={reset} />);

    expect(screen.getByRole("alert")).toHaveTextContent("無法載入文章統計");
    await userEvent.click(screen.getByRole("button", { name: "重新載入" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
