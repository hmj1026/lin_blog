import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders with default props", () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("border-line");
  });

  it("handles text input", async () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    await userEvent.type(input, "Hello");
    expect(input).toHaveValue("Hello");
  });

  it("applies subtle state styles", () => {
    render(<Input state="subtle" placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toHaveClass("border-transparent");
  });

  it("applies custom class names", () => {
    render(<Input className="custom-input" placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toHaveClass("custom-input");
  });
});
