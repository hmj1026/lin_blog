/**
 * `SubscriberWriteRepository` 的 Prisma 實作。
 *
 * 只捕捉 `P2002`（唯一約束衝突，對應 `email` 欄位）並映射為
 * `{ outcome: "conflict" }`；其他任何非預期錯誤一律原樣往外拋出，
 * 由呼叫端（use-case）決定如何處理，port 本身未定義泛化錯誤 outcome，
 * 故不得在此新增未經 ports.ts 定義的結果型別。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateSubscriberResult, SubscriberRecord, SubscriberWriteRepository } from "../../application/ports";
import { subscriberRecordSelect, toSubscriberRecord } from "./mappers";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export const subscriberWriteRepositoryPrisma: SubscriberWriteRepository = {
  async findByEmail(normalizedEmail: string): Promise<SubscriberRecord | null> {
    const row = await prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
      select: subscriberRecordSelect,
    });
    return row ? toSubscriberRecord(row) : null;
  },

  async create(params: { name: string; email: string }): Promise<CreateSubscriberResult> {
    try {
      const row = await prisma.subscriber.create({
        data: { name: params.name, email: params.email },
        select: subscriberRecordSelect,
      });
      return { outcome: "created", subscriber: toSubscriberRecord(row) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        return { outcome: "conflict" };
      }
      throw error;
    }
  },
};
