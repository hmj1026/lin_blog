"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  updatedAt: string;
  publishedAt: string | null;
  categories: { name: string }[];
  tags: { name: string }[];
};

type PostListClientProps = {
  posts: Post[];
};

export function PostListClient({ posts }: PostListClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // 過濾文章
  const filteredPosts = useMemo(() => {
    if (!search.trim()) return posts;
    const query = search.toLowerCase();
    return posts.filter((p) => p.title.toLowerCase().includes(query));
  }, [posts, search]);

  // 全選/取消全選
  const toggleAll = () => {
    if (selected.size === filteredPosts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPosts.map((p) => p.id)));
    }
  };

  // 單選
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // 批次操作
  const handleBatch = async (action: "publish" | "draft" | "delete") => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`確定要刪除 ${selected.size} 篇文章嗎？`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/posts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (json.success) {
        setSelected(new Set());
        router.refresh();
      } else {
        alert(json.message || "操作失敗");
      }
    } catch {
      alert("操作失敗");
    } finally {
      setLoading(false);
    }
  };

  // 切換精選狀態
  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !currentFeatured }),
      });
      const json = await res.json();
      if (json.success) {
        router.refresh();
      } else {
        alert(json.message || "操作失敗");
      }
    } catch {
      alert("操作失敗");
    } finally {
      setLoading(false);
    }
  };

  const allSelected = filteredPosts.length > 0 && selected.size === filteredPosts.length;

  return (
    <div className="space-y-4">
      {/* 搜尋與操作列 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-3xl text-primary">文章列表</h1>
          {/* 搜尋 */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋文章標題..."
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm text-primary placeholder:text-base-300 focus:border-primary focus:outline-none"
          />
        </div>
        <Link href="/admin/posts/new" className={buttonStyles({ variant: "primary" })}>
          新增文章
        </Link>
      </div>

      {/* 批次工具列 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-accent-500 bg-accent-500/10 px-4 py-3">
          <span className="text-sm font-semibold text-primary">
            已選取 {selected.size} 篇文章
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleBatch("publish")}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              批次發佈
            </Button>
            <Button
              onClick={() => handleBatch("draft")}
              disabled={loading}
              variant="secondary"
              size="sm"
            >
              設為草稿
            </Button>
            <Button
              onClick={() => handleBatch("delete")}
              disabled={loading}
              variant="danger"
              size="sm"
            >
              批次刪除
            </Button>
          </div>
          <Button
            onClick={() => setSelected(new Set())}
            variant="ghost"
            size="sm"
          >
            取消選取
          </Button>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-base-100 text-left text-base-300">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-primary"
                />
              </th>
              <th className="px-4 py-3 w-12">精選</th>
              <th className="px-4 py-3">標題</th>
              <th className="px-4 py-3">分類 / 標籤</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">發布時間</th>
              <th className="px-4 py-3">更新時間</th>
              <th className="px-4 py-3">動作</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map((post) => (
              <tr key={post.id} className={`border-t border-line ${selected.has(post.id) ? "bg-accent-500/5" : ""}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggleOne(post.id)}
                    className="h-4 w-4 accent-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleFeatured(post.id, post.featured)}
                    disabled={loading}
                    className={`text-xl transition ${
                      post.featured ? "text-yellow-500 hover:text-yellow-600" : "text-base-200 hover:text-yellow-500"
                    } disabled:opacity-50`}
                    title={post.featured ? "取消精選" : "設為精選"}
                  >
                    ★
                  </button>
                </td>
                <td className="px-4 py-3 font-semibold text-primary">{post.title}</td>
                <td className="px-4 py-3 text-base-300">
                  {post.categories.map((c) => c.name).join("、")} / {post.tags.map((t) => t.name).join("、")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={post.status === "PUBLISHED" ? "success" : post.status === "SCHEDULED" ? "info" : "default"}>
                    {post.status === "PUBLISHED" ? "已發佈" : post.status === "SCHEDULED" ? "已排程" : "草稿"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-base-300">
                  {post.publishedAt ? formatDateTime(new Date(post.publishedAt)) : "未發布"}
                </td>
                <td className="px-4 py-3 text-base-300">
                  {formatDateTime(new Date(post.updatedAt))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/blog/${post.slug}?preview=1`, "_blank", "noopener,noreferrer")}
                    >
                      預覽
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.location.href = `/admin/posts/${post.id}`}
                    >
                      編輯
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPosts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-base-300">
                  {search ? "找不到符合的文章" : "目前沒有文章，建立一篇吧。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
