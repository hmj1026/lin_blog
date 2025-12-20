"use client";

import { useEffect, useState } from "react";

type TocItem = {
  id: string;
  text: string;
  level: number;
};

type TocProps = {
  contentSelector?: string;
};

/**
 * 目錄導航元件
 * 自動解析文章中的 H2/H3 標題，顯示側邊導航
 */
export function Toc({ contentSelector = "article" }: TocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const content = document.querySelector(contentSelector);
    if (!content) return;

    const headings = content.querySelectorAll("h2, h3");
    const tocItems: TocItem[] = [];

    headings.forEach((heading, index) => {
      const element = heading as HTMLElement;
      // 確保有 ID，若無則生成
      if (!element.id) {
        element.id = `heading-${index}`;
      }
      tocItems.push({
        id: element.id,
        text: element.textContent || "",
        level: element.tagName === "H2" ? 2 : 3,
      });
    });

    setItems(tocItems);
  }, [contentSelector]);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-300">
        目錄
      </p>
      <ul className="space-y-2 border-l border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`block border-l-2 py-1 text-sm transition-colors ${
                item.level === 3 ? "pl-6" : "pl-4"
              } ${
                activeId === item.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-base-300 hover:text-primary hover:border-primary/50"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
