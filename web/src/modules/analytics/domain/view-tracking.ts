import type { DeviceType } from "./device-type";

export function isBotUserAgent(ua: string) {
  return /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|embedly|quora link preview|preview)/i.test(
    ua
  );
}

export function detectDeviceType(ua: string): DeviceType {
  if (!ua) return "OTHER";
  if (isBotUserAgent(ua)) return "BOT";
  if (/tablet|ipad/i.test(ua)) return "TABLET";
  if (/mobi|iphone|android/i.test(ua)) return "MOBILE";
  return "DESKTOP";
}

