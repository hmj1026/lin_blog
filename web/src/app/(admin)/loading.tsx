export default function AdminLoading() {
  return (
    <div role="status" aria-label="載入中" className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-base-100" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-white p-6">
            <div className="h-4 w-1/2 rounded bg-base-100" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-line bg-white p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 w-full rounded bg-base-100" />
        ))}
      </div>
    </div>
  );
}
