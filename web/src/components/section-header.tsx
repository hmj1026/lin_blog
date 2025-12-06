type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeader({ eyebrow, title, description, align = "left" }: SectionHeaderProps) {
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-2 ${alignment}`}>
      {eyebrow && (
        <span className="inline-flex items-center rounded-full bg-orange-50 dark:bg-base-100 dark:border dark:border-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-accent-600">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl leading-tight text-primary md:text-4xl">{title}</h2>
      {description && <p className="max-w-2xl text-base text-base-300 dark:text-base-600">{description}</p>}
    </div>
  );
}
