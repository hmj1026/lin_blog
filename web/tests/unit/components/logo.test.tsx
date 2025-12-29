import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "@/components/logo";

describe("Logo", () => {
  describe("預設值", () => {
    it("無 props 時顯示預設 siteName 'Lin Blog'", () => {
      render(<Logo />);
      expect(screen.getByText("Lin Blog")).toBeInTheDocument();
    });

    it("無 props 時顯示預設 tagline '內容．社群．設計'", () => {
      render(<Logo />);
      expect(screen.getByText("內容．社群．設計")).toBeInTheDocument();
    });
  });

  describe("自訂值", () => {
    it("renders custom siteName when provided", () => {
      render(<Logo siteName="我的部落格" />);
      expect(screen.getByText("我的部落格")).toBeInTheDocument();
      expect(screen.queryByText("Lin Blog")).not.toBeInTheDocument();
    });

    it("renders custom tagline when provided", () => {
      render(<Logo tagline="分享技術心得" />);
      expect(screen.getByText("分享技術心得")).toBeInTheDocument();
      expect(screen.queryByText("內容．社群．設計")).not.toBeInTheDocument();
    });

    it("renders both custom siteName and tagline", () => {
      render(<Logo siteName="科技日誌" tagline="程式與生活" />);
      expect(screen.getByText("科技日誌")).toBeInTheDocument();
      expect(screen.getByText("程式與生活")).toBeInTheDocument();
    });
  });

  describe("compact 模式", () => {
    it("compact 模式下隱藏 siteName 和 tagline", () => {
      render(<Logo compact />);
      expect(screen.queryByText("Lin Blog")).not.toBeInTheDocument();
      expect(screen.queryByText("內容．社群．設計")).not.toBeInTheDocument();
    });

    it("compact 模式下仍顯示 Lin 圖標", () => {
      render(<Logo compact />);
      expect(screen.getByText("Lin")).toBeInTheDocument();
    });
  });
});
