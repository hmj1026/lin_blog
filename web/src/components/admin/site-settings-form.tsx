"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CoverUploader } from "@/components/admin/post-form/cover-uploader";
import type { SiteSettingRecord } from "@/modules/site-settings";

type Props = {
  initialSettings: SiteSettingRecord;
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    showInNav: boolean;
    navOrder: number;
  }>;
};

type Tab = "general" | "hero" | "sections" | "categories" | "social";

export function SiteSettingsForm({ initialSettings, categories: initialCategories }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState(initialSettings);
  const [categories, setCategories] = useState(initialCategories);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateSetting = <K extends keyof SiteSettingRecord>(key: K, value: SiteSettingRecord[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const sorted = [...categories].sort((a, b) => a.navOrder - b.navOrder || a.name.localeCompare(b.name, "zh-Hant"));

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const settingsRes = await fetch("/api/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const settingsJson = await settingsRes.json();
      if (!settingsRes.ok || !settingsJson.success) {
        throw new Error(settingsJson.message || "更新站點設定失敗");
      }

      const results = await Promise.all(
        categories.map((category) =>
          fetch(`/api/categories/${category.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: category.slug,
              name: category.name,
              showInNav: category.showInNav,
              navOrder: category.navOrder,
            }),
          })
        )
      );
      for (const res of results) {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "更新分類設定失敗");
        }
      }
      setMessage("已儲存");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "general", label: "一般設定" },
    { id: "hero", label: "Hero 區塊" },
    { id: "sections", label: "首頁區塊" },
    { id: "categories", label: "分類管理" },
    { id: "social", label: "社群平台" },
  ];

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-base-300 hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <h2 className="font-semibold text-primary">基本資訊</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">站點名稱</label>
                <input
                  type="text"
                  value={settings.siteName || ""}
                  onChange={(e) => updateSetting("siteName", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="Lin Blog"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">站點標語</label>
                <input
                  type="text"
                  value={settings.siteTagline || ""}
                  onChange={(e) => updateSetting("siteTagline", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="內容．社群．設計"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-primary">站點描述</label>
                <textarea
                  value={settings.siteDescription || ""}
                  onChange={(e) => updateSetting("siteDescription", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="以社群為核心的繁體中文部落格"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">聯絡信箱</label>
                <input
                  type="email"
                  value={settings.contactEmail || ""}
                  onChange={(e) => updateSetting("contactEmail", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="hello@lin.blog"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">版權文字</label>
                <input
                  type="text"
                  value={settings.copyrightText || ""}
                  onChange={(e) => updateSetting("copyrightText", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="以內容連結社群"
                />
              </div>
            </div>

            <hr className="border-line" />
            <h2 className="font-semibold text-primary">功能開關</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showBlogLink}
                  onChange={(e) => updateSetting("showBlogLink", e.target.checked)}
                />
                顯示「部落格」連結
              </label>
              {/* TODO: Newsletter 功能暫緩實作
              <label className="flex items-center gap-3 text-sm text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showNewsletter}
                  onChange={(e) => updateSetting("showNewsletter", e.target.checked)}
                />
                顯示 Newsletter 訂閱區塊
              </label>
              */}
              <label className="flex items-center gap-3 text-sm text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showContact}
                  onChange={(e) => updateSetting("showContact", e.target.checked)}
                />
                顯示聯絡區塊
              </label>
            </div>
          </div>
        )}

        {/* Hero Tab */}
        {activeTab === "hero" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-primary">Hero 區塊設定</h2>
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary">Badge 文字</label>
              <input
                type="text"
                value={settings.heroBadge || ""}
                onChange={(e) => updateSetting("heroBadge", e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                placeholder="Client-First Blog · 社群驅動"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary">主標題</label>
              <input
                type="text"
                value={settings.heroTitle || ""}
                onChange={(e) => updateSetting("heroTitle", e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                placeholder="打造以「社群參與」為核心的內容體驗"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary">副標題</label>
              <textarea
                value={settings.heroSubtitle || ""}
                onChange={(e) => updateSetting("heroSubtitle", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                placeholder="每篇文章都經過設計、敘事與互動的精修..."
              />
            </div>
            <CoverUploader
              coverImage={settings.heroImage || ""}
              onCoverChange={(url) => updateSetting("heroImage", url)}
              onError={setError}
            />
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === "sections" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Featured（熱門精選）</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊標題</label>
                <input
                  type="text"
                  value={settings.featuredTitle || "熱門精選：近期最受討論的文章"}
                  onChange={(e) => updateSetting("featuredTitle", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊描述</label>
                <textarea
                  value={settings.featuredDesc || "從設計到營運的實戰拆解，帶你快速套用到自己的內容與社群場景。"}
                  onChange={(e) => updateSetting("featuredDesc", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
            </div>

            <hr className="border-line" />

            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Categories（分類）</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊標題</label>
                <input
                  type="text"
                  value={settings.categoriesTitle || "三大主題，讓內容與社群形成循環"}
                  onChange={(e) => updateSetting("categoriesTitle", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊描述</label>
                <textarea
                  value={settings.categoriesDesc || "從策略到設計、從社群到執行，這些分類幫助你快速找到需要的工具與視角。"}
                  onChange={(e) => updateSetting("categoriesDesc", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
            </div>

            <hr className="border-line" />

            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Latest（最新文章）</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊標題</label>
                <input
                  type="text"
                  value={settings.latestTitle || "最新文章"}
                  onChange={(e) => updateSetting("latestTitle", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊描述</label>
                <textarea
                  value={settings.latestDesc || "每篇都附上可落地的步驟、檢查清單與案例，直接帶回你的團隊。"}
                  onChange={(e) => updateSetting("latestDesc", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
            </div>

            <hr className="border-line" />

            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Community（社群）</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊標題</label>
                <input
                  type="text"
                  value={settings.communityTitle || "每週 AMA 與讀者共創"}
                  onChange={(e) => updateSetting("communityTitle", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-primary">區塊描述</label>
                <textarea
                  value={settings.communityDesc || "提交你的問題，或分享你的執行成果。精選會被收錄進下一篇案例拆解。"}
                  onChange={(e) => updateSetting("communityDesc", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                />
                <p className="mt-1 text-xs text-base-300">顯示目前前台使用的值</p>
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-primary">分類連結</h2>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="min-w-full text-sm">
                <thead className="bg-base-100 text-left text-base-300">
                  <tr>
                    <th className="px-4 py-3">顯示</th>
                    <th className="px-4 py-3">名稱</th>
                    <th className="px-4 py-3">排序</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((category) => (
                    <tr key={category.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={category.showInNav}
                          onChange={(e) =>
                            setCategories((prev) =>
                              prev.map((c) => (c.id === category.id ? { ...c, showInNav: e.target.checked } : c))
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">{category.name}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className="w-24 rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                          value={category.navOrder}
                          onChange={(e) =>
                            setCategories((prev) =>
                              prev.map((c) => {
                                if (c.id !== category.id) return c;
                                const value = Number(e.target.value);
                                return { ...c, navOrder: Number.isFinite(value) ? value : 0 };
                              })
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-base-300">
                        目前沒有分類
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Social Tab */}
        {activeTab === "social" && (
          <div className="space-y-6">
            <h2 className="font-semibold text-primary">社群平台設定</h2>
            <p className="text-sm text-base-300">
              設定要在前台合作諮詢區塊顯示的社群平台連結，會以 icon 按鈕形式呈現。
            </p>

            {/* Facebook */}
            <div className="rounded-xl border border-line p-4 space-y-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showFacebook}
                  onChange={(e) => updateSetting("showFacebook", e.target.checked)}
                />
                <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </label>
              {settings.showFacebook && (
                <input
                  type="url"
                  value={settings.facebookUrl || ""}
                  onChange={(e) => updateSetting("facebookUrl", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="https://facebook.com/yourpage"
                />
              )}
            </div>

            {/* Instagram */}
            <div className="rounded-xl border border-line p-4 space-y-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showInstagram}
                  onChange={(e) => updateSetting("showInstagram", e.target.checked)}
                />
                <svg className="h-5 w-5 text-[#E4405F]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </label>
              {settings.showInstagram && (
                <input
                  type="url"
                  value={settings.instagramUrl || ""}
                  onChange={(e) => updateSetting("instagramUrl", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="https://instagram.com/yourhandle"
                />
              )}
            </div>

            {/* Threads */}
            <div className="rounded-xl border border-line p-4 space-y-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showThreads}
                  onChange={(e) => updateSetting("showThreads", e.target.checked)}
                />
                <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.812-.674 1.928-1.077 3.486-1.264.93-.111 1.785-.105 2.479-.105h.197c-.106-.627-.343-1.074-.706-1.33-.44-.31-1.109-.479-1.994-.479-.913 0-1.643.159-2.119.46a1.458 1.458 0 0 0-.685 1.298h-2.045c.032-1.198.499-2.178 1.388-2.915.953-.79 2.181-1.19 3.461-1.19 1.474 0 2.67.347 3.551 1.032.94.731 1.417 1.81 1.417 3.208v.397c.666.063 1.29.186 1.86.369 1.705.545 2.953 1.511 3.717 2.878.865 1.548.997 3.627-.263 5.86-1.058 1.876-2.892 3.218-5.455 3.992-1.36.41-2.86.618-4.46.618zm-.222-9.67c-2.273.138-3.381 1.006-3.317 2.2.04.74.483 1.274 1.161 1.58.548.247 1.204.334 1.808.3 1.291-.07 2.088-.549 2.656-1.254.448-.557.77-1.31.897-2.283-.45-.02-.94-.04-1.475-.04h-.188l-1.542-.003z" />
                </svg>
                Threads
              </label>
              {settings.showThreads && (
                <input
                  type="url"
                  value={settings.threadsUrl || ""}
                  onChange={(e) => updateSetting("threadsUrl", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="https://threads.net/@yourhandle"
                />
              )}
            </div>

            {/* LINE */}
            <div className="rounded-xl border border-line p-4 space-y-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings.showLine}
                  onChange={(e) => updateSetting("showLine", e.target.checked)}
                />
                <svg className="h-5 w-5 text-[#00B900]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE
              </label>
              {settings.showLine && (
                <input
                  type="url"
                  value={settings.lineUrl || ""}
                  onChange={(e) => updateSetting("lineUrl", e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                  placeholder="https://line.me/ti/p/@yourlineid"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-base-300">{message}</div>
        <Button onClick={save} disabled={saving}>
          {saving ? "儲存中..." : "儲存"}
        </Button>
      </div>
    </div>
  );
}
