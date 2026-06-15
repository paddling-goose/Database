import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Component, ComponentModel } from "../types";
import { useFetch } from "../lib/api";
import { STATUS_COLOR, STATUS_ZH } from "../lib/constants";
import { FlightLogView, InstallationRecordView } from "../lib/viewTypes";

// ── 接口定义 ────────────────────────────────────────────────
interface FlightStat { serial_no: string; total_hours: number; flight_count: number; }
interface MaintStat  { model_code: string; total_maint: number; failed_count: number; }
interface MaintRecord {
  maint_id: number;
  component_id: string; // serial_no
  maint_type: string;
  start_time: string;
  end_time: string | null;
  result: string | null;
}

const TYPE_ZH: Record<string, string> = {
  routine: "例行检查", repair: "故障修复", overhaul: "大修", inspection: "专项检查",
};

// ── 型号深度分析子组件 ───────────────────────────────────────
function ModelAnalytics({
  components, models, allMaints,
}: {
  components: Component[];
  models: ComponentModel[];
  allMaints: MaintRecord[];
}) {
  const [code, setCode] = useState("");

  const model = useMemo(() => models.find((m) => m.model_code === code), [code, models]);

  const comps = useMemo(
    () => (code ? components.filter((c) => c.model_code === code) : []),
    [code, components]
  );

  const serials = useMemo(() => new Set(comps.map((c) => c.serial_no)), [comps]);

  const maints = useMemo(
    () => allMaints.filter((m) => serials.has(m.component_id)),
    [allMaints, serials]
  );

  // ── 计算区 ──
  const total = comps.length;
  const hours = comps.map((c) => Number(c.accumulated_hours));
  const avgHours = total ? hours.reduce((a, b) => a + b, 0) / total : 0;
  const maxHours = total ? Math.max(...hours) : 0;
  const designLife = model ? Number(model.design_life_hours) : 0;
  const maintInterval = model ? Number(model.maintenance_interval_hours) : 0;
  const utilizePct = designLife > 0 ? Math.min((avgHours / designLife) * 100, 100) : 0;

  // 状态分布
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    comps.forEach((c) => { map[c.status] = (map[c.status] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({
      name: STATUS_ZH[k] || k, value: v, color: STATUS_COLOR[k] || "#6b7280",
    }));
  }, [comps]);

  // 维修类型分布
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    maints.forEach((m) => { map[m.maint_type] = (map[m.maint_type] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: TYPE_ZH[k] || k, value: v }));
  }, [maints]);

  // 维修结果分布
  const completed = useMemo(() => maints.filter((m) => m.end_time && m.result), [maints]);
  const resultData = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach((m) => { if (m.result) map[m.result] = (map[m.result] || 0) + 1; });
    return [
      { name: "合格放行", value: map["pass"] || 0, color: "#10b981" },
      { name: "有条件放行", value: map["conditional"] || 0, color: "#f59e0b" },
      { name: "不合格", value: map["failed"] || 0, color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [completed]);

  const passRate = completed.length
    ? (((completed.filter((m) => m.result === "pass").length) / completed.length) * 100).toFixed(1)
    : null;

  // 平均维修间隔（天）：每件部件相邻两次维修开始时间之差
  const avgIntervalDays = useMemo(() => {
    const intervals: number[] = [];
    comps.forEach((comp) => {
      const cms = maints
        .filter((m) => m.component_id === comp.serial_no)
        .map((m) => new Date(m.start_time).getTime())
        .sort((a, b) => a - b);
      for (let i = 1; i < cms.length; i++) {
        intervals.push((cms[i] - cms[i - 1]) / 86400000);
      }
    });
    return intervals.length
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;
  }, [comps, maints]);

  // 寿命预警：累计小时 > 设计寿命 80% 的部件
  const warnComps = useMemo(
    () =>
      designLife > 0
        ? comps
            .filter((c) => Number(c.accumulated_hours) / designLife >= 0.8)
            .sort((a, b) => Number(b.accumulated_hours) - Number(a.accumulated_hours))
        : [],
    [comps, designLife]
  );

  // ── 渲染 ──
  if (!code) {
    return (
      <div className="space-y-4">
        <ModelSelector models={models} code={code} onChange={setCode} total={total} model={model} />
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          选择型号后显示深度统计分析
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ModelSelector models={models} code={code} onChange={setCode} total={total} model={model} />

      {/* 型号规格卡 */}
      {model && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SpecCard label="类别" value={model.category} />
          <SpecCard label="制造商" value={model.manufacturer || "—"} />
          <SpecCard label="设计寿命" value={`${Number(model.design_life_hours).toLocaleString()} h`} />
          <SpecCard label="推荐维修间隔" value={`${Number(model.maintenance_interval_hours).toLocaleString()} h`} />
        </div>
      )}

      {/* KPI 行 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="部件总数" value={total} sub={`在装 ${comps.filter(c=>c.status==="installed").length} / 退役 ${comps.filter(c=>["retired","scrapped"].includes(c.status)).length}`} color="blue" />
        <KpiCard label="平均累计飞行时" value={`${avgHours.toFixed(0)} h`} sub={`最高 ${maxHours.toFixed(0)} h`} color="purple" />
        <KpiCard label="寿命利用率" value={designLife > 0 ? `${utilizePct.toFixed(1)}%` : "—"} sub={designLife > 0 ? `均值 / ${designLife.toLocaleString()} h` : "设计寿命未知"} color={utilizePct > 80 ? "red" : utilizePct > 60 ? "amber" : "emerald"} />
        <KpiCard label="维修合格率" value={passRate != null ? `${passRate}%` : "—"} sub={`共 ${completed.length} 份完结工单`} color="emerald" />
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 状态分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">状态分布</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {statusData.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} 件`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 维修类型分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">维修类型分布</p>
          {typeData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400">暂无维修记录</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="次数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 适航结果分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">适航检验结果</p>
          {resultData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400">暂无完结工单</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-2">
                {resultData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={resultData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>
                      {resultData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} 件`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 维修间隔分析 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 寿命利用率进度 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">平均寿命利用率</p>
          {designLife > 0 ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">均值 <strong className="text-gray-900">{avgHours.toFixed(0)} h</strong></span>
                <span className="text-gray-400">设计上限 {designLife.toLocaleString()} h</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${utilizePct > 80 ? "bg-red-500" : utilizePct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${utilizePct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">最高寿命件：{maxHours.toFixed(0)} h（{designLife > 0 ? ((maxHours/designLife)*100).toFixed(1) : "—"}%）</p>
            </>
          ) : (
            <p className="text-xs text-gray-400 pt-2">该型号未设计寿命数据</p>
          )}
        </div>

        {/* 维修间隔分析 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">维修间隔分析</p>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-gray-400 text-xs">实际平均间隔</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-0.5">
                {avgIntervalDays != null ? `${avgIntervalDays} 天` : "—"}
              </p>
            </div>
            {maintInterval > 0 && (
              <div>
                <p className="text-gray-400 text-xs">推荐维修间隔</p>
                <p className="text-2xl font-extrabold text-gray-400 mt-0.5">{maintInterval.toLocaleString()} h</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            基于该型号 {comps.length} 件部件的 {maints.length} 条维修记录计算
            {avgIntervalDays != null && maintInterval > 0 && (
              <span className={` font-semibold ${avgIntervalDays < maintInterval / 24 * 0.8 ? " text-amber-600" : " text-emerald-600"}`}>
                {avgIntervalDays < maintInterval / 24 * 0.8 ? "（间隔偏短，维修频率偏高）" : "（维修节律正常）"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 寿命预警表 */}
      {warnComps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
            ⚠️ 寿命预警 — 累计飞行时超设计寿命 80%（共 {warnComps.length} 件）
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="border-b border-amber-200 text-amber-700 text-xs font-semibold">
                  <th className="pb-2 pr-4">序列号</th>
                  <th className="pb-2 pr-4">当前状态</th>
                  <th className="pb-2 pr-4">累计飞行时</th>
                  <th className="pb-2 pr-4">利用率</th>
                  <th className="pb-2">剩余寿命</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {warnComps.map((c) => {
                  const pct = (Number(c.accumulated_hours) / designLife * 100);
                  const remaining = designLife - Number(c.accumulated_hours);
                  return (
                    <tr key={c.component_id} className="hover:bg-amber-100/40 transition">
                      <td className="py-2 pr-4 font-mono font-bold text-gray-900">{c.serial_no}</td>
                      <td className="py-2 pr-4">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${STATUS_COLOR[c.status]}15`, color: STATUS_COLOR[c.status] }}>
                          {STATUS_ZH[c.status] || c.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono font-bold text-gray-800">{Number(c.accumulated_hours).toFixed(0)} h</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs font-bold ${pct >= 100 ? "text-red-600" : "text-amber-600"}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-xs text-gray-500">
                        {remaining > 0 ? `还剩 ${remaining.toFixed(0)} h` : <span className="text-red-600 font-bold">已超寿命</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 小型子组件 ───────────────────────────────────────────────
function ModelSelector({ models, code, onChange, total, model }: {
  models: ComponentModel[]; code: string; onChange: (v: string) => void; total: number; model?: ComponentModel;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-medium"
      >
        <option value="">-- 选择部件型号 --</option>
        {models.map((m) => (
          <option key={m.model_id} value={m.model_code}>
            {m.model_code} · {m.category}
          </option>
        ))}
      </select>
      {code && (
        <span className="text-xs text-gray-400">
          该型号共 <strong className="text-gray-700">{total}</strong> 件部件
          {model?.applicable_aircraft && <> · 适用机型: <strong className="text-gray-700">{model.applicable_aircraft}</strong></>}
        </span>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600", purple: "text-purple-600", emerald: "text-emerald-600",
    amber: "text-amber-500", red: "text-red-500",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold mt-1.5 ${colorMap[color] || "text-gray-800"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────────────
export default function DashboardTab() {
  const { data: components, error: componentsError } = useFetch<Component[]>("/components");
  const { data: models } = useFetch<ComponentModel[]>("/component-models");
  const { data: allMaints } = useFetch<MaintRecord[]>("/maintenance");
  const { data: installs, error: installsError } = useFetch<InstallationRecordView[]>("/installations?active_only=true");
  const { data: flightStats, error: statsError } = useFetch<FlightStat[]>("/lifecycle/stats/component-flight-hours");
  const { data: maintStats } = useFetch<MaintStat[]>("/lifecycle/stats/maintenance-summary");
  const { data: flights, error: flightsError } = useFetch<FlightLogView[]>("/flights");

  const totalHours = (flights || []).reduce((s, f) => s + Number(f.flight_hours), 0);
  const activeCount = (components || []).filter((c) => c.status === "installed").length;
  const pendingMaint = (components || []).filter((c) => c.status === "under_maintenance").length;

  const statusMap = (components || []).reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusMap).map(([k, v]) => ({
    name: STATUS_ZH[k] || k, value: v, color: STATUS_COLOR[k] || "#6b7280",
  }));

  const flightChartData = (flightStats || [])
    .sort((a, b) => Number(b.total_hours) - Number(a.total_hours))
    .slice(0, 8)
    .map((r) => ({
      name: r.serial_no,
      累计小时: parseFloat(Number(r.total_hours).toFixed(1)),
      飞行次数: r.flight_count,
    }));

  const maintChartData = (maintStats || []).map((r) => ({
    name: r.model_code, 维修次数: r.total_maint, 不合格: r.failed_count,
  }));

  return (
    <div className="space-y-6">
      {(componentsError || installsError || statsError || flightsError) && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-sm space-y-1">
          <p className="font-bold">数据加载产生异常：</p>
          {componentsError && <p>• 组件数据: {componentsError}</p>}
          {installsError && <p>• 安装记录: {installsError}</p>}
          {statsError && <p>• 随动统计: {statsError}</p>}
          {flightsError && <p>• 飞行日志: {flightsError}</p>}
        </div>
      )}

      {/* 顶部 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">部件总数</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{components?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">系统已登记的全部实例</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">在装中</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{activeCount}</p>
          <p className="text-xs text-gray-400 mt-1">当前已安装工作的飞机部件</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">送修中</p>
          <p className="text-3xl font-extrabold text-amber-500 mt-2">{pendingMaint}</p>
          <p className="text-xs text-gray-400 mt-1">处于车间维护及例检工单</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">累计飞行时数</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-2">{totalHours.toFixed(1)} h</p>
          <p className="text-xs text-gray-400 mt-1">共 {(flights || []).length} 次飞行执行记录</p>
        </div>
      </div>

      {/* 全局图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <p className="font-semibold text-sm text-gray-800 mb-4">部件状态分布</p>
          <div className="flex flex-wrap gap-4 mb-4">
            {statusData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} 件`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <p className="font-semibold text-sm text-gray-800 mb-4">各型号维修统计</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintChartData} margin={{ left: -10, right: 10, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="维修次数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="不合格" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="font-semibold text-sm text-gray-800 mb-4">部件使用寿命（按累计小时降序前 8）</p>
        <div style={{ height: Math.max(180, flightChartData.length * 36 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flightChartData} layout="vertical" margin={{ left: -10, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="累计小时" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="飞行次数" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 在装清单 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="font-semibold text-sm text-gray-800 mb-4">当前在装部件清单</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">部件序列号</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">飞机编号</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">安装位置</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">安装日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(installs || []).length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-xs text-gray-400">当前无在装部件记录</td></tr>
              ) : (
                (installs || []).map((r) => (
                  <tr key={r.record_id} className="hover:bg-slate-50 transition duration-150">
                    <td className="py-3 font-mono text-gray-900 font-bold">{r.component_id}</td>
                    <td className="py-3 text-gray-700 font-medium">{r.aircraft_id}</td>
                    <td className="py-3 text-gray-500">{r.install_pos || "—"}</td>
                    <td className="py-3 text-gray-400 text-xs">{r.installed_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 型号深度分析 ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="font-semibold text-sm text-gray-800 mb-1">🔬 按型号深度分析</p>
        <p className="text-xs text-gray-400 mb-4">
          选择一个部件型号，查看寿命利用率、维修间隔、适航结果分布及预警清单
        </p>
        {models && allMaints ? (
          <ModelAnalytics
            components={components || []}
            models={models || []}
            allMaints={allMaints || []}
          />
        ) : (
          <p className="text-xs text-gray-400 animate-pulse">正在加载型号与维修数据...</p>
        )}
      </div>
    </div>
  );
}