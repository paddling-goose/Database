import { useState, useMemo } from "react";
import { Component } from "../types";
import { useFetch, apiFetch } from "../lib/api";
import { Msg, StatusBadge } from "../lib/ui";

interface LifecycleResult {
  component: Component;
  installations: {
    record_id: number;
    aircraft_id: string;
    install_pos: string;
    installed_at: string;
    removed_at: string | null;
    remove_reason: string | null;
  }[];
  maintenances: {
    maint_id: number;
    maint_type: string;
    start_time: string;
    end_time: string | null;
    result: string | null;
  }[];
  retirements: {
    scrap_id?: number;
    retire_time: string;
    retire_type: string;
    reason: string;
  }[];
}

const TYPE_ZH: Record<string, string> = {
  routine: "例行检查",
  repair: "恢复维修",
  overhaul: "大修(Overhaul)",
  inspection: "专项检测",
};

export default function LifecycleTab() {
  const { data: components } = useFetch<Component[]>("/components");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LifecycleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 实时过滤：空字符串展示全部
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return components || [];
    return (components || []).filter((c) =>
      c.serial_no.toLowerCase().includes(q)
    );
  }, [query, components]);

  const search = async (sn: string) => {
    setLoading(true);
    setMsg("");
    setResult(null);
    try {
      const data = await apiFetch<LifecycleResult>(`/lifecycle/${encodeURIComponent(sn)}`);
      setResult(data);
    } catch (e: any) {
      setMsg("❌ " + e.message);
    }
    setLoading(false);
  };

  const handleBack = () => {
    setResult(null);
    setMsg("");
  };

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xs flex items-center gap-3">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          autoFocus
          type="text"
          className="flex-1 text-sm bg-transparent outline-none text-gray-900 font-mono placeholder:text-gray-400 placeholder:font-sans"
          placeholder="输入部件序列号关键字搜索，留空展示全部..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (result) handleBack();
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); handleBack(); }}
            className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
          >
            清空
          </button>
        )}
        <span className="text-xs text-gray-400 shrink-0">
          {filtered.length} 条
        </span>
      </div>

      <Msg msg={msg} />

      {/* 履历详情视图 */}
      {result ? (
        <div className="space-y-6">
          {/* 返回按钮 */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            返回列表
          </button>

          {/* 基本卡牌 */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <p className="font-mono text-xl font-extrabold text-sky-950">{result.component.serial_no}</p>
                <p className="text-xs text-sky-700/80 mt-1 font-medium">
                  型号编码 ID: {result.component.model_id} · 制造批次: {result.component.batch_no || "—"} · 入库日期: {result.component.inbound_date}
                </p>
              </div>
              <div className="shrink-0">
                <StatusBadge s={result.component.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 mt-4 border-t border-sky-200/50 pt-3 text-sm">
              <span className="text-sky-800">生涯装机次数 <strong>{(result.installations || []).length}</strong> 次</span>
              <span className="text-sky-800">生涯维保记录 <strong>{(result.maintenances || []).length}</strong> 次</span>
              <span className="text-sky-800">累积飞行安全寿命 <strong>{Number(result.component.accumulated_hours).toFixed(1)} h</strong></span>
            </div>
          </div>

          {/* 安装履历 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <p className="font-semibold text-gray-800 text-sm mb-3">安拆全史记录 (Installation History)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">飞机编号</th>
                    <th className="py-2.5 px-3">安装位置</th>
                    <th className="py-2.5 px-3">安装上挂时刻</th>
                    <th className="py-2.5 px-3">拆下下挂时刻</th>
                    <th className="py-2.5 px-3">拆卸表现</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.installations.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-xs text-gray-400">该部件生涯暂无装机航线记录</td></tr>
                  ) : (
                    result.installations.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-gray-800 font-semibold">{r.aircraft_id}</td>
                        <td className="py-3 px-3 text-gray-600">{r.install_pos || "—"}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs">{r.installed_at?.slice(0, 16)}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs font-bold">
                          {r.removed_at
                            ? r.removed_at.slice(0, 16)
                            : <span className="text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded">服役中 ✈</span>}
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{r.remove_reason || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 维保履历 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <p className="font-semibold text-gray-800 text-sm mb-3">维保历史工单 (Maintenance History)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">工单代码</th>
                    <th className="py-2.5 px-3">检测类型</th>
                    <th className="py-2.5 px-3">进厂进检测日</th>
                    <th className="py-2.5 px-3">出厂结案日</th>
                    <th className="py-2.5 px-3">适航审查检验</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.maintenances.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-xs text-gray-400">暂未查阅到进厂维保工单</td></tr>
                  ) : (
                    result.maintenances.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-semibold text-gray-500">#{r.maint_id}</td>
                        <td className="py-3 px-3 text-gray-700 font-medium">{TYPE_ZH[r.maint_type] || r.maint_type}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs">{r.start_time?.slice(0, 16)}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs">
                          {r.end_time ? r.end_time.slice(0, 16) : <span className="text-amber-500">检测在修</span>}
                        </td>
                        <td className="py-3 px-3">
                          {r.result ? (
                            <span className="text-xs font-semibold">
                              {r.result === "pass" ? "✅放行" : r.result === "conditional" ? "⚠️有限放" : "❌报废"}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 退役履历 */}
          {result.retirements && result.retirements.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-950 rounded-xl p-5 shadow-xs">
              <p className="font-extrabold text-red-700 text-sm mb-3">⚠️ 生死报废/退役最终备案结论</p>
              <div className="space-y-2">
                {result.retirements.map((r, i) => (
                  <div key={i} className="text-sm bg-white/50 p-3 rounded-lg border border-red-100">
                    <span className="font-bold text-red-800">[结单处理]</span> 处理日：
                    <strong>{r.retire_time?.slice(0, 10)}</strong> · 原因：{r.reason} (类目: {r.retire_type})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 加载中 */}
          {loading && (
            <p className="text-sm text-gray-500 italic animate-pulse px-1">正在调阅履历...</p>
          )}

          {/* 部件列表 */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">序列号</th>
                  <th className="py-3 px-4">型号</th>
                  <th className="py-3 px-4">状态</th>
                  <th className="py-3 px-4">累计小时</th>
                  <th className="py-3 px-4">入库日期</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-gray-400">
                      未找到匹配的部件
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.component_id}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                      onClick={() => search(c.serial_no)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 group-hover:text-blue-700 transition">
                        {c.serial_no}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">{c.model_code || c.model_id}</td>
                      <td className="py-3 px-4"><StatusBadge s={c.status} /></td>
                      <td className="py-3 px-4 font-mono text-gray-700">{Number(c.accumulated_hours).toFixed(1)} h</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{c.inbound_date}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition">
                          查看履历 →
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}