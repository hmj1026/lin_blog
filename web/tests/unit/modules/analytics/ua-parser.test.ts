import { describe, it, expect } from "vitest";
import { parseUserAgent, detectDeviceTypeFromUA } from "@/modules/analytics/domain/ua-parser";

describe("ua-parser", () => {
  describe("parseUserAgent", () => {
    it("parses Chrome on Windows correctly", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.browser.name).toBe("Chrome");
      expect(result.browser.version).toMatch(/^120/);
      expect(result.os.name).toBe("Windows");
      expect(result.os.version).toBe("10");
      expect(result.device.type).toBe("DESKTOP");
      expect(result.isBot).toBe(false);
    });

    it("parses Safari on iOS iPhone correctly", () => {
      const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const result = parseUserAgent(ua);

      expect(result.browser.name).toBe("Mobile Safari");
      expect(result.os.name).toBe("iOS");
      expect(result.device.type).toBe("MOBILE");
      expect(result.device.vendor).toBe("Apple");
      expect(result.device.model).toBe("iPhone");
      expect(result.isBot).toBe(false);
    });

    it("parses Firefox on Android correctly", () => {
      const ua = "Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0";
      const result = parseUserAgent(ua);

      expect(result.browser.name).toBe("Mobile Firefox");
      expect(result.os.name).toBe("Android");
      expect(result.device.type).toBe("MOBILE");
      expect(result.isBot).toBe(false);
    });

    it("parses Edge on macOS correctly", () => {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const result = parseUserAgent(ua);

      expect(result.browser.name).toBe("Edge");
      expect(result.os.name).toBe("macOS");
      expect(result.device.type).toBe("DESKTOP");
      expect(result.isBot).toBe(false);
    });

    it("parses iPad as tablet", () => {
      const ua = "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const result = parseUserAgent(ua);

      expect(result.device.type).toBe("TABLET");
      expect(result.device.model).toBe("iPad");
    });

    it("identifies Googlebot as bot", () => {
      const ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
      const result = parseUserAgent(ua);

      expect(result.isBot).toBe(true);
      expect(result.device.type).toBe("BOT");
    });

    it("identifies Bingbot as bot", () => {
      const ua = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
      const result = parseUserAgent(ua);

      expect(result.isBot).toBe(true);
      expect(result.device.type).toBe("BOT");
    });

    it("handles empty user agent", () => {
      const result = parseUserAgent("");

      expect(result.browser.name).toBe("Other");
      expect(result.os.name).toBe("Other");
      expect(result.device.type).toBe("OTHER");
      expect(result.isBot).toBe(false);
    });
  });

  describe("detectDeviceTypeFromUA", () => {
    it("returns DESKTOP for desktop browsers", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0";
      expect(detectDeviceTypeFromUA(ua)).toBe("DESKTOP");
    });

    it("returns MOBILE for mobile browsers", () => {
      const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15";
      expect(detectDeviceTypeFromUA(ua)).toBe("MOBILE");
    });

    it("returns TABLET for tablet browsers", () => {
      const ua = "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15";
      expect(detectDeviceTypeFromUA(ua)).toBe("TABLET");
    });

    it("returns BOT for bot user agents", () => {
      const ua = "Googlebot/2.1 (+http://www.google.com/bot.html)";
      expect(detectDeviceTypeFromUA(ua)).toBe("BOT");
    });
  });
});
