"use client";

import { useState } from "react";
import Image from "next/image";

// ========== 篩選卡片方案 ==========
const categories = ["全部分類", "行銷", "策略", "設計", "社群"];
const tags = ["全部標籤", "#Component", "#Design System", "#Email", "#Growth"];

type FilterSchemeConfig = {
  name: string;
  description: string;
  card: string;
  title: string;
  desc: string;
  chipActive: string;
  chipInactive: string;
};

const filterSchemes: FilterSchemeConfig[] = [
  {
    name: "方案一：玻璃質感 (Glass Morphism)",
    description: "半透明背景 + 模糊效果，現代感強",
    card: "bg-base-100/80 backdrop-blur-md border-base-200/50 shadow-xl",
    title: "text-primary",
    desc: "text-base-500",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-base-150/60 border-base-200/40 text-base-600 hover:border-base-300",
  },
  {
    name: "方案二：深色沉穩 (Deep Solid)",
    description: "純色深背景，穩重專業",
    card: "bg-base-100 border-base-200 shadow-lg",
    title: "text-primary",
    desc: "text-base-500",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-base-75 border-base-200 text-base-600 hover:border-base-300",
  },
  {
    name: "方案三：暖色提升 (Warm Elevated)",
    description: "暖褐色調，與整體暖色系統一致",
    card: "bg-[#2d2724] border-[#4a403a] shadow-lg",
    title: "text-amber-100",
    desc: "text-amber-200/70",
    chipActive: "border-amber-500 bg-amber-500 text-stone-900 shadow-card",
    chipInactive: "bg-[#3a3330] border-[#4a403a] text-amber-200/80 hover:border-amber-500/50",
  },
  {
    name: "方案四：紫色和諧 (Purple Harmony)",
    description: "紫色調與品牌 accent 呼應",
    card: "bg-violet-950/40 border-violet-400/20 shadow-lg shadow-violet-500/5",
    title: "text-violet-100",
    desc: "text-violet-300/70",
    chipActive: "border-violet-400 bg-violet-500 text-white shadow-card",
    chipInactive: "bg-violet-900/30 border-violet-400/30 text-violet-200 hover:border-violet-400/50",
  },
  {
    name: "方案五：漸層光暈 (Gradient Glow)",
    description: "微妙漸層邊框，精緻細節",
    card: "bg-base-100 border-transparent ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/5",
    title: "text-primary",
    desc: "text-base-500",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-base-150 border-purple-400/20 text-base-600 hover:border-purple-400/40",
  },
  {
    name: "方案六：金色點綴 (Gold Accent) ✓ 已選用",
    description: "金色邊框強調，高級質感",
    card: "bg-base-100 border-amber-500/20 shadow-lg shadow-amber-500/5",
    title: "text-amber-50",
    desc: "text-amber-200/60",
    chipActive: "border-amber-400 bg-amber-500 text-stone-900 shadow-card",
    chipInactive: "bg-[#2d2928] border-amber-400/30 text-amber-100/80 hover:border-amber-400/50",
  },
  {
    name: "方案七：霧面質感 (Frosted)",
    description: "石色調霧面，柔和不刺眼",
    card: "bg-stone-800/50 backdrop-blur-sm border-stone-600/30 shadow-2xl",
    title: "text-stone-100",
    desc: "text-stone-400",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-stone-700/60 border-stone-500/40 text-stone-200 hover:border-stone-400/50",
  },
  {
    name: "方案八：輪廓設計 (Outlined)",
    description: "透明背景僅邊框，極簡風格",
    card: "bg-transparent border-2 border-base-200",
    title: "text-primary",
    desc: "text-base-500",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-transparent border border-base-300 text-base-600 hover:border-base-400",
  },
  {
    name: "方案九：柔和層次 (Soft Layers)",
    description: "中性灰階，層次分明",
    card: "bg-neutral-800/60 border-neutral-700/50 shadow-lg shadow-black/20",
    title: "text-neutral-100",
    desc: "text-neutral-400",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-neutral-700/50 border-neutral-600/50 text-neutral-300 hover:border-neutral-500",
  },
  {
    name: "方案十：品牌融合 (Brand Blend)",
    description: "與頁面背景融合，低對比和諧",
    card: "bg-base-75 border-base-200/60 shadow-soft",
    title: "text-primary",
    desc: "text-base-500",
    chipActive: "border-accent-600 bg-accent-600 text-white shadow-card",
    chipInactive: "bg-base-100 border-base-200 text-base-600 hover:border-base-300",
  },
];

