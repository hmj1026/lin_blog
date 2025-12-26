import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("a", "b")).toBe("a b");
    });

    it("filters out falsy values", () => {
      expect(cn("a", false, null, undefined, "b")).toBe("a b");
    });

    it("returns empty string for empty input", () => {
      expect(cn()).toBe("");
    });
  });
});
