import { UAParser } from "ua-parser-js";
import type { DeviceType } from "./device-type";

export type ParsedUserAgent = {
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  device: {
    type: DeviceType;
    vendor: string;
    model: string;
  };
  isBot: boolean;
};

// 常見的 Bot 關鍵字
const BOT_PATTERNS = [
  "bot",
  "crawler",
  "spider",
  "scraper",
  "googlebot",
  "bingbot",
  "yandexbot",
  "baiduspider",
  "facebookexternalhit",
  "twitterbot",
  "slurp",
  "duckduckbot",
  "applebot",
  "semrushbot",
  "ahrefsbot",
];

/**
 * 檢測 User-Agent 是否為 Bot
 */
function isBotUA(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * 將 ua-parser-js 的裝置類型轉換為系統的 DeviceType
 */
function mapDeviceType(type: string | undefined, isBot: boolean): DeviceType {
  if (isBot) return "BOT";
  
  switch (type) {
    case "mobile":
      return "MOBILE";
    case "tablet":
      return "TABLET";
    case "console":
    case "smarttv":
    case "wearable":
    case "embedded":
      return "OTHER";
    default:
      // desktop 或 undefined 都視為桌面
      return "DESKTOP";
  }
}

/**
 * 解析 User-Agent 字串
 * @param ua User-Agent 字串
 * @returns 解析後的結構化資料
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  const isBot = isBotUA(ua);
  
  // 空字串處理
  if (!ua.trim()) {
    return {
      browser: { name: "Other", version: "" },
      os: { name: "Other", version: "" },
      device: { type: "OTHER", vendor: "", model: "" },
      isBot: false,
    };
  }
  
  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  
  return {
    browser: {
      name: browser.name || "Other",
      version: browser.version || "",
    },
    os: {
      name: os.name || "Other",
      version: os.version || "",
    },
    device: {
      type: mapDeviceType(device.type, isBot),
      vendor: device.vendor || "",
      model: device.model || "",
    },
    isBot,
  };
}

/**
 * 從 User-Agent 偵測裝置類型
 * @param ua User-Agent 字串
 * @returns DeviceType
 */
export function detectDeviceTypeFromUA(ua: string): DeviceType {
  return parseUserAgent(ua).device.type;
}

/**
 * 簡化版解析 - 用於統計匯總（只返回 browser 和 os 名稱）
 * @param ua User-Agent 字串
 * @returns 瀏覽器和作業系統名稱
 */
export function parseSimpleUA(ua: string): { browser: string; os: string } {
  const parsed = parseUserAgent(ua);
  return {
    browser: parsed.isBot ? "Bot" : parsed.browser.name,
    os: parsed.os.name,
  };
}
