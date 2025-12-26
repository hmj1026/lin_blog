import { describe, it, expect, vi, beforeEach } from "vitest";
import { slugify, pad2, formatDateTime, parseJson } from "@/components/admin/post-form/utils";

describe("post-form utils", () => {
  describe("slugify", () => {
    it("should convert text to lowercase slug", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("should replace special characters with hyphens", () => {
      expect(slugify("Hello! World?")).toBe("hello-world");
    });

    it("should handle multiple spaces and hyphens", () => {
      expect(slugify("Hello   World")).toBe("hello-world");
      expect(slugify("Hello---World")).toBe("hello-world");
    });

    it("should trim leading and trailing hyphens", () => {
      expect(slugify("-Hello World-")).toBe("hello-world");
    });

    it("should return empty string for empty input", () => {
      expect(slugify("")).toBe("");
      expect(slugify("   ")).toBe("");
    });

    it("should handle unicode characters", () => {
      expect(slugify("你好世界")).toBe("你好世界");
      expect(slugify("Café Art")).toBe("café-art");
    });
  });

  describe("pad2", () => {
    it("should pad single digit with zero", () => {
      expect(pad2(5)).toBe("05");
      expect(pad2(0)).toBe("00");
    });

    it("should not pad double digit", () => {
      expect(pad2(12)).toBe("12");
      expect(pad2(99)).toBe("99");
    });
  });

  describe("formatDateTime", () => {
    it("should format date in 24h format", () => {
      const date = new Date(2024, 0, 15, 14, 30, 45);
      expect(formatDateTime(date, "24h")).toBe("2024-01-15 14:30:45");
    });

    it("should format date in 12h format (PM)", () => {
      const date = new Date(2024, 0, 15, 14, 30, 45);
      expect(formatDateTime(date, "12h")).toBe("2024-01-15 02:30:45 PM");
    });

    it("should format date in 12h format (AM)", () => {
      const date = new Date(2024, 0, 15, 9, 5, 3);
      expect(formatDateTime(date, "12h")).toBe("2024-01-15 09:05:03 AM");
    });

    it("should handle midnight in 12h format", () => {
      const date = new Date(2024, 0, 15, 0, 0, 0);
      expect(formatDateTime(date, "12h")).toBe("2024-01-15 12:00:00 AM");
    });

    it("should handle noon in 12h format", () => {
      const date = new Date(2024, 0, 15, 12, 0, 0);
      expect(formatDateTime(date, "12h")).toBe("2024-01-15 12:00:00 PM");
    });
  });

  describe("parseJson", () => {
    it("should parse response json", async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ success: true, data: { id: "1" } }),
      } as unknown as Response;

      const result = await parseJson(mockResponse);
      expect(result).toEqual({ success: true, data: { id: "1" } });
    });
  });
});
