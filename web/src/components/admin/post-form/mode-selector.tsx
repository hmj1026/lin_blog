"use client";

export type AuthoringMode = "visual" | "raw";

type ModeSelectorProps = {
  mode: AuthoringMode;
  onChange: (mode: AuthoringMode) => void;
};

const OPTIONS: { value: AuthoringMode; label: string }[] = [
  { value: "visual", label: "視覺編輯器" },
  { value: "raw", label: "原始 HTML" },
];

/**
 * Article-level authoring mode selector. Mutually exclusive (native radio
 * semantics give free arrow-key roving focus + accessible checked state).
 * Distinct from TipTap's internal "視覺內容原始碼" source-view toggle.
 */
export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="編輯模式"
      className="inline-flex overflow-hidden rounded-xl border border-line"
    >
      {OPTIONS.map((option, index) => (
        <label
          key={option.value}
          className={`flex min-h-[44px] cursor-pointer items-center gap-2 px-4 text-sm font-semibold transition-colors ${
            mode === option.value ? "bg-primary text-white" : "bg-white text-primary"
          } ${index > 0 ? "border-l border-line" : ""}`}
        >
          <input
            type="radio"
            name="authoring-mode"
            value={option.value}
            checked={mode === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
