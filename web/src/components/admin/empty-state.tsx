type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/** 顯示具標題、說明與下一步操作的後台空狀態。 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section
      role="status"
      aria-label={title}
      className="rounded-2xl border border-dashed border-line bg-base-50 px-6 py-10 text-center"
    >
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {description ? <p className="mt-2 text-sm text-base-300">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}
