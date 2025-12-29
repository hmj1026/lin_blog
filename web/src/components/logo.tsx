type LogoProps = {
  compact?: boolean;
  siteName?: string;
  tagline?: string;
};

export function Logo({ compact, siteName, tagline }: LogoProps) {
  const displayName = siteName || "Lin Blog";
  const displayTagline = tagline || "內容．社群．設計";

  return (
    <div className="flex items-center gap-2 text-base font-semibold text-primary">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-400 text-white shadow-card">
        Lin
      </span>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-lg">{displayName}</div>
          <div className="text-xs text-base-300 dark:text-base-600">{displayTagline}</div>
        </div>
      )}
    </div>
  );
}

