export const DEVICE_TYPES = ["DESKTOP", "MOBILE", "TABLET", "BOT", "OTHER"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export function isDeviceType(value: string): value is DeviceType {
  return (DEVICE_TYPES as readonly string[]).includes(value);
}

