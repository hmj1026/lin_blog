import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typedRoutes: true,
  // 明確指定 workspace root 為 web/ 目錄本身，避免多 lockfile（例如
  // /home/paul/package-lock.json）造成 Next.js 誤判 root，並確保與 Docker
  // build（context: ./web，容器內僅有單一 lockfile）推斷出的 root 一致，
  // 讓 .next/standalone 輸出結構在本機與容器內相同。
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // 優化 barrel imports，減少 bundle size 和加速 dev/build
  // https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
