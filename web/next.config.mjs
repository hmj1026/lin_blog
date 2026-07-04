/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typedRoutes: true,
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
