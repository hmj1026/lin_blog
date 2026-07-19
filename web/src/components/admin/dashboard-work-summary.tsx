import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

type PostItem = { id: string; title: string };
type RankedPost = PostItem & { percentChange: number };

type Props = {
  drafts: { total: number; items: PostItem[] };
  scheduled: { total: number; items: PostItem[] };
  recent: PostItem[];
  performance: { growth: RankedPost[]; decline: RankedPost[] };
  shortcuts: Array<{ href: string; label: string }>;
};

/** 將待辦內容、近期更新、文章成效與已授權快捷操作集中成可行動摘要。 */
export function DashboardWorkSummary({ drafts, scheduled, recent, performance, shortcuts }: Props) {
  const hasWork = drafts.total > 0 || scheduled.total > 0;
  return (
    <section className="space-y-5" aria-labelledby="dashboard-work-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dashboard-work-heading" className="text-xl font-semibold text-primary">工作摘要</h2>
        <div className="flex flex-wrap gap-2">{shortcuts.map((item) => <Link key={item.href} href={item.href as never} className={buttonStyles({ variant: "secondary", size: "sm" })}>{item.label}</Link>)}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <WorkCard title={`${drafts.total} 篇草稿`} items={drafts.items} />
        <WorkCard title={`${scheduled.total} 篇排程`} items={scheduled.items} />
      </div>
      {!hasWork ? <p className="rounded-xl border border-line bg-white p-4 text-sm text-base-300">目前沒有待處理的草稿或排程文章</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <PostList title="近期更新" items={recent} />
        <Ranking title="成長排行" items={performance.growth} />
        <Ranking title="衰退排行" items={performance.decline} />
      </div>
    </section>
  );
}

function WorkCard({ title, items }: { title: string; items: PostItem[] }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-card"><h3 className="font-semibold text-primary">{title}</h3><PostLinks items={items} /></div>;
}

function PostList({ title, items }: { title: string; items: PostItem[] }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-card"><h3 className="font-semibold text-primary">{title}</h3><PostLinks items={items} /></div>;
}

function PostLinks({ items }: { items: PostItem[] }) {
  return items.length > 0 ? <ul className="mt-3 space-y-2">{items.map((item) => <li key={item.id}><Link href={`/admin/posts/${item.id}` as never} className="text-sm text-primary hover:underline">{item.title}</Link></li>)}</ul> : <p className="mt-3 text-sm text-base-300">目前沒有資料</p>;
}

function Ranking({ title, items }: { title: string; items: RankedPost[] }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-card"><h3 className="font-semibold text-primary">{title}</h3>{items.length > 0 ? <ol className="mt-3 space-y-2">{items.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 text-sm"><Link href={`/admin/posts/${item.id}` as never} className="truncate text-primary hover:underline">{item.title}</Link><span className={item.percentChange >= 0 ? "text-green-700" : "text-red-700"}>{item.percentChange >= 0 ? "+" : ""}{item.percentChange}%</span></li>)}</ol> : <p className="mt-3 text-sm text-base-300">目前沒有可比較資料</p>}</div>;
}
