import React, { useState, useMemo } from "react";
import { Aircraft } from "../types";
import { useFetch, apiFetch } from "../api";
import { Msg } from "../lib/ui";
import { FlightLogView } from "../lib/viewTypes";

const MISSION_ZH: Record<string, string> = {
  commercial: "商业民航 Commercial",
  training: "本场训练/复引 Training",
  test: "校验调机 Test",
  mission: "特定专机/任务 Mission",
  other: "其他 Flight",
};

export default function FlightsTab() {
  const { data: aircraft } = useFetch<Aircraft[]>("/aircraft");
  const { data: flights, reload, error: flightsError } = useFetch<FlightLogView[]>("/flights");
  const [msg, setMsg] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [form, setForm] = useState({
    aircraft_id: "",
    mission_type: "commercial",
    flight_no: "",
    departure_time: new Date().toISOString().slice(0, 16),
    arrival_time: new Date().toISOString().slice(0, 16),
    flight_hours: "2.0",
    departure_loc: "",
    arrival_loc: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/flights", "POST", {
        ...form,
        aircraft_id: parseInt(form.aircraft_id),
        departure_time: form.departure_time.replace("T", " ") + ":00",
        arrival_time: form.arrival_time.replace("T", " ") + ":00",
        flight_hours: parseFloat(form.flight_hours),
      });
      setMsg("✅ 飞行记录已登记！已随动累加机上所有在装部件的小时寿命。");
      reload();
    } catch (e: any) {
      setMsg("❌ " + e.message);
    }
  };

  const filtered = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return flights || [];
    return (flights || []).filter(
      (f) =>
        (f.flight_no || "").toLowerCase().includes(q) ||
        String(f.aircraft_id).toLowerCase().includes(q) ||
        f.mission_type.toLowerCase().includes(q) ||
        (f.departure_loc || "").toLowerCase().includes(q) ||
        (f.arrival_loc || "").toLowerCase().includes(q)
    );
  }, [listQuery, flights]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 飞行登记 */}
      <div className="lg:col-span-1 bg-gray-50 p-5 rounded-xl border border-gray-200">
        <p className="font-semibold text-gray-800 text-sm mb-4">随动累时飞行登记 (Log Flight)</p>
        <Msg msg={msg} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">执行飞机 *</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-semibold"
              value={form.aircraft_id}
              onChange={(e) => setForm({ ...form, aircraft_id: e.target.value })}
              required
            >
              <option value="">选取对应注册尾号飞机...</option>
              {(aircraft || []).map((a) => (
                <option key={a.aircraft_id} value={a.aircraft_id}>
                  {a.registration_no} ({a.model})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">航班号/特编号 (Flight No.)</label>
            <input
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-bold font-mono"
              placeholder="例如: MU5101"
              value={form.flight_no}
              onChange={(e) => setForm({ ...form, flight_no: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">任务使命 *</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
              value={form.mission_type}
              onChange={(e) => setForm({ ...form, mission_type: e.target.value })}
            >
              {Object.entries(MISSION_ZH).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">始发地(ICAO/IATA)</label>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                placeholder="SHA"
                value={form.departure_loc}
                onChange={(e) => setForm({ ...form, departure_loc: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">目的地(ICAO/IATA)</label>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                placeholder="PEK"
                value={form.arrival_loc}
                onChange={(e) => setForm({ ...form, arrival_loc: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">起飞滑跑时刻</label>
              <input type="datetime-local"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 text-xs"
                value={form.departure_time}
                onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">落地关车时刻</label>
              <input type="datetime-local"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 text-xs"
                value={form.arrival_time}
                onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">记入飞行净时间（小时）</label>
            <input type="number" step="0.1" min="0.1"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-bold"
              value={form.flight_hours}
              onChange={(e) => setForm({ ...form, flight_hours: e.target.value })}
            />
          </div>
          <button type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 rounded-lg transition cursor-pointer shadow-xs"
          >
            派单登记录入
          </button>
        </form>
      </div>

      {/* 飞行记录表 */}
      <div className="lg:col-span-2 space-y-3">
        {/* 搜索栏 */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xs">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 font-mono placeholder:text-gray-400 placeholder:font-sans"
            placeholder="搜索航班号、飞机编号或地点，留空展示全部..."
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
          />
          {listQuery && (
            <button onClick={() => setListQuery("")} className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer">清空</button>
          )}
          {flightsError && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-bold shrink-0">
              加载异常
            </span>
          )}
          <span className="text-xs text-gray-400 shrink-0">{filtered.length} 条</span>
        </div>

        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">航班号</th>
                <th className="py-3 px-4">飞机编号</th>
                <th className="py-3 px-4">任务型号</th>
                <th className="py-3 px-4">空中起降时刻</th>
                <th className="py-3 px-4">计小时 (Hours)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                    {listQuery ? "未找到匹配的飞行记录" : "系统暂无录入飞行日志"}
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.flight_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{f.flight_no || "—"}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{f.aircraft_id}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{f.mission_type}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      <div>出: {f.departure_time?.slice(0, 16)}</div>
                      <div>达: {f.arrival_time?.slice(0, 16)}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-900 font-bold">{Number(f.flight_hours).toFixed(1)} h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
