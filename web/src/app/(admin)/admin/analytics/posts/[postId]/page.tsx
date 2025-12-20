import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { analyticsUseCases } from "@/modules/analytics";
import { DEVICE_TYPES, isDeviceType, type DeviceType } from "@/modules/analytics/domain";

type Props = {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<{
    days?: string;
    from?: string;
    to?: string;
    deviceType?: string;
    ipMode?: string;
    ip?: string;
    ua?: string;
    ref?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AdminPostEventBrowserPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "analytics:view_sensitive"))) redirect("/admin");

  const { postId } = await params;
  const sp = await searchParams;

  const days = Number(sp?.days ?? "7");
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 7;

  const from = sp?.from ? safeParseDate(sp.from) : null;
  const to = sp?.to ? safeParseDate(sp.to) : null;
  const derivedFrom = from ?? new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const derivedTo = to ?? null;

  const deviceType = parseDeviceType(sp?.deviceType);
  const ipMode = sp?.ipMode === "equals" ? "equals" : "contains";
  const ip = sp?.ip?.trim() ? sp.ip.trim() : "";
  const ua = sp?.ua?.trim() ? sp.ua.trim() : "";
  const ref = sp?.ref?.trim() ? sp.ref.trim() : "";

  const page = Math.max(1, Number(sp?.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp?.pageSize ?? "50") || 50));

  const post = await analyticsUseCases.getPostSummary(postId);
  if (!post || post.deletedAt) redirect("/admin/analytics/posts");

  const { total, events } = await analyticsUseCases.listPostViewEvents({
    postId,
    from: derivedFrom,
    to: derivedTo ?? undefined,
    deviceType,
    ipMode,
    ip: ip || undefined,
    userAgent: ua || undefined,
    referer: ref || undefined,
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const baseParams = new URLSearchParams();
  baseParams.set("days", String(safeDays));
  if (sp?.from) baseParams.set("from", sp.from);
  if (sp?.to) baseParams.set("to", sp.to);
  if (sp?.deviceType) baseParams.set("deviceType", sp.deviceType);
  if (ip) baseParams.set("ip", ip);
  if (sp?.ipMode) baseParams.set("ipMode", sp.ipMode);
  if (ua) baseParams.set("ua", ua);
  if (ref) baseParams.set("ref", ref);
  baseParams.set("pageSize", String(pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl text-primary">事件明細</h1>
          <div className="text-sm text-base-300">
            <span className="font-semibold text-primary">{post.title}</span>
            <span className="mx-2">•</span>
            <span>/{post.slug}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/admin/analytics/posts" className="text-primary">
            返回統計
          </Link>
          <a href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noreferrer" className="text-accent-600">
            開前台
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href={`/admin/analytics/posts/${postId}?days=7`}
              className={`rounded-full border px-4 py-2 ${safeDays === 7 ? "border-primary bg-primary text-white" : "border-line bg-white text-primary"}`}
            >
              7 天
            </Link>
            <Link
              href={`/admin/analytics/posts/${postId}?days=30`}
              className={`rounded-full border px-4 py-2 ${safeDays === 30 ? "border-primary bg-primary text-white" : "border-line bg-white text-primary"}`}
            >
              30 天
            </Link>
            <Link
              href={`/admin/analytics/posts/${postId}?days=90`}
              className={`rounded-full border px-4 py-2 ${safeDays === 90 ? "border-primary bg-primary text-white" : "border-line bg-white text-primary"}`}
            >
              90 天
            </Link>
          </div>
          <div className="text-sm text-base-300">
            共 <span className="font-semibold text-primary">{total}</span> 筆
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" method="get">
          <input type="hidden" name="days" value={String(safeDays)} />
          <Field label="From（ISO/可留空）">
            <input name="from" defaultValue={sp?.from ?? ""} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary" placeholder="2025-12-13T00:00:00Z" />
          </Field>
          <Field label="To（ISO/可留空）">
            <input name="to" defaultValue={sp?.to ?? ""} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary" placeholder="2025-12-13T23:59:59Z" />
          </Field>
          <Field label="裝置">
            <select name="deviceType" defaultValue={sp?.deviceType ?? ""} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary">
              <option value="">全部</option>
              {DEVICE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="IP">
            <div className="flex gap-2">
              <select name="ipMode" defaultValue={sp?.ipMode ?? "contains"} className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary">
                <option value="contains">contains</option>
                <option value="equals">equals</option>
              </select>
              <input name="ip" defaultValue={ip} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary" placeholder="1.2.3.4" />
            </div>
          </Field>
          <Field label="User-Agent contains">
            <input name="ua" defaultValue={ua} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary" placeholder="Chrome" />
          </Field>
          <Field label="Referer contains">
            <input name="ref" defaultValue={ref} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary" placeholder="google" />
          </Field>
          <Field label="每頁">
            <select name="pageSize" defaultValue={String(pageSize)} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-primary">
              {[25, 50, 100].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card" type="submit">
              套用篩選
            </button>
            <Link
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-primary"
              href={`/admin/analytics/posts/${postId}?days=${safeDays}`}
            >
              清除
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-base-100 text-left text-base-300">
            <tr>
              <th className="px-4 py-3">時間</th>
              <th className="px-4 py-3">裝置</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">UA</th>
              <th className="px-4 py-3">Referer</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-4 py-3 text-base-300">{formatDateTime(e.viewedAt)}</td>
                <td className="px-4 py-3 font-semibold text-primary">{e.deviceType}</td>
                <td className="px-4 py-3 font-mono text-xs text-primary">{e.ip}</td>
                <td className="px-4 py-3">
                  <div className="max-w-[520px] truncate text-base-300" title={e.userAgent}>
                    {e.userAgent}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-[420px] truncate text-base-300" title={e.referer ?? ""}>
                    {e.referer ?? "-"}
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-base-300">
                  沒有符合條件的事件
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
        <div className="text-base-300">
          第 <span className="text-primary">{safePage}</span> / <span className="text-primary">{totalPages}</span> 頁
        </div>
        <div className="flex items-center gap-2">
          <PagerLink
            disabled={safePage <= 1}
            href={`/admin/analytics/posts/${postId}?${withPage(baseParams, safePage - 1)}`}
            label="上一頁"
          />
          <PagerLink
            disabled={safePage >= totalPages}
            href={`/admin/analytics/posts/${postId}?${withPage(baseParams, safePage + 1)}`}
            label="下一頁"
          />
        </div>
      </div>
    </div>
  );
}

function safeParseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseDeviceType(value: string | undefined) {
  if (!value) return undefined;
  if (!isDeviceType(value)) return undefined;
  return value satisfies DeviceType;
}

function withPage(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params.toString());
  next.set("page", String(page));
  return next.toString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-primary">{label}</span>
      {children}
    </label>
  );
}

function PagerLink({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  if (disabled) {
    return <span className="rounded-full border border-line bg-base-50 px-4 py-2 text-base-300">{label}</span>;
  }
  return (
    <Link href={href as never} className="rounded-full border border-line bg-white px-4 py-2 text-primary hover:border-primary/40">
      {label}
    </Link>
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date: Date) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
