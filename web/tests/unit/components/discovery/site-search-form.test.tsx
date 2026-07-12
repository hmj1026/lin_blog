import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SiteSearchForm } from "@/components/discovery/site-search-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("SiteSearchForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("has a visible, programmatically associated label for the search input", () => {
    render(<SiteSearchForm />);
    expect(screen.getByLabelText("站內搜尋")).toBeInTheDocument();
  });

  it("navigates to /search?q=<trimmed-and-encoded-query> on submit", () => {
    render(<SiteSearchForm />);
    fireEvent.change(screen.getByLabelText("站內搜尋"), { target: { value: "  hello world  " } });
    fireEvent.click(screen.getByRole("button", { name: "搜尋" }));

    expect(pushMock).toHaveBeenCalledWith("/search?q=hello%20world");
  });

  it("does not navigate and shows an accessible hint when the query is empty or whitespace-only", () => {
    render(<SiteSearchForm />);
    fireEvent.change(screen.getByLabelText("站內搜尋"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "搜尋" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/請輸入關鍵字/);
    expect(screen.getByLabelText("站內搜尋")).toHaveAttribute("aria-describedby", expect.stringContaining(""));
  });

  it("submits via the Enter key", () => {
    render(<SiteSearchForm />);
    const input = screen.getByLabelText("站內搜尋");
    fireEvent.change(input, { target: { value: "keyword" } });
    fireEvent.submit(input.closest("form")!);

    expect(pushMock).toHaveBeenCalledWith("/search?q=keyword");
  });
});
