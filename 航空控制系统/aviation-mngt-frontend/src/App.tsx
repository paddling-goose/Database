import React, { useState } from "react";
import DashboardTab   from "./tabs/DashboardTab";
import InventoryTab   from "./tabs/InventoryTab";
import OperationsTab  from "./tabs/OperationsTab";
import MaintenanceTab from "./tabs/MaintenanceTab";
import FlightsTab     from "./tabs/FlightsTab";
import LifecycleTab   from "./tabs/LifecycleTab";

const TABS = [
  { key: "dashboard",   label: "📊 智慧看板" },
  { key: "inventory",   label: "📦 仓储可用" },
  { key: "operations",  label: "⚙️ 航线安卸" },
  { key: "maintenance", label: "🔧 维保工单" },
  { key: "flights",     label: "✈️ 随动累时" },
  { key: "lifecycle",   label: "🔍 全链履历" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans tracking-tight">
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
              航空部件全生命周期适航及生产生管系统
            </h1>
            <p className="text-xs text-gray-400 font-medium">Aero-Component Full Lifecycle Airworthiness Assurance (MySQL Ledger)</p>
          </div>
          <nav className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                  tab === t.key
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-gray-500 hover:text-gray-800 hover:bg-white/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
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
