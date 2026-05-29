import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";

const API = "/api";

const STATUS_COLOR = {
  available:         "#1D9E75",
  installed:         "#378ADD",
  under_maintenance: "#EF9F27",
  retired:           "#888780",
  scrapped:          "#E24B4A",
};
const STATUS_ZH = {
  available:         "库存可用",
  installed:         "已安装",
  under_maintenance: "维修中",
  retired:           "已退役",
  scrapped:          "已报废",
};

function useFetch(url) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  useEffect(() => {
    setLoading(true);
    fetch(API + url)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [url]);
  return { data, loading, error };
}

function MetricCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "1rem 1.25rem",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: color || "var(--color-text-secondary)" }} aria-hidden />
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{label}</span>
      </div>
      <span style={{ fontSize: 26, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.2 }}>{value ?? "—"}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 16, fontWeight: 500, margin: "1.5rem 0 0.75rem", color: "var(--color-text-primary)" }}>
      {children}
    </h2>
  );
}

function Spinner() {
  return <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>加载中…</span>;
}

function ErrorMsg({ msg }) {
  return <span style={{ color: "var(--color-text-danger)", fontSize: 13 }}>无法连接后端：{msg}</span>;
}

function ComponentStatusChart({ components }) {
  const counts = {};
  (components || []).forEach(c => {
    counts[c.status] = (counts[c.status] || 0) + 1;
  });
  const data = Object.entries(counts).map(([k, v]) => ({
    name: STATUS_ZH[k] || k, value: v, color: STATUS_COLOR[k] || "#888",
  }));

  const CustomLegend = () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 8 }}>
      {data.map(d => (
        <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
          {d.name} {d.value}
        </span>
      ))}
    </div>
  );

  return (
    <div>
      <CustomLegend />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
              dataKey="value" paddingAngle={3}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v + " 件", n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FlightHoursChart({ stats }) {
  if (!stats?.length) return <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>暂无数据</span>;
  const data = stats.slice(0, 10).map(r => ({
    name: r.serial_no,
    飞行次数: r.flight_count,
    累计小时: parseFloat(Number(r.total_hours).toFixed(1)),
  }));
  return (
    <div style={{ height: Math.max(200, data.length * 38 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.15)" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#888" }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="累计小时" fill="#378ADD" radius={[0, 3, 3, 0]} barSize={14} />
          <Bar dataKey="飞行次数" fill="#1D9E75" radius={[0, 3, 3, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MaintenanceChart({ stats }) {
  if (!stats?.length) return <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>暂无数据</span>;
  const data = stats.map(r => ({
    name: r.model_code,
    维修次数: r.total_maint,
    平均耗时h: parseFloat(Number(r.avg_hours || 0).toFixed(1)),
    不合格: r.failed_count,
  }));
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} />
          <YAxis tick={{ fontSize: 11, fill: "#888" }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="维修次数"  fill="#EF9F27" radius={[3, 3, 0, 0]} />
          <Bar dataKey="不合格"    fill="#E24B4A" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActiveInstallTable({ installs }) {
  if (!installs?.length) return <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>暂无在装部件</span>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["部件序列号", "飞机", "安装位置", "安装时间"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {installs.map(r => (
            <tr key={r.record_id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <td style={{ padding: "7px 8px", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.component_id}</td>
              <td style={{ padding: "7px 8px" }}>{r.aircraft_id}</td>
              <td style={{ padding: "7px 8px", color: "var(--color-text-secondary)" }}>{r.install_pos || "—"}</td>
              <td style={{ padding: "7px 8px", color: "var(--color-text-secondary)" }}>{r.installed_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LifecycleSearch() {
  const [serial, setSerial]   = useState("");
  const [query, setQuery]     = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const search = useCallback(() => {
    if (!serial.trim()) return;
    setQuery(serial.trim());
    setLoading(true); setError(null); setResult(null);
    fetch(`${API}/lifecycle/${encodeURIComponent(serial.trim())}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.detail || r.status)))
      .then(d => { setResult(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [serial]);

  const StatusBadge = ({ s }) => (
    <span style={{
      background: STATUS_COLOR[s] + "22", color: STATUS_COLOR[s],
      borderRadius: "var(--border-radius-md)", padding: "2px 10px", fontSize: 12, fontWeight: 500,
    }}>{STATUS_ZH[s] || s}</span>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="输入部件序列号，如 SN-ENG-0001"
          value={serial}
          onChange={e => setSerial(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          style={{ flex: 1 }}
        />
        <button onClick={search} style={{ whiteSpace: "nowrap" }}>
          <i className="ti ti-search" aria-hidden /> 追溯
        </button>
      </div>

      {loading && <Spinner />}
      {error   && <ErrorMsg msg={error} />}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontWeight: 500, margin: "0 0 4px" }}>{result.component.serial_no}</p>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  型号 {result.component.model_id} · 批次 {result.component.batch_no || "—"} · 入库 {result.component.inbound_date}
                </p>
              </div>
              <StatusBadge s={result.component.status} />
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 13 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>安装次数 <strong>{result.installations.length}</strong></span>
              <span style={{ color: "var(--color-text-secondary)" }}>维修次数 <strong>{result.maintenances.length}</strong></span>
              <span style={{ color: "var(--color-text-secondary)" }}>累计飞行 <strong>{Number(result.component.accumulated_hours).toFixed(1)} h</strong></span>
            </div>
          </div>

          {result.installations.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <p style={{ fontWeight: 500, fontSize: 14, margin: "0 0 10px" }}>安装历史</p>
              {result.installations.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8, fontSize: 13 }}>
                  <i className="ti ti-plane-tilt" style={{ color: "#378ADD", marginTop: 2, flexShrink: 0 }} aria-hidden />
                  <div>
                    <span>飞机 {r.aircraft_id} · {r.install_pos || "未知位置"}</span>
                    <span style={{ color: "var(--color-text-tertiary)", marginLeft: 8 }}>
                      {r.installed_at?.slice(0, 10)} → {r.removed_at?.slice(0, 10) || "在装中"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.maintenances.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <p style={{ fontWeight: 500, fontSize: 14, margin: "0 0 10px" }}>维修历史</p>
              {result.maintenances.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8, fontSize: 13 }}>
                  <i className={`ti ti-tool`} style={{ color: r.result === "failed" ? "#E24B4A" : "#1D9E75", marginTop: 2, flexShrink: 0 }} aria-hidden />
                  <div>
                    <span>{r.maint_type} · {r.result ? { pass: "合格", conditional: "有条件", failed: "不合格" }[r.result] : "进行中"}</span>
                    <span style={{ color: "var(--color-text-tertiary)", marginLeft: 8 }}>
                      {r.start_time?.slice(0, 10)} → {r.end_time?.slice(0, 10) || "—"}
                    </span>
                    {r.description && <p style={{ margin: "2px 0 0", color: "var(--color-text-secondary)", fontSize: 12 }}>{r.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.retirements.length > 0 && (
            <div style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <p style={{ fontWeight: 500, fontSize: 14, margin: "0 0 8px", color: "var(--color-text-danger)" }}>退役记录</p>
              {result.retirements.map((r, i) => (
                <p key={i} style={{ margin: 0, fontSize: 13, color: "var(--color-text-danger)" }}>
                  {r.retire_time?.slice(0, 10)} · {r.retire_type} · {r.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { data: components, loading: l1, error: e1 } = useFetch("/components/");
  const { data: installs,   loading: l2, error: e2 } = useFetch("/installations/?active_only=true");
  const { data: flightStats,loading: l3, error: e3 } = useFetch("/lifecycle/stats/component-flight-hours");
  const { data: maintStats, loading: l4, error: e4 } = useFetch("/lifecycle/stats/maintenance-summary");
  const { data: flights,    loading: l5 }             = useFetch("/flights/");

  const totalHours = (flights || []).reduce((s, f) => s + Number(f.flight_hours), 0);
  const activeCount = (components || []).filter(c => c.status === "installed").length;
  const pendingMaint = (components || []).filter(c => c.status === "under_maintenance").length;

  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>航空部件管理系统数据看板</h2>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>
          <i className="ti ti-plane" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden />
          航空部件生命周期管理
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>数据看板</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard icon="ti-components"   label="部件总数"   value={components?.length}  sub="全部实例" color="#378ADD" />
        <MetricCard icon="ti-bolt"         label="在装中"     value={activeCount}           sub="已安装到飞机" color="#1D9E75" />
        <MetricCard icon="ti-tool"         label="维修中"     value={pendingMaint}          sub="送修待完成" color="#EF9F27" />
        <MetricCard icon="ti-clock-hour-4" label="总飞行小时" value={totalHours.toFixed(1)} sub={`共 ${flights?.length ?? 0} 次飞行`} color="#534AB7" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <SectionTitle>部件状态分布</SectionTitle>
          {l1 ? <Spinner /> : e1 ? <ErrorMsg msg={e1} /> : <ComponentStatusChart components={components} />}
        </div>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <SectionTitle>各型号维修统计</SectionTitle>
          {l4 ? <Spinner /> : e4 ? <ErrorMsg msg={e4} /> : <MaintenanceChart stats={maintStats} />}
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginTop: 16 }}>
        <SectionTitle>部件飞行使用统计（累计小时 / 飞行次数）</SectionTitle>
        {l3 ? <Spinner /> : e3 ? <ErrorMsg msg={e3} /> : <FlightHoursChart stats={flightStats} />}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginTop: 16 }}>
        <SectionTitle>当前在装部件</SectionTitle>
        {l2 ? <Spinner /> : e2 ? <ErrorMsg msg={e2} /> : <ActiveInstallTable installs={installs} />}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginTop: 16 }}>
        <SectionTitle>部件生命周期追溯</SectionTitle>
        <LifecycleSearch />
      </div>
    </div>
  );
}