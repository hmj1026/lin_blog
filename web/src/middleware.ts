import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authEnv } from "@/env.auth";

const protectedPaths = ["/admin"];
const apiRateLimitWindowMs = 5 * 60 * 1000;
const apiRateLimitMax = 100;
const cleanupIntervalMs = 60 * 1000; // 清理間隔

const globalWithRateLimit = globalThis as {
  __rateLimitStore?: Map<string, number[]>;
  __lastCleanup?: number;
};
const rateLimitStore: Map<string, number[]> =
  globalWithRateLimit.__rateLimitStore ?? new Map();
globalWithRateLimit.__rateLimitStore = rateLimitStore;

/**
 * 清理過期的 rate limit 記錄，防止記憶體洩漏
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const lastCleanup = globalWithRateLimit.__lastCleanup ?? 0;

  // 每 60 秒最多執行一次清理
  if (now - lastCleanup < cleanupIntervalMs) return;

  globalWithRateLimit.__lastCleanup = now;
  const windowStart = now - apiRateLimitWindowMs;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => t > windowStart);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, valid);
    }
  }
}

function rateLimit(key: string) {
  const now = Date.now();
  const windowStart = now - apiRateLimitWindowMs;

  // 定期清理過期記錄
  cleanupRateLimitStore();

  const timestamps = (rateLimitStore.get(key) || []).filter((t) => t > windowStart);
  if (timestamps.length >= apiRateLimitMax) return false;
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const key = `${ip}:${pathname}`;
    if (!rateLimit(key)) {
      return NextResponse.json(
        { success: false, message: "Too many requests" },
        { status: 429 }
      );
    }
    return NextResponse.next();
  }

  // Protect admin routes
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: authEnv.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
