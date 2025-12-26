import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/site-settings/route";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { requirePermission } from "@/lib/api-utils";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/modules/site-settings", () => ({
  siteSettingsUseCases: {
    getOrCreateDefault: vi.fn(),
    updateDefault: vi.fn(),
  },
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

describe("API: /api/site-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns settings", async () => {
      const mockSettings = { siteName: "My Blog" };
      (siteSettingsUseCases.getOrCreateDefault as any).mockResolvedValue(mockSettings);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual(mockSettings);
    });
  });

  describe("PUT", () => {
    it("updates settings when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockSettings = { siteName: "Updated Blog" };
      (siteSettingsUseCases.updateDefault as any).mockResolvedValue(mockSettings);

      const request = new Request("http://localhost/api/site-settings", {
        method: "PUT",
        body: JSON.stringify({ siteName: "Updated Blog" }),
      });

      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual(mockSettings);
      expect(siteSettingsUseCases.updateDefault).toHaveBeenCalledWith(expect.objectContaining({ siteName: "Updated Blog" }));
    });

    it("returns error when unauthorized", async () => {
      const errorResponse = NextResponse.json({ message: "Forbidden" }, { status: 403 });
      (requirePermission as any).mockResolvedValue(errorResponse);

      const request = new Request("http://localhost/api/site-settings", {
        method: "PUT",
        body: JSON.stringify({}),
      });

      const response = await PUT(request);
      expect(response.status).toBe(403);
    });
  });
});
