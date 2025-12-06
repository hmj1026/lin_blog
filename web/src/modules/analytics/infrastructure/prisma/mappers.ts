import type { DeviceType } from "../../domain";
import type { DeviceType as PrismaDeviceType } from "@prisma/client";

export function mapDeviceTypeFromPrisma(value: string): DeviceType {
  if (value === "DESKTOP" || value === "MOBILE" || value === "TABLET" || value === "BOT" || value === "OTHER") return value;
  throw new Error(`Unknown DeviceType: ${value}`);
}

export function mapDeviceTypeToPrisma(value: DeviceType): PrismaDeviceType {
  return value;
}

