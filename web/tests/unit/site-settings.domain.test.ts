import { describe, it, expect } from "vitest";
import { DEFAULT_SITE_SETTING_KEY } from "@/modules/site-settings/domain";

describe("site-settings domain", () => {
  it("uses default key", () => {
    expect(DEFAULT_SITE_SETTING_KEY).toBe("default");
  });
});

