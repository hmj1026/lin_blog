import { describe, expect, it } from "vitest";
import { ApiException, badRequest, notFoundError, internalError } from "@/lib/errors";

describe("errors", () => {
  describe("ApiException", () => {
    it("should create exception with message and default status 400", () => {
      const error = new ApiException("Test error");
      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error).toBeInstanceOf(Error);
    });

    it("should create exception with custom status", () => {
      const error = new ApiException("Forbidden", 403);
      expect(error.message).toBe("Forbidden");
      expect(error.status).toBe(403);
    });
  });

  describe("badRequest", () => {
    it("should create 400 error", () => {
      const error = badRequest("Invalid input");
      expect(error.message).toBe("Invalid input");
      expect(error.status).toBe(400);
    });
  });

  describe("notFoundError", () => {
    it("should create 404 error with default message", () => {
      const error = notFoundError();
      expect(error.message).toBe("Not found");
      expect(error.status).toBe(404);
    });

    it("should create 404 error with custom message", () => {
      const error = notFoundError("User not found");
      expect(error.message).toBe("User not found");
      expect(error.status).toBe(404);
    });
  });

  describe("internalError", () => {
    it("should create 500 error with default message", () => {
      const error = internalError();
      expect(error.message).toBe("Internal error");
      expect(error.status).toBe(500);
    });

    it("should create 500 error with custom message", () => {
      const error = internalError("Database connection failed");
      expect(error.message).toBe("Database connection failed");
      expect(error.status).toBe(500);
    });
  });
});
