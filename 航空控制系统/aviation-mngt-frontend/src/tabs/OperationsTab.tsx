import React, { useState } from "react";
import { Component, Aircraft } from "../types";
import { useFetch, apiFetch } from "../api";
import { Msg } from "../lib/ui";
import { STATUS_ZH } from "../lib/constants";
import { InstallationRecordView } from "../lib/viewTypes";
import { SearchSelect } from "../components/SearchSelect";

export default function OperationsTab() {
  const { data: components, reload: reloadComp } = useFetch<Component[]>("/components");
  const { data: aircraft } = useFetch<Aircraft[]>("/aircraft");
  const { data: installs, reload: reloadInst } = useFetch<InstallationRecordView[]>("/installations?active_only=true");
  const [msg, setMsg] = useState("");

  const [installForm, setInstallForm] = useState({
    serial_no: "",
    aircraft_id: "",
    install_pos: "",
    installed_at: new Date().toISOString().slice(0, 16),
  });
  const [removeForm, setRemoveForm] = useState({
    serial_no: "",
    removed_at: new Date().toISOString().slice(0, 16),
    remove_reason: "",
  });
  const [retireForm, setRetireForm] = useState({
    serial_no: "",
    retire_type: "retired",
    retire_time: new Date().toISOString().slice(0, 16),
    reason: "",
  });

  const reload = () => { reloadComp(); reloadInst(); };

  const doInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const comp = (components || []).find((c) => c.serial_no === installForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      await apiFetch("/installations", "POST", {
        component_id: comp.component_id,
        aircraft_id: parseInt(installForm.aircraft_id),
        install_pos: installForm.install_pos,
        installed_at: installForm.installed_at.replace("T", " ") + ":00",
      });
      setMsg("✅ 安装记录部署成功！部件已投入服役。");
      reload();
    } catch (e: any) { setMsg("❌ " + e.message); }
  };

  const doRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const comp = (components || []).find((c) => c.serial_no === removeForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      const record = (installs || []).find((r) => r.component_id === comp.serial_no);
      if (!record) throw new Error("未找到有效运行中的安装记录");
      await apiFetch(`/installations/${record.record_id}/remove`, "PATCH", {
        removed_at: removeForm.removed_at.replace("T", " ") + ":00",
        remove_reason: removeForm.remove_reason,
      });
      setMsg("✅ 部件已被安全拆卸，已恢复可用库存状态。");
      reload();
    } catch (e: any) { setMsg("❌ " + e.message); }
  };

  const doRetire = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const comp = (components || []).find((c) => c.serial_no === retireForm.serial_no);
      if (!comp) throw new Error("部件不存在");
      await apiFetch("/retirement", "POST", {
        component_id: comp.component_id,
        retire_type: retireForm.retire_type,
        retire_time: retireForm.retire_time.replace("T", " ") + ":00",
        reason: retireForm.reason,
      });
      setMsg("✅ 强制生命周期退役/报废成功更新。");
      reload();
    } catch (e: any) { setMsg("❌ " + e.message); }
  };

  // 各面板的候选列表
  const availableOptions = (components || [])
    .filter((c) => c.status === "available")
    .map((c) => ({ value: c.serial_no, label: `${c.serial_no} (${c.model_code || c.model_id})` }));

  const installedOptions = (components || [])
    .filter((c) => c.status === "installed")
    .map((c) => ({ value: c.serial_no, label: `${c.serial_no} (已装机工作)` }));

  const allComponentOptions = (components || [])
    .map((c) => ({ value: c.serial_no, label: `${c.serial_no} (${STATUS_ZH[c.status]})` }));

  return (
    <div className="space-y-6">
      <Msg msg={msg} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 安装面板 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              航线安装部署 (Install)
            </p>
            <form onSubmit={doInstall} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">选择可用多余部件 *</label>
                <SearchSelect
                  options={availableOptions}
                  value={installForm.serial_no}
                  onChange={(v) => setInstallForm({ ...installForm, serial_no: v })}
                  placeholder="搜索库存空闲部件..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">目标装载飞机 *</label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  value={installForm.aircraft_id}
                  onChange={(e) => setInstallForm({ ...installForm, aircraft_id: e.target.value })}
                  required
                >
                  <option value="">选择飞机机架编号...</option>
                  {(aircraft || []).map((a) => (
                    <option key={a.aircraft_id} value={a.aircraft_id}>
                      {a.registration_no} ({a.model})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">精确安装构型位置 *</label>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  placeholder="如：左发动机-Pylon 1"
                  value={installForm.install_pos}
                  onChange={(e) => setInstallForm({ ...installForm, install_pos: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">安装记录时戳</label>
                <input type="datetime-local"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  value={installForm.installed_at}
                  onChange={(e) => setInstallForm({ ...installForm, installed_at: e.target.value })}
                />
              </div>
              <button type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 rounded-lg transition shrink-0 cursor-pointer shadow-xs mt-2"
              >
                派工执行安装
              </button>
            </form>
          </div>
        </div>

        {/* 拆卸面板 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              航线下挂拆卸 (Remove)
            </p>
            <form onSubmit={doRemove} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">当前在飞服役部件 *</label>
                <SearchSelect
                  options={installedOptions}
                  value={removeForm.serial_no}
                  onChange={(v) => setRemoveForm({ ...removeForm, serial_no: v })}
                  placeholder="搜索在装服役部件..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">拆卸时间</label>
                <input type="datetime-local"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  value={removeForm.removed_at}
                  onChange={(e) => setRemoveForm({ ...removeForm, removed_at: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">拆下原因/工卡记录 *</label>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  placeholder="例：例行检查拆下送修"
                  value={removeForm.remove_reason}
                  onChange={(e) => setRemoveForm({ ...removeForm, remove_reason: e.target.value })}
                  required
                />
              </div>
              <button type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm py-2 rounded-lg transition shrink-0 cursor-pointer shadow-xs mt-11"
              >
                申领拆卸并转入仓储
              </button>
            </form>
          </div>
        </div>

        {/* 退役面板 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              强制造册退役 (Retire)
            </p>
            <form onSubmit={doRetire} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">选定失效退役部件 *</label>
                <SearchSelect
                  options={allComponentOptions}
                  value={retireForm.serial_no}
                  onChange={(v) => setRetireForm({ ...retireForm, serial_no: v })}
                  placeholder="搜索需强退部件..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">处理决议类型 *</label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  value={retireForm.retire_type}
                  onChange={(e) => setRetireForm({ ...retireForm, retire_type: e.target.value })}
                >
                  <option value="retired">时限/寿命到期退役</option>
                  <option value="scrapped">报废/物理损坏处置</option>
                  <option value="admin">行政决议/法律下架</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">决定时间</label>
                <input type="datetime-local"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  value={retireForm.retire_time}
                  onChange={(e) => setRetireForm({ ...retireForm, retire_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">处置原因书 *</label>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                  placeholder="例：达到设计寿命极限"
                  value={retireForm.reason}
                  onChange={(e) => setRetireForm({ ...retireForm, reason: e.target.value })}
                  required
                />
              </div>
              <button type="submit"
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium text-sm py-2 rounded-lg transition shrink-0 cursor-pointer shadow-xs mt-2"
              >
                提交最终退役处置明报
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
