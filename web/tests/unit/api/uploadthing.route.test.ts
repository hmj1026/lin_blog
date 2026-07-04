import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/uploadthing/route";

describe("POST /api/uploadthing", () => {
  it("returns 501 not-implemented with no side effects", async () => {
    const res = await POST();
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.message).toContain("UPLOADTHING_TOKEN");
  });
});
