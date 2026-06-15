export function Msg({ msg }: { msg: string }) {
  if (!msg) return null;
  const ok = msg.startsWith("✅");
  return (
    <div className={`px-4 py-3 rounded-lg text-sm mb-4 border transition-all duration-300 ${
      ok ? "bg-emerald-50 text-emerald-800 border-emerald-200"
         : "bg-red-50 text-red-800 border-red-200"
    }`}>
      {msg}
    </div>
  );
}