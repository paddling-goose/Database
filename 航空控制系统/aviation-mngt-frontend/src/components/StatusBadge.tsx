import { STATUS_COLOR, STATUS_ZH } from "../lib/constants";

export function StatusBadge({ s }: { s: string }) {
  const color = STATUS_COLOR[s] || "#6b7280";
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {STATUS_ZH[s] || s}
    </span>
  );
}