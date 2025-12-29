import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders with children content", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies accent variant styles", () => {
    render(<Badge variant="accent">Accent</Badge>);
    const badge = screen.getByText("Accent");
    expect(badge).toHaveClass("bg-orange-50");
  });

  it("applies success variant styles", () => {
    render(<Badge variant="success">Published</Badge>);
    const badge = screen.getByText("Published");
    expect(badge).toHaveClass("bg-green-50/90");
    expect(badge).toHaveClass("backdrop-blur-sm");
  });

  it("applies info variant styles", () => {
    render(<Badge variant="info">Scheduled</Badge>);
    const badge = screen.getByText("Scheduled");
    expect(badge).toHaveClass("bg-blue-50/90");
  });

  it("applies default variant by default", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toHaveClass("bg-base-100");
  });

  it("applies custom class names", () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("custom-badge");
  });
});
