type StatsCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatsCard({ label, value, hint }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="text-sm font-semibold text-base-300">{label}</div>
      <div className="mt-2 text-3xl font-display text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-base-300">{hint}</div>}
    </div>
  );
}
