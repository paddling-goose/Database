import React, { useState, useMemo } from "react";
import { Component, ComponentModel } from "../types";
import { useFetch, apiFetch } from "../api";
import { Msg, StatusBadge } from "../lib/ui";

export default function InventoryTab() {
  const { data: components, reload } = useFetch<Component[]>("/components");
  const { data: models } = useFetch<ComponentModel[]>("/component-models");
  const [msg, setMsg] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [form, setForm] = useState({
    serial_no: "",
    model_id: "",
    batch_no: "",
    inbound_date: new Date().toISOString().slice(0, 10),
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/components", "POST", {
        ...form,
        model_id: parseInt(form.model_id),
      });
      setMsg("✅ 新部件成功入库注册！");
      reload();
      setForm({ ...form, serial_no: "", batch_no: "" });
    } catch (e: any) {
      setMsg("❌ " + e.message);
    }
  };

  const handleForceDelete = async (serial_no: string) => {
    try {
      const comp = (components || []).find((c) => c.serial_no === serial_no);
      if (!comp) return;
      await apiFetch(`/components/${comp.component_id}`, "DELETE");
      setMsg("❌ 未被拦截（异常错误）");
    } catch (e: any) {
      alert("✅ 非法操作已被数据库拦截：" + e.message);
    }
  };

  const filtered = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return components || [];
    return (components || []).filter(
      (c) =>
        c.serial_no.toLowerCase().includes(q) ||
        String(c.model_code || c.model_id).toLowerCase().includes(q)
    );
  }, [listQuery, components]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 注册面板 */}
      <div className="lg:col-span-1 bg-gray-50 p-5 rounded-xl border border-gray-200">
        <p className="font-semibold text-gray-800 text-sm mb-4">入库新部件 (Register)</p>
        <Msg msg={msg} />
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">部件序列号 Serial No. *</label>
            <input
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-bold"
              placeholder="例如: SN-CFM56-009"
              value={form.serial_no}
              onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">所属型号 Model *</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
              value={form.model_id}
              onChange={(e) => setForm({ ...form, model_id: e.target.value })}
              required
            >
              <option value="">选择部件分类与型号...</option>
              {(models || []).map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.model_code} ({m.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">批次号 Batch No.</label>
            <input
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-mono"
              placeholder="批次代号/编号"
              value={form.batch_no}
              onChange={(e) => setForm({ ...form, batch_no: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">入库报关/登记日期</label>
            <input
              type="date"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
              value={form.inbound_date}
              onChange={(e) => setForm({ ...form, inbound_date: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg transition duration-150 cursor-pointer shadow-xs"
          >
            部件入库登记
          </button>
        </form>
      </div>

      {/* 列表明细 */}
      <div className="lg:col-span-2 space-y-3">
        {/* 搜索栏 */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xs">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 font-mono placeholder:text-gray-400 placeholder:font-sans"
            placeholder="搜索序列号或型号，留空展示全部..."
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
          />
          {listQuery && (
            <button onClick={() => setListQuery("")} className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer">清空</button>
          )}
          <span className="text-xs text-gray-400 shrink-0">{filtered.length} 条</span>
        </div>

        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">序列号 (Serial)</th>
                <th className="py-3 px-4">所属型号 (Model Code)</th>
                <th className="py-3 px-4">状态 (Status)</th>
                <th className="py-3 px-4">飞行时数 (Hours)</th>
                <th className="py-3 px-4">底层管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                    {listQuery ? "未找到匹配的部件" : "仓库中暂无任何部件信息"}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.component_id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{c.serial_no}</td>
                    <td className="py-3 px-4 text-gray-600 font-medium">{c.model_code || c.model_id}</td>
                    <td className="py-3 px-4"><StatusBadge s={c.status} /></td>
                    <td className="py-3 px-4 font-mono text-gray-700 font-semibold">
                      {Number(c.accumulated_hours).toFixed(1)} h
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleForceDelete(c.serial_no)}
                        className="text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        Force Delete
                      </button>
                    </td>
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