// ========== 文章 Header 方案 ==========
type HeaderSchemeConfig = {
  name: string;
  description: string;
  section: string;
  badge: string;
  meta: string;
  title: string;
  excerpt: string;
  imageWrapper: string;
};

const headerSchemes: HeaderSchemeConfig[] = [
  {
    name: "方案 A：透明融合 (Transparent Blend)",
    description: "與背景融為一體，文字層次分明",
    section: "bg-transparent",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-400/30",
    meta: "text-base-500",
    title: "text-primary",
    excerpt: "text-base-500",
    imageWrapper: "border-base-200 shadow-xl",
  },
  {
    name: "方案 B：金色溫暖 (Gold Warm)",
    description: "金色主題，與篩選卡片風格一致",
    section: "bg-base-100/50",
    badge: "bg-amber-500 text-stone-900",
    meta: "text-amber-200/70",
    title: "text-amber-50",
    excerpt: "text-amber-200/60",
    imageWrapper: "border-amber-500/20 shadow-lg shadow-amber-500/10",
  },
  {
    name: "方案 C：紫色優雅 (Purple Elegant)",
    description: "紫色調，品牌色強調",
    section: "bg-violet-950/20",
    badge: "bg-violet-500 text-white",
    meta: "text-violet-300/70",
    title: "text-violet-100",
    excerpt: "text-violet-300/60",
    imageWrapper: "border-violet-400/30 shadow-lg shadow-violet-500/10",
  },
  {
    name: "方案 D：深色沉穩 (Deep Solid)",
    description: "純深色背景，高對比閱讀",
    section: "bg-base-100",
    badge: "bg-accent-600 text-white",
    meta: "text-base-500",
    title: "text-primary",
    excerpt: "text-base-600",
    imageWrapper: "border-base-200 shadow-card",
  },
  {
    name: "方案 E：玻璃質感 (Glass)",
    description: "半透明毛玻璃效果",
    section: "bg-base-100/60 backdrop-blur-sm",
    badge: "bg-white/10 text-white border border-white/20",
    meta: "text-base-500",
    title: "text-primary",
    excerpt: "text-base-500",
    imageWrapper: "border-white/10 shadow-2xl",
  },
  {
    name: "方案 F：霜白層次 (Frost White)",
    description: "淺色卡片浮於深色背景上",
    section: "bg-stone-800/40",
    badge: "bg-stone-700 text-stone-200 border border-stone-600",
    meta: "text-stone-400",
    title: "text-stone-100",
    excerpt: "text-stone-400",
    imageWrapper: "border-stone-600/50 shadow-xl",
  },
  {
    name: "方案 G：漸層微光 (Gradient Glow)",
    description: "微妙漸層背景，視覺焦點",
    section: "bg-gradient-to-br from-base-100 via-base-100 to-violet-950/30",
    badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-900",
    meta: "text-base-500",
    title: "text-primary",
    excerpt: "text-base-500",
    imageWrapper: "border-violet-400/20 shadow-lg",
  },
  {
    name: "方案 H：極簡輪廓 (Minimal Outline)",
    description: "無背景填充，僅靠邊框區隔",
    section: "bg-transparent border-b border-base-200",
    badge: "bg-transparent text-accent-600 border border-accent-600",
    meta: "text-base-500",
    title: "text-primary",
    excerpt: "text-base-500",
    imageWrapper: "border-2 border-base-200",
  },
  {
    name: "方案 I：柔和中性 (Soft Neutral)",
    description: "中性灰調，專業穩重",
    section: "bg-neutral-800/50",
    badge: "bg-neutral-700 text-neutral-200",
    meta: "text-neutral-400",
    title: "text-neutral-100",
    excerpt: "text-neutral-400",
    imageWrapper: "border-neutral-700 shadow-lg",
  },
  {
    name: "方案 J：暖褐調和 (Warm Brown)",
    description: "暖褐色調，溫潤質感",
    section: "bg-[#2a2320]/60",
    badge: "bg-[#4a3f38] text-amber-200 border border-[#5a4d44]",
    meta: "text-amber-200/50",
    title: "text-amber-100",
    excerpt: "text-amber-200/60",
    imageWrapper: "border-[#4a403a] shadow-lg",
  },
];

