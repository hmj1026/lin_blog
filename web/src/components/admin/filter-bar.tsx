type FilterBarProps = {
  ariaLabel: string;
  children: React.ReactNode;
};

/** 將列表篩選控制項收斂成具可及名稱的搜尋區域。 */
export function FilterBar({ ariaLabel, children }: FilterBarProps) {
  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {children}
    </div>
  );
}
