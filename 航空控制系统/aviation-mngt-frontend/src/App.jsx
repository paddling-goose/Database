import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const API = "/api";

// ============================================================
// 通用工具
// ============================================================
const STATUS_COLOR = {
  available: "#1D9E75", installed: "#378ADD",
  under_maintenance: "#EF9F27", retired: "#888780", scrapped: "#E24B4A",
};
const STATUS_ZH = {
  available: "库存可用", installed: "已安装",
  under_maintenance: "维修中", retired: "已退役", scrapped: "已报废",
};

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = useCallback(() => {
    setLoading(true);
    fetch(API + url)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

async function apiFetch(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

function Msg({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith("✅");
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 12,
      background: ok ? "#f0fdf4" : "#fff1f1",
      color: ok ? "#166534" : "#991b1b",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
    }}>{msg}</div>
  );
}

function StatusBadge({ s }) {
  return (
    <span style={{
      background: (STATUS_COLOR[s] || "#888") + "22",
      color: STATUS_COLOR[s] || "#888",
      borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500,
    }}>{STATUS_ZH[s] || s}</span>
  );
}

// ============================================================
// TAB 1：看板（数据可视化）
// ============================================================
function DashboardTab() {
  const { data: components } = useFetch("/components/");
  const { data: installs }   = useFetch("/installations/?active_only=true");
  const { data: flightStats }= useFetch("/lifecycle/stats/component-flight-hours");
  const { data: maintStats } = useFetch("/lifecycle/stats/maintenance-summary");
  const { data: flights }    = useFetch("/flights/");

  const totalHours  = (flights || []).reduce((s, f) => s + Number(f.flight_hours), 0);
  const activeCount = (components || []).filter(c => c.status === "installed").length;
  const pendingMaint= (components || []).filter(c => c.status === "under_maintenance").length;

  const statusData = Object.entries(
    (components || []).reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([k, v]) => ({ name: STATUS_ZH[k] || k, value: v, color: STATUS_COLOR[k] || "#888" }));

  const flightChartData = (flightStats || []).slice(0, 8).map(r => ({
    name: r.serial_no,
    累计小时: parseFloat(Number(r.total_hours).toFixed(1)),
    飞行次数: r.flight_count,
  }));

  const maintChartData = (maintStats || []).map(r => ({
    name: r.model_code,
    维修次数: r.total_maint,
    不合格: r.failed_count,
  }));

  const Card = ({ label, value, sub, color }) => (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "14px 18px", border: "1px solid #e5e7eb" }}>
      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 600, color: color || "#111827", margin: "0 0 2px" }}>{value ?? "—"}</p>
      {sub && <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{sub}</p>}
    </div>
  );

  const Panel = ({ title, children }) => (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
      <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 12px", color: "#111827" }}>{title}</p>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Card label="部件总数"   value={components?.length}   sub="全部实例"      color="#378ADD" />
        <Card label="在装中"     value={activeCount}           sub="已安装到飞机"  color="#1D9E75" />
        <Card label="维修中"     value={pendingMaint}          sub="送修待完成"    color="#EF9F27" />
        <Card label="总飞行小时" value={totalHours.toFixed(1)} sub={`共 ${flights?.length ?? 0} 次飞行`} color="#7c3aed" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="部件状态分布">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: 8 }}>
            {statusData.map(d => (
              <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                {d.name} {d.value}
              </span>
            ))}
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + " 件", n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="各型号维修统计">
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintChartData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="维修次数" fill="#EF9F27" radius={[3,3,0,0]} />
                <Bar dataKey="不合格"   fill="#E24B4A" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="部件飞行使用统计（累计小时 / 飞行次数）">
        <div style={{ height: Math.max(180, flightChartData.length * 38 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flightChartData} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="累计小时" fill="#378ADD" radius={[0,3,3,0]} barSize={12} />
              <Bar dataKey="飞行次数" fill="#1D9E75" radius={[0,3,3,0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="当前在装部件">
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              {["部件ID", "飞机ID", "安装位置", "安装时间"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500, color: "#6b7280", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(installs || []).map(r => (
              <tr key={r.record_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "7px 8px", fontFamily: "monospace" }}>{r.component_id}</td>
                <td style={{ padding: "7px 8px" }}>{r.aircraft_id}</td>
                <td style={{ padding: "7px 8px", color: "#6b7280" }}>{r.install_pos || "—"}</td>
                <td style={{ padding: "7px 8px", color: "#6b7280" }}>{r.installed_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ============================================================
// TAB 2：库存
// ============================================================
function InventoryTab() {
  const { data: components, reload } = useFetch("/components/");
  const { data: models }             = useFetch("/component-models/");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    serial_no: "", model_id: "", batch_no: "",
    inbound_date: new Date().toISOString().slice(0, 10),
  });

  const handleRegister = async e => {
    e.preventDefault();
    try {
      await apiFetch("/components/", "POST", { ...form, model_id: parseInt(form.model_id) });
      setMsg("✅ 入库成功");
      reload();
      setForm({ ...form, serial_no: "", batch_no: "" });
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const handleForceDelete = async serial_no => {
    // 演示非法操作：触发器会拒绝物理删除
    try {
      const comp = (components || []).find(c => c.serial_no === serial_no);
      if (!comp) return;
      await apiFetch(`/components/${comp.component_id}`, "DELETE");
      setMsg("❌ 未被拦截（异常）");
    } catch (e) {
      alert("✅ 非法操作已被数据库拦截：" + e.message);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      <div style={{ background: "#f9fafb", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>入库部件 (Register)</p>
        <Msg msg={msg} />
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input placeholder="序列号 Serial No. *" value={form.serial_no} onChange={e => setForm({ ...form, serial_no: e.target.value })} required />
          <select value={form.model_id} onChange={e => setForm({ ...form, model_id: e.target.value })} required>
            <option value="">选择部件型号 *</option>
            {(models || []).map(m => <option key={m.model_id} value={m.model_id}>{m.model_code} - {m.category}</option>)}
          </select>
          <input placeholder="批次号 Batch No." value={form.batch_no} onChange={e => setForm({ ...form, batch_no: e.target.value })} />
          <label style={{ fontSize: 12, color: "#6b7280" }}>入库日期</label>
          <input type="date" value={form.inbound_date} onChange={e => setForm({ ...form, inbound_date: e.target.value })} />
          <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px", cursor: "pointer" }}>入库</button>
        </form>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["序列号", "型号ID", "状态", "累计飞行小时", "操作"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(components || []).map(c => (
              <tr key={c.component_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{c.serial_no}</td>
                <td style={{ padding: "8px 10px" }}>{c.model_id}</td>
                <td style={{ padding: "8px 10px" }}><StatusBadge s={c.status} /></td>
                <td style={{ padding: "8px 10px" }}>{Number(c.accumulated_hours).toFixed(1)} h</td>
                <td style={{ padding: "8px 10px" }}>
                  <button onClick={() => handleForceDelete(c.serial_no)}
                    style={{ fontSize: 12, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>
                    Force Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3：安装 / 拆卸 / 退役
// ============================================================
function OperationsTab() {
  const { data: components, reload: reloadComp } = useFetch("/components/");
  const { data: aircraft }                        = useFetch("/aircraft/");
  const { data: installs, reload: reloadInst }   = useFetch("/installations/?active_only=true");
  const [msg, setMsg] = useState("");

  const [installForm, setInstallForm] = useState({
    serial_no: "", aircraft_id: "", install_pos: "",
    installed_at: new Date().toISOString().slice(0, 16),
  });
  const [removeForm, setRemoveForm] = useState({
    serial_no: "", removed_at: new Date().toISOString().slice(0, 16), remove_reason: "",
  });
  const [retireForm, setRetireForm] = useState({
    serial_no: "", retire_type: "retired",
    retire_time: new Date().toISOString().slice(0, 16), reason: "",
  });

  const reload = () => { reloadComp(); reloadInst(); };

  const doInstall = async e => {
    e.preventDefault();
    try {
      const comp = (components || []).find(c => c.serial_no === installForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      await apiFetch("/installations/", "POST", {
        component_id: comp.component_id,
        aircraft_id: parseInt(installForm.aircraft_id),
        install_pos: installForm.install_pos,
        installed_at: installForm.installed_at.replace("T", " "),
      });
      setMsg("✅ 安装成功"); reload();
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const doRemove = async e => {
    e.preventDefault();
    try {
      const comp = (components || []).find(c => c.serial_no === removeForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      const record = (installs || []).find(r => r.component_id === comp.component_id);
      if (!record) throw new Error("未找到有效安装记录");
      await apiFetch(`/installations/${record.record_id}/remove`, "PATCH", {
        removed_at: removeForm.removed_at.replace("T", " "),
        remove_reason: removeForm.remove_reason,
      });
      setMsg("✅ 拆卸成功"); reload();
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const doRetire = async e => {
    e.preventDefault();
    try {
      const comp = (components || []).find(c => c.serial_no === retireForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      await apiFetch("/retirement/", "POST", {
        component_id: comp.component_id,
        retire_type: retireForm.retire_type,
        retire_time: retireForm.retire_time.replace("T", " "),
        reason: retireForm.reason,
      });
      setMsg("✅ 退役成功"); reload();
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const Box = ({ title, children }) => (
    <div style={{ background: "#f9fafb", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
      <p style={{ fontWeight: 600, marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Msg msg={msg} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Box title="安装 (Install)">
          <form onSubmit={doInstall} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={installForm.serial_no} onChange={e => setInstallForm({ ...installForm, serial_no: e.target.value })} required>
              <option value="">选择部件...</option>
              {(components || []).filter(c => c.status === "available").map(c =>
                <option key={c.component_id} value={c.serial_no}>{c.serial_no}</option>)}
            </select>
            <select value={installForm.aircraft_id} onChange={e => setInstallForm({ ...installForm, aircraft_id: e.target.value })} required>
              <option value="">选择飞机...</option>
              {(aircraft || []).map(a => <option key={a.aircraft_id} value={a.aircraft_id}>{a.registration_no}</option>)}
            </select>
            <input placeholder="安装位置 (e.g. 左发动机)" value={installForm.install_pos} onChange={e => setInstallForm({ ...installForm, install_pos: e.target.value })} required />
            <input type="datetime-local" value={installForm.installed_at} onChange={e => setInstallForm({ ...installForm, installed_at: e.target.value })} />
            <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}>安装</button>
          </form>
        </Box>

        <Box title="拆卸 (Remove)">
          <form onSubmit={doRemove} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={removeForm.serial_no} onChange={e => setRemoveForm({ ...removeForm, serial_no: e.target.value })} required>
              <option value="">选择在装部件...</option>
              {(components || []).filter(c => c.status === "installed").map(c =>
                <option key={c.component_id} value={c.serial_no}>{c.serial_no}</option>)}
            </select>
            <input type="datetime-local" value={removeForm.removed_at} onChange={e => setRemoveForm({ ...removeForm, removed_at: e.target.value })} />
            <input placeholder="拆卸原因" value={removeForm.remove_reason} onChange={e => setRemoveForm({ ...removeForm, remove_reason: e.target.value })} />
            <button type="submit" style={{ background: "#d97706", color: "#fff", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}>拆卸</button>
          </form>
        </Box>

        <Box title="退役 (Retire)">
          <form onSubmit={doRetire} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={retireForm.serial_no} onChange={e => setRetireForm({ ...retireForm, serial_no: e.target.value })} required>
              <option value="">选择部件...</option>
              {(components || []).map(c =>
                <option key={c.component_id} value={c.serial_no}>{c.serial_no} ({STATUS_ZH[c.status]})</option>)}
            </select>
            <select value={retireForm.retire_type} onChange={e => setRetireForm({ ...retireForm, retire_type: e.target.value })}>
              <option value="retired">到寿退役</option>
              <option value="scrapped">损坏报废</option>
              <option value="admin">行政原因</option>
            </select>
            <input type="datetime-local" value={retireForm.retire_time} onChange={e => setRetireForm({ ...retireForm, retire_time: e.target.value })} />
            <input placeholder="退役原因 *" value={retireForm.reason} onChange={e => setRetireForm({ ...retireForm, reason: e.target.value })} required />
            <button type="submit" style={{ background: "#374151", color: "#fff", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}>退役</button>
          </form>
        </Box>
      </div>
    </div>
  );
}

// ============================================================
// TAB 4：维修
// ============================================================
function MaintenanceTab() {
  const { data: components, reload } = useFetch("/components/");
  const { data: maints, reload: reloadMaint } = useFetch("/maintenance/");
  const [msg, setMsg] = useState("");
  const [startForm, setStartForm] = useState({
    serial_no: "", maint_type: "routine",
    start_time: new Date().toISOString().slice(0, 16), description: "",
  });
  const [endForm, setEndForm] = useState({
    maint_id: "", result: "pass",
    end_time: new Date().toISOString().slice(0, 16),
  });

  const doStart = async e => {
    e.preventDefault();
    try {
      const comp = (components || []).find(c => c.serial_no === startForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      await apiFetch("/maintenance/", "POST", {
        component_id: comp.component_id,
        maint_type: startForm.maint_type,
        start_time: startForm.start_time.replace("T", " "),
        description: startForm.description,
      });
      setMsg("✅ 维修工单已登记"); reload(); reloadMaint();
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const doEnd = async e => {
    e.preventDefault();
    try {
      await apiFetch(`/maintenance/${endForm.maint_id}/close`, "PATCH", {
        end_time: endForm.end_time.replace("T", " "),
        result: endForm.result,
      });
      setMsg("✅ 维修已完成"); reload(); reloadMaint();
    } catch (e) { setMsg("❌ " + e.message); }
  };

  const RESULT_ZH = { pass: "✅ 放行", conditional: "⚠️ 有条件放行", failed: "❌ 不合格" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Msg msg={msg} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>开始维修 (Start)</p>
          <form onSubmit={doStart} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={startForm.serial_no} onChange={e => setStartForm({ ...startForm, serial_no: e.target.value })} required>
              <option value="">选择部件...</option>
              {(components || []).filter(c => !["retired","scrapped"].includes(c.status)).map(c =>
                <option key={c.component_id} value={c.serial_no}>{c.serial_no} ({STATUS_ZH[c.status]})</option>)}
            </select>
            <select value={startForm.maint_type} onChange={e => setStartForm({ ...startForm, maint_type: e.target.value })}>
              <option value="routine">例行检查 Routine</option>
              <option value="repair">故障修复 Repair</option>
              <option value="overhaul">大修 Overhaul</option>
              <option value="inspection">检查 Inspection</option>
            </select>
            <input type="datetime-local" value={startForm.start_time} onChange={e => setStartForm({ ...startForm, start_time: e.target.value })} />
            <input placeholder="描述（可选）" value={startForm.description} onChange={e => setStartForm({ ...startForm, description: e.target.value })} />
            <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}>登记工单</button>
          </form>
        </div>

        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>完成维修 (Complete)</p>
          <form onSubmit={doEnd} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={endForm.maint_id} onChange={e => setEndForm({ ...endForm, maint_id: e.target.value })} required>
              <option value="">选择进行中的工单...</option>
              {(maints || []).filter(m => !m.end_time).map(m =>
                <option key={m.maint_id} value={m.maint_id}>#{m.maint_id} - 部件{m.component_id} ({m.maint_type})</option>)}
            </select>
            <select value={endForm.result} onChange={e => setEndForm({ ...endForm, result: e.target.value })}>
              <option value="pass">Pass - 合格放行</option>
              <option value="conditional">Conditional - 有条件放行</option>
              <option value="failed">Failed - 不合格/报废</option>
            </select>
            <input type="datetime-local" value={endForm.end_time} onChange={e => setEndForm({ ...endForm, end_time: e.target.value })} />
            <button type="submit" style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}>完成维修</button>
          </form>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>维修记录</p>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["ID", "部件ID", "类型", "开始时间", "结束时间", "结论"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontWeight: 500, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(maints || []).map(m => (
              <tr key={m.maint_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "7px 10px" }}>#{m.maint_id}</td>
                <td style={{ padding: "7px 10px" }}>{m.component_id}</td>
                <td style={{ padding: "7px 10px" }}>{m.maint_type}</td>
                <td style={{ padding: "7px 10px", color: "#6b7280" }}>{m.start_time?.slice(0, 16)}</td>
                <td style={{ padding: "7px 10px", color: "#6b7280" }}>{m.end_time?.slice(0, 16) || "进行中…"}</td>
                <td style={{ padding: "7px 10px" }}>{RESULT_ZH[m.result] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// TAB 5：飞行记录
// ============================================================
function FlightsTab() {
  const { data: aircraft }         = useFetch("/aircraft/");
  const { data: flights, reload }  = useFetch("/flights/");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    aircraft_id: "", mission_type: "commercial", flight_no: "",
    departure_time: new Date().toISOString().slice(0, 16),
    arrival_time:   new Date().toISOString().slice(0, 16),
    flight_hours: 2.0, departure_loc: "", arrival_loc: "",
  });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiFetch("/flights/", "POST", {
        ...form,
        aircraft_id: parseInt(form.aircraft_id),
        departure_time: form.departure_time.replace("T", " "),
        arrival_time:   form.arrival_time.replace("T", " "),
        flight_hours: parseFloat(form.flight_hours),
      });
      setMsg("✅ 飞行记录已登记"); reload();
    } catch (e) { setMsg("❌ " + e.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Msg msg={msg} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>登记飞行 (Log Flight)</p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={form.aircraft_id} onChange={e => setForm({ ...form, aircraft_id: e.target.value })} required>
              <option value="">选择飞机...</option>
              {(aircraft || []).map(a => <option key={a.aircraft_id} value={a.aircraft_id}>{a.registration_no}</option>)}
            </select>
            <input placeholder="航班号（可选）" value={form.flight_no} onChange={e => setForm({ ...form, flight_no: e.target.value })} />
            <select value={form.mission_type} onChange={e => setForm({ ...form, mission_type: e.target.value })}>
              <option value="commercial">商业 Commercial</option>
              <option value="training">训练 Training</option>
              <option value="test">测试 Test</option>
              <option value="mission">任务 Mission</option>
              <option value="other">其他 Other</option>
            </select>
            <label style={{ fontSize: 12, color: "#6b7280" }}>起飞时间</label>
            <input type="datetime-local" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} />
            <label style={{ fontSize: 12, color: "#6b7280" }}>降落时间</label>
            <input type="datetime-local" value={form.arrival_time} onChange={e => setForm({ ...form, arrival_time: e.target.value })} />
            <input placeholder="出发地" value={form.departure_loc} onChange={e => setForm({ ...form, departure_loc: e.target.value })} />
            <input placeholder="目的地" value={form.arrival_loc} onChange={e => setForm({ ...form, arrival_loc: e.target.value })} />
            <label style={{ fontSize: 12, color: "#6b7280" }}>飞行时长（小时）</label>
            <input type="number" step="0.1" min="0.1" value={form.flight_hours} onChange={e => setForm({ ...form, flight_hours: e.target.value })} />
            <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}>登记</button>
          </form>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["航班号", "飞机ID", "类型", "起飞", "降落", "时长"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(flights || []).map(f => (
                <tr key={f.flight_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "7px 10px", fontFamily: "monospace" }}>{f.flight_no || "—"}</td>
                  <td style={{ padding: "7px 10px" }}>{f.aircraft_id}</td>
                  <td style={{ padding: "7px 10px" }}>{f.mission_type}</td>
                  <td style={{ padding: "7px 10px", color: "#6b7280" }}>{f.departure_time?.slice(0, 16)}</td>
                  <td style={{ padding: "7px 10px", color: "#6b7280" }}>{f.arrival_time?.slice(0, 16)}</td>
                  <td style={{ padding: "7px 10px" }}>{Number(f.flight_hours).toFixed(1)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 6：生命周期追溯
// ============================================================
function LifecycleTab() {
  const { data: components } = useFetch("/components/");
  const [serial, setSerial]  = useState("");
  const [result, setResult]  = useState(null);
  const [loading, setLoading]= useState(false);
  const [msg, setMsg]        = useState("");

  const search = async (sn) => {
    const target = sn || serial;
    if (!target) return;
    setLoading(true); setMsg(""); setResult(null);
    try {
      const data = await apiFetch(`/lifecycle/${encodeURIComponent(target)}`);
      setResult(data);
    } catch (e) { setMsg("❌ " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <select style={{ flex: 1 }} value={serial} onChange={e => { setSerial(e.target.value); search(e.target.value); }}>
          <option value="">选择部件序列号...</option>
          {(components || []).map(c => <option key={c.component_id} value={c.serial_no}>{c.serial_no}</option>)}
        </select>
        <button onClick={() => search()} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>
          追溯
        </button>
      </div>

      <Msg msg={msg} />
      {loading && <p style={{ color: "#6b7280", fontSize: 13 }}>加载中…</p>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 16, margin: "0 0 4px" }}>{result.component.serial_no}</p>
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                  型号ID {result.component.model_id} · 批次 {result.component.batch_no || "—"} · 入库 {result.component.inbound_date}
                </p>
              </div>
              <StatusBadge s={result.component.status} />
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 10, fontSize: 13 }}>
              <span style={{ color: "#6b7280" }}>安装次数 <strong>{result.installations.length}</strong></span>
              <span style={{ color: "#6b7280" }}>维修次数 <strong>{result.maintenances.length}</strong></span>
              <span style={{ color: "#6b7280" }}>累计飞行 <strong>{Number(result.component.accumulated_hours).toFixed(1)} h</strong></span>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 18px" }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>安装历史</p>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["飞机ID", "安装位置", "安装时间", "拆卸时间", "拆卸原因"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.installations.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 10, color: "#9ca3af", textAlign: "center" }}>无记录</td></tr>
                  : result.installations.map(r => (
                    <tr key={r.record_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "7px 10px" }}>{r.aircraft_id}</td>
                      <td style={{ padding: "7px 10px" }}>{r.install_pos || "—"}</td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.installed_at?.slice(0, 16)}</td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.removed_at?.slice(0, 16) || "在装中 ✈"}</td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.remove_reason || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 18px" }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>维修历史</p>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["ID", "类型", "送修时间", "完成时间", "结论"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.maintenances.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 10, color: "#9ca3af", textAlign: "center" }}>无记录</td></tr>
                  : result.maintenances.map(r => (
                    <tr key={r.maint_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "7px 10px" }}>#{r.maint_id}</td>
                      <td style={{ padding: "7px 10px" }}>{r.maint_type}</td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.start_time?.slice(0, 16)}</td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>{r.end_time?.slice(0, 16) || "进行中"}</td>
                      <td style={{ padding: "7px 10px" }}>{{ pass:"✅ 合格", conditional:"⚠️ 有条件", failed:"❌ 不合格" }[r.result] || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {result.retirements.length > 0 && (
            <div style={{ background: "#fff1f1", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px" }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#dc2626", marginBottom: 8 }}>退役记录</p>
              {result.retirements.map(r => (
                <p key={r.scrap_id} style={{ margin: "4px 0", fontSize: 13, color: "#991b1b" }}>
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

// ============================================================
// 主 App
// ============================================================
const TABS = [
  { key: "dashboard",   label: "📊 看板"   },
  { key: "inventory",   label: "📦 库存"   },
  { key: "operations",  label: "⚙️ 操作"   },
  { key: "maintenance", label: "🔧 维修"   },
  { key: "flights",     label: "✈️ 飞行"   },
  { key: "lifecycle",   label: "🔍 追溯"   },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 2px", color: "#111827" }}>航空部件生命周期与维修管理系统</h1>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Aviation Component Lifecycle Management</p>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13,
              background: tab === t.key ? "#2563eb" : "transparent",
              color: tab === t.key ? "#fff" : "#6b7280",
            }}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {tab === "dashboard"   && <DashboardTab />}
        {tab === "inventory"   && <InventoryTab />}
        {tab === "operations"  && <OperationsTab />}
        {tab === "maintenance" && <MaintenanceTab />}
        {tab === "flights"     && <FlightsTab />}
        {tab === "lifecycle"   && <LifecycleTab />}
      </main>
    </div>
  );
}