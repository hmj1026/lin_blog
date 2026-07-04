import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-50 px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-primary">找不到頁面</h1>
      <p className="mt-2 text-base-300">你要找的內容不存在，或已被移除。</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
      >
        返回首頁
      </Link>
    </div>
  );
}
