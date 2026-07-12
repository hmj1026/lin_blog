import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "./helpers/db";

/**
 * SiteSetting migration contract.
 *
 * These fields are consumed by the public home page and admin settings flow.
 * Querying information_schema keeps the test focused on the deployed database
 * contract instead of only proving that Prisma can compile against the model.
 */
describe("SiteSetting table DB contract", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("contains the homepage and social fields required by the Prisma model", async () => {
    const rows = await prisma.$queryRawUnsafe<
      { column_name: string; data_type: string; is_nullable: string; column_default: string | null }[]
    >(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'SiteSetting'`
    );

    const byName = Object.fromEntries(rows.map((row) => [row.column_name, row]));
    const textFields = [
      "featuredTitle",
      "featuredDesc",
      "categoriesTitle",
      "categoriesDesc",
      "latestTitle",
      "latestDesc",
      "communityTitle",
      "communityDesc",
      "facebookUrl",
      "instagramUrl",
      "threadsUrl",
      "lineUrl",
    ];

    for (const field of textFields) {
      expect(byName[field], `${field} must exist`).toBeDefined();
      expect(byName[field].data_type, `${field} must be text`).toBe("text");
      expect(byName[field].is_nullable, `${field} must be nullable`).toBe("YES");
    }

    for (const field of ["showFacebook", "showInstagram", "showThreads", "showLine"]) {
      expect(byName[field], `${field} must exist`).toBeDefined();
      expect(byName[field].data_type, `${field} must be boolean`).toBe("boolean");
      expect(byName[field].is_nullable, `${field} must be required`).toBe("NO");
      expect(byName[field].column_default, `${field} must default false`).toMatch(/false/i);
    }
  });
});
