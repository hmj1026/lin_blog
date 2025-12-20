type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact }: LogoProps) {
  return (
    <div className="flex items-center gap-2 text-base font-semibold text-primary">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-400 text-white shadow-card">
        Lin
      </span>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-lg">Lin Blog</div>
          <div className="text-xs text-base-300">內容．社群．設計</div>
        </div>
      )}
    </div>
  );
}
