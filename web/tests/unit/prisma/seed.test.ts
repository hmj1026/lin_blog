import { describe, expect, it } from "vitest";
import { resolveAdminCredentials } from "../../../prisma/seed";

describe("Prisma seed admin credentials", () => {
  it("reads admin credentials from environment variables", () => {
    expect(
      resolveAdminCredentials({
        ADMIN_EMAIL: "ci-admin@example.com",
        ADMIN_PASSWORD: "ci-admin-password",
      })
    ).toEqual({
      email: "ci-admin@example.com",
      password: "ci-admin-password",
    });
  });

  it("keeps the local development defaults", () => {
    expect(resolveAdminCredentials({})).toEqual({
      email: "admin@lin.blog",
      password: "admin",
    });
  });
});
