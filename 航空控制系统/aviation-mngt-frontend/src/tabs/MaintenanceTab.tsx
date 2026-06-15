import React, { useState } from "react";
import { Component } from "../types";
import { useFetch, apiFetch } from "../api";
import { Msg } from "../lib/ui";
import { STATUS_ZH } from "../lib/constants";
import { SearchSelect } from "../components/SearchSelect";

interface MaintenanceRecordView {
  maint_id: number;
  component_id: string;
  maint_type: string;
  start_time: string;
  end_time: string | null;
  result: string | null;
}

const TYPE_ZH: Record<string, string> = {
  routine: "例行检查",
  repair: "故障修复",
  overhaul: "大修",
  inspection: "专项探伤/检查",
};

const RESULT_ZH: Record<string, string> = {
  pass: "✅ 合格放行",
  conditional: "⚠️ 有条件限制性放行",
  failed: "❌ 不合格(将予报废)",
};

export default function MaintenanceTab() {
  const { data: components, reload } = useFetch<Component[]>("/components");
  const { data: maints, reload: reloadMaint } = useFetch<MaintenanceRecordView[]>("/maintenance");
  const [msg, setMsg] = useState("");
  const [startForm, setStartForm] = useState({
    serial_no: "",
    maint_type: "routine",
    start_time: new Date().toISOString().slice(0, 16),
    description: "",
  });
  const [endForm, setEndForm] = useState({
    maint_id: "",
    result: "pass",
    end_time: new Date().toISOString().slice(0, 16),
  });

  const doStart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const comp = (components || []).find((c) => c.serial_no === startForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      await apiFetch("/maintenance", "POST", {
        component_id: comp.component_id,
        maint_type: startForm.maint_type,
        start_time: startForm.start_time.replace("T", " ") + ":00",
        description: startForm.description,
      });
      setMsg("✅ 维修工单登记成功！部件状态切换至[维修中]");
      reload();
      reloadMaint();
    } catch (e: any) { setMsg("❌ " + e.message); }
  };

  const doEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/maintenance/${endForm.maint_id}/close`, "PATCH", {
        end_time: endForm.end_time.replace("T", " ") + ":00",
        result: endForm.result,
      });
      setMsg("✅ 维修单成功关闭！部件已就地放行。");
      reload();
      reloadMaint();
    } catch (e: any) { setMsg("❌ " + e.message); }
  };

  const maintComponentOptions = (components || [])
    .filter((c) => !["retired", "scrapped", "installed"].includes(c.status))
    .map((c) => ({ value: c.serial_no, label: `${c.serial_no} (${STATUS_ZH[c.status]})` }));

  return (
    <div className="space-y-6">
      <Msg msg={msg} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 送修启动 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="font-semibold text-gray-800 text-sm mb-4">开启车间维修工单 (Start)</p>
          <form onSubmit={doStart} className="space-y-3.5">
            <div>
              <label className="block text-xs text-gray-400 mb-1">选拔需进厂送修部件 *</label>
              <SearchSelect
                options={maintComponentOptions}
                value={startForm.serial_no}
                onChange={(v) => setStartForm({ ...startForm, serial_no: v })}
                placeholder="搜索库存非运行状态部件..."
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">指派维修类型 *</label>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                value={startForm.maint_type}
                onChange={(e) => setStartForm({ ...startForm, maint_type: e.target.value })}
              >
                {Object.entries(TYPE_ZH).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">进厂检测时间</label>
              <input type="datetime-local"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                value={startForm.start_time}
                onChange={(e) => setStartForm({ ...startForm, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">状况评判与故障表现</label>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                placeholder="例如: 轴承震动检测超限"
                value={startForm.description}
                onChange={(e) => setStartForm({ ...startForm, description: e.target.value })}
              />
            </div>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 rounded-lg transition cursor-pointer shadow-xs"
            >
              一键登记并挂送修牌
            </button>
          </form>
        </div>

        {/* 完工放行 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="font-semibold text-gray-800 text-sm mb-4">完修校验与适航放行 (Complete)</p>
          <form onSubmit={doEnd} className="space-y-3.5">
            <div>
              <label className="block text-xs text-gray-400 mb-1">选定在修挂牌工单 *</label>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-medium"
                value={endForm.maint_id}
                onChange={(e) => setEndForm({ ...endForm, maint_id: e.target.value })}
                required
              >
                <option value="">选择进行中的送修工单...</option>
                {(maints || [])
                  .filter((m) => !m.end_time)
                  .map((m) => (
                    <option key={m.maint_id} value={m.maint_id}>
                      #{m.maint_id} - {m.component_id} ({TYPE_ZH[m.maint_type] || m.maint_type})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">核定结论签放放行证 *</label>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                value={endForm.result}
                onChange={(e) => setEndForm({ ...endForm, result: e.target.value })}
              >
                <option value="pass">Pass - 合格直接放行/入库</option>
                <option value="conditional">Conditional - 有条件放行/受限适用</option>
                <option value="failed">Failed - 不合格,强制退役并报废</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">校验核发时戳</label>
              <input type="datetime-local"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                value={endForm.end_time}
                onChange={(e) => setEndForm({ ...endForm, end_time: e.target.value })}
              />
            </div>
            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 rounded-lg transition cursor-pointer shadow-xs mt-11"
            >
              签发适航证书并关单
            </button>
          </form>
        </div>
      </div>

      {/* 历史工单明细 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="font-semibold text-gray-800 text-sm mb-4">企业历史维修台账</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">工单代码</th>
                <th className="py-3 px-3">对应部件</th>
                <th className="py-3 px-3">维修类型</th>
                <th className="py-3 px-3">送检进厂日</th>
                <th className="py-3 px-3">签发结案日</th>
                <th className="py-3 px-3">适航结论</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {(maints || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-400">尚无录入历史维保工单数据</td>
                </tr>
              ) : (
                (maints || []).map((m) => (
                  <tr key={m.maint_id} className="hover:bg-slate-50 border-b border-gray-100">
                    <td className="py-3.5 px-3 font-semibold text-gray-500">#{m.maint_id}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-gray-900">{m.component_id}</td>
                    <td className="py-3.5 px-3 text-gray-600 font-medium">{TYPE_ZH[m.maint_type] || m.maint_type}</td>
                    <td className="py-3.5 px-3 text-gray-400 text-xs">{m.start_time?.slice(0, 16)}</td>
                    <td className="py-3.5 px-3 text-gray-400 text-xs">
                      {m.end_time ? m.end_time.slice(0, 16) : <span className="text-amber-500 font-semibold">进行中...</span>}
                    </td>
                    <td className="py-3.5 px-3">
                      {m.result
                        ? <span className="text-sm font-semibold">{RESULT_ZH[m.result] || m.result}</span>
                        : <span className="text-gray-300">—</span>}
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
