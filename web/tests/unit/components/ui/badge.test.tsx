import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders with label", () => {
    render(<Badge label="New" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies accent tone styles", () => {
    render(<Badge label="Accent" tone="accent" />);
    // Note: We check if the class is present on the rendered element
    // Since component returns a span, getByText gets the span
    const badge = screen.getByText("Accent");
    expect(badge).toHaveClass("bg-orange-50");
  });

  it("applies muted tone by default", () => {
    render(<Badge label="Muted" />);
    const badge = screen.getByText("Muted");
    expect(badge).toHaveClass("bg-base-100");
  });

  it("applies custom class names", () => {
    render(<Badge label="Custom" className="custom-badge" />);
    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("custom-badge");
  });
});
