import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialLinks } from "@/components/social-links";

describe("SocialLinks", () => {
  describe("rendering", () => {
    it("returns null when settings is null", () => {
      const { container } = render(<SocialLinks settings={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when no social links are enabled", () => {
      const { container } = render(
        <SocialLinks
          settings={{
            showFacebook: false,
            facebookUrl: null,
            showInstagram: false,
            instagramUrl: null,
            showThreads: false,
            threadsUrl: null,
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("returns null when enabled but no URL provided", () => {
      const { container } = render(
        <SocialLinks
          settings={{
            showFacebook: true,
            facebookUrl: null,
            showInstagram: true,
            instagramUrl: "",
            showThreads: false,
            threadsUrl: null,
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Facebook", () => {
    it("renders Facebook link when enabled with URL", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: true,
            facebookUrl: "https://facebook.com/test",
            showInstagram: false,
            instagramUrl: null,
            showThreads: false,
            threadsUrl: null,
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      const link = screen.getByTestId("social-link-facebook");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://facebook.com/test");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not render Facebook when disabled", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: false,
            facebookUrl: "https://facebook.com/test",
            showInstagram: true,
            instagramUrl: "https://instagram.com/test",
            showThreads: false,
            threadsUrl: null,
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      expect(screen.queryByTestId("social-link-facebook")).not.toBeInTheDocument();
    });
  });

  describe("Instagram", () => {
    it("renders Instagram link when enabled with URL", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: false,
            facebookUrl: null,
            showInstagram: true,
            instagramUrl: "https://instagram.com/test",
            showThreads: false,
            threadsUrl: null,
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      const link = screen.getByTestId("social-link-instagram");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://instagram.com/test");
    });
  });

  describe("Threads", () => {
    it("renders Threads link when enabled with URL", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: false,
            facebookUrl: null,
            showInstagram: false,
            instagramUrl: null,
            showThreads: true,
            threadsUrl: "https://threads.net/@test",
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      const link = screen.getByTestId("social-link-threads");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://threads.net/@test");
    });
  });

  describe("LINE", () => {
    it("renders LINE link when enabled with URL", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: false,
            facebookUrl: null,
            showInstagram: false,
            instagramUrl: null,
            showThreads: false,
            threadsUrl: null,
            showLine: true,
            lineUrl: "https://line.me/ti/p/@test",
          }}
        />
      );
      const link = screen.getByTestId("social-link-line");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://line.me/ti/p/@test");
    });
  });

  describe("multiple platforms", () => {
    it("renders all enabled platforms", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: true,
            facebookUrl: "https://facebook.com/test",
            showInstagram: true,
            instagramUrl: "https://instagram.com/test",
            showThreads: true,
            threadsUrl: "https://threads.net/@test",
            showLine: true,
            lineUrl: "https://line.me/ti/p/@test",
          }}
        />
      );
      expect(screen.getByTestId("social-links")).toBeInTheDocument();
      expect(screen.getByTestId("social-link-facebook")).toBeInTheDocument();
      expect(screen.getByTestId("social-link-instagram")).toBeInTheDocument();
      expect(screen.getByTestId("social-link-threads")).toBeInTheDocument();
      expect(screen.getByTestId("social-link-line")).toBeInTheDocument();
    });

    it("renders only enabled platforms selectively", () => {
      render(
        <SocialLinks
          settings={{
            showFacebook: true,
            facebookUrl: "https://facebook.com/test",
            showInstagram: false,
            instagramUrl: null,
            showThreads: true,
            threadsUrl: "https://threads.net/@test",
            showLine: false,
            lineUrl: null,
          }}
        />
      );
      expect(screen.getByTestId("social-link-facebook")).toBeInTheDocument();
      expect(screen.queryByTestId("social-link-instagram")).not.toBeInTheDocument();
      expect(screen.getByTestId("social-link-threads")).toBeInTheDocument();
      expect(screen.queryByTestId("social-link-line")).not.toBeInTheDocument();
    });
  });
});
