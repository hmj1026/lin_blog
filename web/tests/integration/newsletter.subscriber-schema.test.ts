import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";

/**
 * `Subscriber` 資料表的 DB-contract 整合測試（task 4.1）。
 *
 * 直接查詢 `information_schema` / `pg_catalog`，鎖定欄位、唯一約束與索引的
 * 資料庫層事實，而非只驗證 Prisma client 行為，避免 migration 之後意外
 * 修改欄位型別、nullable 或約束卻沒有測試察覺。
 */
describe("Subscriber table DB contract", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  it("exists as a table in the public schema", async () => {
    const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Subscriber'`
    );
    expect(rows).toHaveLength(1);
  });

  it("declares id, name, email, createdAt, updatedAt with expected types and nullability", async () => {
    const rows = await prisma.$queryRawUnsafe<
      { column_name: string; data_type: string; is_nullable: string }[]
    >(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'Subscriber'
       ORDER BY column_name`
    );

    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r]));

    expect(byName.id).toBeDefined();
    expect(byName.id.data_type).toBe("text");
    expect(byName.id.is_nullable).toBe("NO");

    expect(byName.name).toBeDefined();
    expect(byName.name.data_type).toBe("text");
    expect(byName.name.is_nullable).toBe("NO");

    expect(byName.email).toBeDefined();
    expect(byName.email.data_type).toBe("text");
    expect(byName.email.is_nullable).toBe("NO");

    expect(byName.createdAt).toBeDefined();
    expect(byName.createdAt.data_type).toBe("timestamp without time zone");
    expect(byName.createdAt.is_nullable).toBe("NO");

    expect(byName.updatedAt).toBeDefined();
    expect(byName.updatedAt.data_type).toBe("timestamp without time zone");
    expect(byName.updatedAt.is_nullable).toBe("NO");
  });

  it("has id as the primary key", async () => {
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public' AND tc.table_name = 'Subscriber' AND tc.constraint_type = 'PRIMARY KEY'`
    );
    expect(rows.map((r) => r.column_name)).toEqual(["id"]);
  });

  it("enforces a unique constraint on email at the database level", async () => {
    // Prisma's `@unique` produces a plain `CREATE UNIQUE INDEX`, not a named
    // table CONSTRAINT, so information_schema.table_constraints won't list it.
    // Query pg_index/pg_indexes directly for a unique index covering `email`.
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'Subscriber' AND indexdef ILIKE 'CREATE UNIQUE INDEX%'`
    );
    const hasEmailUniqueIndex = rows.some((r) => /\(email\)/i.test(r.indexdef));
    expect(hasEmailUniqueIndex).toBe(true);
  });

  it("rejects a duplicate email insert via Prisma client", async () => {
    await prisma.subscriber.create({ data: { name: "Reader One", email: "dup@example.com" } });

    await expect(
      prisma.subscriber.create({ data: { name: "Reader Two", email: "dup@example.com" } })
    ).rejects.toThrow();
  });

  it("has an index supporting createdAt ordering", async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Subscriber'`
    );
    const hasCreatedAtIndex = rows.some((r) => r.indexdef.includes('"createdAt"'));
    expect(hasCreatedAtIndex).toBe(true);
  });
});
