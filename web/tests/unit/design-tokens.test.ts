import { colors, typography, shadows } from "@/lib/design-tokens";
import { describe, it, expect } from "vitest";

describe("design-tokens", () => {
  it("包含主色與強調色", () => {
    expect(colors.primary).toBe("#232536");
    expect(colors.accent).toBe("#FFD050");
  });

  it("包含標題與內文字型", () => {
    expect(typography.fontDisplay).toContain("Sen");
    expect(typography.fontSans).toContain("Inter");
  });

  it("包含陰影樣式", () => {
    expect(shadows.card).toBeTruthy();
  });
});
