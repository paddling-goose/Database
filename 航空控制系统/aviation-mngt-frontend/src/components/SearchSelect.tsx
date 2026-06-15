import { useState, useMemo, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function SearchSelect({ options, value, onChange, placeholder = "搜索...", required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative flex items-center">
        <svg className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-semibold"
          placeholder={placeholder}
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => { setQuery(e.target.value); onChange(""); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {value && !open && (
          <button
            type="button"
            className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-base leading-none cursor-pointer"
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setQuery(""); }}
          >
            ×
          </button>
        )}
      </div>

      {/* 用于 required 表单校验 */}
      <input type="text" value={value} required={required} readOnly tabIndex={-1}
        className="sr-only" aria-hidden="true" />

      {open && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">无匹配结果</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.value}
                className={`px-3 py-2 text-sm cursor-pointer transition ${
                  value === o.value
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
                onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setQuery(""); setOpen(false); }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
