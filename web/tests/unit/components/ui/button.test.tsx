import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole("button", { name: "Click me" });
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies primary variant by default", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-white/90");
    expect(button).toHaveClass("backdrop-blur-sm");
  });

  it("applies secondary variant styles", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-white/85");
    expect(button).toHaveClass("border-purple/30");
  });

  it("applies ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("hover:bg-neutral-50/60");
  });

  // New Variants Tests
  describe("Danger Variant", () => {
    it("renders with red tinted glass background", () => {
      render(<Button variant="danger">刪除</Button>);
      const button = screen.getByRole("button", { name: "刪除" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("bg-red-50/90");
      expect(button).toHaveClass("text-red-800");
    });

    it("includes backdrop blur effect", () => {
      render(<Button variant="danger">刪除</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("backdrop-blur-sm");
    });

    it("has red border", () => {
      render(<Button variant="danger">刪除</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-red-300");
    });
  });

  describe("Outline Variant", () => {
    it("renders with transparent background and border", () => {
      render(<Button variant="outline">取消</Button>);
      const button = screen.getByRole("button", { name: "取消" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("bg-transparent");
      expect(button).toHaveClass("border-purple");
    });

    it("includes backdrop blur for glassmorphism", () => {
      render(<Button variant="outline">取消</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("backdrop-blur-sm");
    });
  });

  describe("Link Variant", () => {
    it("renders as text link without background", () => {
      render(<Button variant="link">了解更多</Button>);
      const button = screen.getByRole("button", { name: "了解更多" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("text-purple");
      expect(button).toHaveClass("underline");
    });

    it("has underline decoration", () => {
      render(<Button variant="link">連結</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("underline-offset-4");
    });
  });

  // Glassmorphism Effect Tests
  describe("Glassmorphism Effects", () => {
    it("applies backdrop blur to primary variant", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("backdrop-blur-sm");
    });

    it("applies semi-transparent background to primary", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-white/90");
    });

    it("applies backdrop blur to secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("backdrop-blur-sm");
    });
  });

  // Interactive States Tests
  describe("Interactive States", () => {
    it("includes hover translate effect", () => {
      render(<Button variant="primary">Hover Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:-translate-y-0.5");
    });

    it("includes active scale effect", () => {
      render(<Button variant="primary">Active Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("active:scale-[0.98]");
    });

    it("includes focus ring styles", () => {
      render(<Button>Focus Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:ring-2");
      expect(button).toHaveClass("focus-visible:ring-purple/50");
    });
  });

  it("disables the button when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-60");
  });

  it("applies custom class names", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
