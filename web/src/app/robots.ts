import { MetadataRoute } from "next";
import { publicEnv } from "@/env.public";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL || "https://example.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
