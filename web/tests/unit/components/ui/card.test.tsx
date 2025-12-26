import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/card";

describe("Card", () => {
  it("renders with children", () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("applies padding styles", () => {
    render(<Card padding="lg">Content</Card>);
    // Card renders a div, getByText returns the text node? No, typically bubbling up to the container div if it's the direct child?
    // Actually getByText returns the element containing the text.
    // If <div ...>Content</div>, it returns the div.
    const card = screen.getByText("Content");
    expect(card).toHaveClass("p-8");
  });

  it("applies default padding", () => {
    render(<Card>Content</Card>);
    const card = screen.getByText("Content");
    expect(card).toHaveClass("p-6");
  });

  it("applies custom class names", () => {
    render(<Card className="custom-card">Content</Card>);
    const card = screen.getByText("Content");
    expect(card).toHaveClass("custom-card");
  });
});
