type AuthorChipAuthor = {
  name: string;
  title?: string | null;
  initials?: string | null;
  tone?: "amber" | "teal" | "blue" | "rose" | null;
};

const toneMap: Record<NonNullable<AuthorChipAuthor["tone"]>, string> = {
  amber: "bg-orange-100 text-orange-900",
  teal: "bg-teal-100 text-teal-900",
  blue: "bg-sky-100 text-sky-900",
  rose: "bg-rose-100 text-rose-900",
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return (trimmed.slice(0, 2) || "?").toUpperCase();
}

export function AuthorChip({ author }: { author: AuthorChipAuthor }) {
  const tone = author.tone ?? "amber";
  const initials = author.initials ?? getInitials(author.name);
  return (
    <div className="flex items-center gap-3 text-sm text-primary">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${toneMap[tone]}`}
        aria-hidden
      >
        {initials}
      </span>
      <div className="leading-tight">
        <div className="font-semibold">{author.name}</div>
        <div className="text-xs text-base-300 dark:text-base-600">{author.title ?? "作者"}</div>
      </div>
    </div>
  );
}
