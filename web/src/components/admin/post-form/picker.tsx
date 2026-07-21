"use client";

import { useState } from "react";

type PickerProps = {
  title: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  onToggle: (id: string) => void;
  searchLabel?: string;
};

export function Picker({ title, options, selected, onToggle, searchLabel }: PickerProps) {
  const [query, setQuery] = useState("");
  const visibleOptions = query.trim()
    ? options.filter((option) => option.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : options;

  return (
    <div className="rounded-2xl border border-line bg-base-50 p-4">
      <div className="text-sm font-semibold text-primary">{title}</div>
      {searchLabel ? (
        <input
          type="search"
          aria-label={searchLabel}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
        />
      ) : null}
      <div className="mt-3 space-y-2">
        {visibleOptions.map((opt) => (
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
        {visibleOptions.length === 0 && <div className="text-sm text-base-300">找不到符合項目</div>}
      </div>
    </div>
  );
}
