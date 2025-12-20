type PickerProps = {
  title: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  onToggle: (id: string) => void;
};

export function Picker({ title, options, selected, onToggle }: PickerProps) {
  return (
    <div className="rounded-2xl border border-line bg-base-50 p-4">
      <div className="text-sm font-semibold text-primary">{title}</div>
      <div className="mt-3 space-y-2">
        {options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-3 text-sm text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={selected.includes(opt.id)}
              onChange={() => onToggle(opt.id)}
            />
            {opt.name}
          </label>
        ))}
        {options.length === 0 && <div className="text-sm text-base-300">尚無資料</div>}
      </div>
    </div>
  );
}