export default function PreviewPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeTag, setActiveTag] = useState(0);
  const [activeTab, setActiveTab] = useState<"filter" | "header">("header");

  return (
    <div className="min-h-screen bg-base-75 dark:bg-base-75">
      {/* 強制 dark mode 預覽 */}
      <div className="dark bg-base-75 min-h-screen py-8">
        <div className="section-shell">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl text-primary mb-2">
              Dark Mode 配色方案預覽
            </h1>
            <p className="text-base-500 mb-6">
              選擇你喜歡的方案後告訴我編號
            </p>

            {/* Tab 切換 */}
            <div className="inline-flex rounded-full bg-base-100 p-1">
              <button
                onClick={() => setActiveTab("filter")}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                  activeTab === "filter"
                    ? "bg-accent-600 text-white"
                    : "text-base-500 hover:text-primary"
                }`}
              >
                篩選卡片
              </button>
              <button
                onClick={() => setActiveTab("header")}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                  activeTab === "header"
                    ? "bg-accent-600 text-white"
                    : "text-base-500 hover:text-primary"
                }`}
              >
                文章 Header
              </button>
            </div>
          </div>

          {/* ========== 篩選卡片方案 ========== */}
          {activeTab === "filter" && (
            <div className="grid gap-8 md:grid-cols-2">
              {filterSchemes.map((scheme, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent-600 text-white text-sm font-bold">
                      {index + 1}
                    </span>
                    <h2 className="font-display text-lg text-primary">{scheme.name}</h2>
                  </div>
                  <p className="text-sm text-base-500 ml-10">{scheme.description}</p>

                  <div className={`rounded-3xl border p-6 ${scheme.card}`}>
                    <div className="mb-4">
                      <span className="inline-block rounded-full bg-accent-600/20 px-3 py-1 text-xs font-semibold text-accent-600 mb-2">
                        篩選
                      </span>
                      <h3 className={`font-display text-2xl ${scheme.title}`}>
                        找到你要的主題
                      </h3>
                      <p className={`text-sm mt-1 ${scheme.desc}`}>
                        從分類或標籤開始，快速進入最相關的文章。
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat, i) => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(i)}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                              activeCategory === i ? scheme.chipActive : scheme.chipInactive
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                          <button
                            key={tag}
                            onClick={() => setActiveTag(i)}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                              activeTag === i ? scheme.chipActive : scheme.chipInactive
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========== 文章 Header 方案 ========== */}
          {activeTab === "header" && (
            <div className="space-y-8">
              {headerSchemes.map((scheme, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent-600 text-white text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <h2 className="font-display text-lg text-primary">{scheme.name}</h2>
                  </div>
                  <p className="text-sm text-base-500 ml-10">{scheme.description}</p>

                  {/* 模擬的文章 Header */}
                  <div className={`rounded-2xl ${scheme.section} p-6`}>
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scheme.badge}`}>
                            行銷
                          </span>
                          <span className={scheme.meta}>2024-06-18</span>
                          <span className={scheme.meta}>•</span>
                          <span className={scheme.meta}>7 分鐘</span>
                        </div>
                        <h1 className={`font-display text-3xl leading-tight ${scheme.title}`}>
                          兼顧 SEO 與品牌語氣：讓搜尋與識別並存
                        </h1>
                        <p className={`text-base ${scheme.excerpt}`}>
                          SEO 不是堆疊關鍵字，而是用讀者熟悉的語言回答問題。這篇文章示範如何保持品牌語氣，同時對搜尋友善。
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-200 text-sm font-bold">
                            LA
                          </div>
                          <div>
                            <div className={`text-sm font-semibold ${scheme.title}`}>Lin Admin</div>
                            <div className={`text-xs ${scheme.meta}`}>作者</div>
                          </div>
                        </div>
                      </div>
                      <div className={`overflow-hidden rounded-2xl border ${scheme.imageWrapper}`}>
                        <div className="aspect-[16/10] bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center">
                          <div className="w-3/4 space-y-3 p-6">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-full rounded bg-gray-300" />
                              <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white">+</div>
                            </div>
                            <div className="h-2 w-4/5 rounded bg-gray-300" />
                            <div className="h-2 w-full rounded bg-sky-300" />
                            <div className="h-2 w-3/4 rounded bg-orange-300" />
                            <div className="flex gap-2">
                              <div className="h-6 w-1/3 rounded-full bg-gray-800" />
                              <div className="h-6 w-1/4 rounded-full bg-amber-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-base-500">
              選好後請告訴我：「我選方案 X」（篩選卡片用數字 1-10，文章 Header 用字母 A-J）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
