"use client";

import { useEffect } from "react";

export function PostViewTracker({ slug, source }: { slug: string; source: "frontend" | "preview" }) {
  useEffect(() => {
    if (!slug) return;
    void fetch("/api/analytics/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, source }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, source]);

  return null;
}

