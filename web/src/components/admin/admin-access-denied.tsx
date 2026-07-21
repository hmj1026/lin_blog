import Link from "next/link";

/** 告知已登入使用者缺少頁面權限，並提供安全的後台返回操作。 */
export function AdminAccessDenied() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-card">
      <div className="text-sm font-semibold text-red-700">403 · 存取遭拒</div>
      <h1 className="mt-2 text-2xl font-semibold text-primary">無法存取此頁面</h1>
      <p className="mt-3 text-sm text-base-300">
        目前帳號沒有執行此工作的權限。如需使用，請聯絡系統管理者調整角色。
      </p>
      <Link
        href={"/admin" as never}
        className="mt-6 inline-flex rounded-lg border border-line px-4 py-3 text-sm font-semibold text-primary hover:border-primary/40"
      >
        返回後台總覽
      </Link>
    </section>
  );
}
