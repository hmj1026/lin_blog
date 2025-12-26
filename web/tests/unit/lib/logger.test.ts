import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { logger, withApiLogging } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logger methods", () => {
    it("should log debug messages", () => {
      logger.debug("Debug message");
      expect(console.log).toHaveBeenCalled();
    });

    it("should log info messages", () => {
      logger.info("Info message");
      expect(console.log).toHaveBeenCalled();
    });

    it("should log warn messages", () => {
      logger.warn("Warning message");
      expect(console.warn).toHaveBeenCalled();
    });

    it("should log error messages", () => {
      logger.error("Error message");
      expect(console.error).toHaveBeenCalled();
    });

    it("should log with context", () => {
      logger.info("Message with context", { userId: "123" });
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe("logger.child", () => {
    it("should create child logger with default context", () => {
      const childLogger = logger.child({ service: "test-service" });
      childLogger.info("Child logger message");
      expect(console.log).toHaveBeenCalled();
    });

    it("should merge child context with additional context", () => {
      const childLogger = logger.child({ service: "test-service" });
      childLogger.debug("Debug", { extra: "data" });
      childLogger.warn("Warn", { extra: "data" });
      childLogger.error("Error", { extra: "data" });
      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("withApiLogging", () => {
    it("should log successful API calls", async () => {
      const result = await withApiLogging("testApi", async () => "success");
      expect(result).toBe("success");
      expect(console.log).toHaveBeenCalled();
    });

    it("should log failed API calls and rethrow", async () => {
      const error = new Error("API failed");
      await expect(
        withApiLogging("testApi", async () => {
          throw error;
        })
      ).rejects.toThrow("API failed");
      expect(console.error).toHaveBeenCalled();
    });

    it("should log unknown errors", async () => {
      await expect(
        withApiLogging("testApi", async () => {
          throw "string error";
        })
      ).rejects.toBe("string error");
      expect(console.error).toHaveBeenCalled();
    });
  });
});
