import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const SECTIONS = ["Dashboard", "Emission Factors", "Product ESG Profiles", "Carbon Transactions", "Department Tracking", "Sustainability Goals", "Reports"];
const PIE_COLORS = ["#34d399", "#4ade80", "#60a5fa", "#a3e635"];
const DEPARTMENTS = ["Manufacturing", "Logistics", "Facilities", "Procurement", "Operations"];

function calcProgress(target, current) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((((target - current) / target) * 100) * 10) / 10));
}
function calcStatus(p) {
  if (p >= 100) return "Completed";
  if (p >= 80) return "On Track";
  return "Active";
}
function withStatus(g) {
  return { ...g, status: calcStatus(calcProgress(g.targetCO2, g.currentCO2)) };
}

const initialFactors = [
  { id: "ef-1", source: "Grid Electricity", category: "Energy", unit: "kWh", factor: 0.417, status: "Active" },
  { id: "ef-2", source: "Natural Gas", category: "Energy", unit: "therm", factor: 5.3, status: "Active" },
  { id: "ef-3", source: "Diesel Fleet", category: "Transport", unit: "liter", factor: 2.68, status: "Active" },
  { id: "ef-4", source: "Landfill Waste", category: "Waste", unit: "kg", factor: 0.457, status: "Inactive" },
];
const initialProducts = [
  { id: "p-1", productName: "EcoPack Cardboard Box", category: "Packaging", carbonFootprint: 1.2, recyclable: true, esgRating: "A" },
  { id: "p-2", productName: "Industrial Steel Bracket", category: "Hardware", carbonFootprint: 14.6, recyclable: true, esgRating: "C" },
  { id: "p-3", productName: "Single-Use Plastic Wrap", category: "Packaging", carbonFootprint: 3.8, recyclable: false, esgRating: "D" },
];
const initialTransactions = [
  { id: "tx-1", department: "Manufacturing", emissionSource: "Grid Electricity", quantity: 8500, unit: "kWh", emissionFactor: 0.417, date: "2026-06-02" },
  { id: "tx-2", department: "Logistics", emissionSource: "Diesel Fleet", quantity: 1200, unit: "liter", emissionFactor: 2.68, date: "2026-06-05" },
];
const initialGoals = [
  withStatus({ id: "g-1", name: "Reduce manufacturing plant emissions", department: "Manufacturing", targetCO2: 500, currentCO2: 210, deadline: "2026-12-31", manager: "Priya Nair" }),
  withStatus({ id: "g-2", name: "Logistics fleet electrification", department: "Logistics", targetCO2: 300, currentCO2: 45, deadline: "2026-09-30", manager: "Daniel Cho" }),
  withStatus({ id: "g-3", name: "Office energy efficiency upgrade", department: "Facilities", targetCO2: 120, currentCO2: 118, deadline: "2026-08-15", manager: "Sarah Mensah" }),
];
const deptStats = [
  { department: "Manufacturing", totalEmissions: 1420, carbonScore: 62, monthlyChange: -4.2, rank: 1 },
  { department: "Logistics", totalEmissions: 980, carbonScore: 71, monthlyChange: -8.5, rank: 2 },
  { department: "Facilities", totalEmissions: 640, carbonScore: 78, monthlyChange: 1.3, rank: 3 },
  { department: "Procurement", totalEmissions: 310, carbonScore: 85, monthlyChange: -2.1, rank: 4 },
];
const monthlyEmissions = [
  { month: "Jan", emissions: 3820 }, { month: "Feb", emissions: 3650 }, { month: "Mar", emissions: 3910 },
  { month: "Apr", emissions: 3540 }, { month: "May", emissions: 3280 }, { month: "Jun", emissions: 3110 },
];
const emissionSources = [{ name: "Energy", value: 45 }, { name: "Transport", value: 25 }, { name: "Waste", value: 15 }, { name: "Logistics", value: 15 }];

const STATUS_STYLES = {
  Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "On Track": "bg-lime-400/15 text-lime-300 border-lime-400/30",
  Completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Inactive: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30",
  A: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  B: "bg-lime-400/15 text-lime-300 border-lime-400/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  D: "bg-red-500/15 text-red-400 border-red-500/30",
};
function Badge({ label }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[label] || STATUS_STYLES.Active}`}>{label}</span>;
}
function ProgressBar({ progress }) {
  const c = Math.min(100, Math.max(0, progress));
  return (
    <div className="flex items-center gap-3 min-w-[130px]">
      <div className="h-2 flex-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-700 ease-out" style={{ width: `${c}%` }} />
      </div>
      <span className="text-xs font-medium text-neutral-300 tabular-nums w-9 text-right">{c.toFixed(0)}%</span>
    </div>
  );
}
function MetricCard({ label, value, delta, tone }) {
  const color = tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : "text-neutral-400";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-neutral-50">{value}</p>
      {delta && <p className={`mt-1 text-xs font-medium ${color}`}>{delta}</p>}
    </div>
  );
}
function TableShell({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            {columns.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Toolbar({ search, onSearch, actions, placeholder }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick}
            className={a.primary
              ? "rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400 transition-colors"
              : "rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-neutral-200 hover:bg-white/5 transition-colors"}>
            {a.label}
          </button>
        ))}
      </div>
      <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder}
        className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
    </div>
  );
}

function DashboardSection() {
  const total = deptStats.reduce((s, d) => s + d.totalEmissions, 0);
  const avgScore = Math.round(deptStats.reduce((s, d) => s + d.carbonScore, 0) / deptStats.length);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Environmental Score" value={`${avgScore}/100`} delta="+3 vs last month" tone="positive" />
        <MetricCard label="Total Carbon Emissions" value={`${total.toLocaleString()} t`} delta="-8.4% vs Jan" tone="positive" />
        <MetricCard label="Active Sustainability Goals" value="2" delta="3 total" />
        <MetricCard label="Carbon Reduction Progress" value="61%" delta="toward FY26 target" tone="positive" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
          <p className="mb-4 text-sm font-medium text-neutral-200">Monthly carbon trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyEmissions}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#171717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="emissions" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-4 text-sm font-medium text-neutral-200">Emission sources</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={emissionSources} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {emissionSources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#171717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-4 text-sm font-medium text-neutral-200">Department emission summary</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deptStats}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="department" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#171717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Bar dataKey="totalEmissions" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-3 text-sm font-medium text-neutral-200">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          {["Log Carbon Transaction", "Create Goal", "Add Emission Factor", "Generate Report"].map((a) => (
            <button key={a} className="rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-neutral-200 hover:bg-white/5 transition-colors">{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmissionFactorsSection() {
  const [factors] = useState(initialFactors);
  const [search, setSearch] = useState("");
  const filtered = factors.filter((f) => f.source.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-5">
      <Toolbar search={search} onSearch={setSearch} placeholder="Search emission factors..." actions={[{ label: "+ Add Factor", primary: true, onClick: () => {} }, { label: "Export", onClick: () => {} }]} />
      <TableShell columns={["Source", "Category", "Unit", "Emission Factor", "Status"]}>
        {filtered.map((f) => (
          <tr key={f.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3.5 font-medium text-neutral-100">{f.source}</td>
            <td className="px-4 py-3.5 text-neutral-300">{f.category}</td>
            <td className="px-4 py-3.5 text-neutral-300">{f.unit}</td>
            <td className="px-4 py-3.5 text-neutral-300 tabular-nums">{f.factor} kg CO2e</td>
            <td className="px-4 py-3.5"><Badge label={f.status} /></td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

function ProductProfilesSection() {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const filtered = products.filter((p) => p.productName.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-5">
      <Toolbar search={search} onSearch={setSearch} placeholder="Search products..." actions={[{ label: "+ Add Product", primary: true, onClick: () => {} }]} />
      <TableShell columns={["Product Name", "Category", "Carbon Footprint", "Recyclable", "ESG Rating"]}>
        {filtered.map((p) => (
          <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3.5 font-medium text-neutral-100">{p.productName}</td>
            <td className="px-4 py-3.5 text-neutral-300">{p.category}</td>
            <td className="px-4 py-3.5 text-neutral-300 tabular-nums">{p.carbonFootprint} kg CO2e</td>
            <td className="px-4 py-3.5 text-neutral-300">{p.recyclable ? "Yes" : "No"}</td>
            <td className="px-4 py-3.5"><Badge label={p.esgRating} /></td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

function CarbonTransactionsSection() {
  const [transactions] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const filtered = transactions.filter((t) => t.emissionSource.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-5">
      <Toolbar search={search} onSearch={setSearch} placeholder="Search transactions..." actions={[{ label: "+ Add Transaction", primary: true, onClick: () => {} }, { label: "Export", onClick: () => {} }]} />
      <TableShell columns={["Department", "Source", "Quantity", "Factor", "Calculated CO2", "Date"]}>
        {filtered.map((t) => {
          const co2 = Math.round(t.quantity * t.emissionFactor * 100) / 100;
          return (
            <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3.5 font-medium text-neutral-100">{t.department}</td>
              <td className="px-4 py-3.5 text-neutral-300">{t.emissionSource}</td>
              <td className="px-4 py-3.5 text-neutral-300 tabular-nums">{t.quantity} {t.unit}</td>
              <td className="px-4 py-3.5 text-neutral-300 tabular-nums">{t.emissionFactor}</td>
              <td className="px-4 py-3.5 font-medium text-emerald-400 tabular-nums">{co2} kg</td>
              <td className="px-4 py-3.5 text-neutral-300">{t.date}</td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}

function DepartmentTrackingSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-4 text-sm font-medium text-neutral-200">Total emissions by department</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deptStats}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="department" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#171717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Bar dataKey="totalEmissions" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {deptStats.map((d) => (
          <div key={d.department} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">{d.rank}</span>
                <span className="text-sm font-medium text-neutral-100">{d.department}</span>
              </div>
              <span className={`text-xs font-medium ${d.monthlyChange <= 0 ? "text-emerald-400" : "text-red-400"}`}>{d.monthlyChange > 0 ? "+" : ""}{d.monthlyChange}%</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-neutral-500">Total emissions</span>
              <span className="text-sm font-medium text-neutral-200 tabular-nums">{d.totalEmissions.toLocaleString()} t</span>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-neutral-500">Carbon score</span>
                <span className="text-xs text-neutral-400">{d.carbonScore}/100</span>
              </div>
              <ProgressBar progress={d.carbonScore} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SustainabilityGoalsSection() {
  const [goals, setGoals] = useState(initialGoals);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = goals.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  function handleCreate(values) {
    const progress = calcProgress(values.targetCO2, values.currentCO2);
    setGoals((prev) => [...prev, { id: `g-${Date.now()}`, ...values, status: calcStatus(progress) }]);
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <Toolbar search={search} onSearch={setSearch} placeholder="Search goals..." actions={[{ label: "+ New Goal", primary: true, onClick: () => setModalOpen(true) }, { label: "Export", onClick: () => {} }]} />
      <TableShell columns={["Goal Name", "Department", "Target CO2", "Current CO2", "Progress", "Deadline", "Status"]}>
        {filtered.map((g) => {
          const progress = calcProgress(g.targetCO2, g.currentCO2);
          return (
            <tr key={g.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3.5">
                <div className="font-medium text-neutral-100">{g.name}</div>
                <div className="text-xs text-neutral-500">{g.manager}</div>
              </td>
              <td className="px-4 py-3.5 text-neutral-300">{g.department}</td>
              <td className="px-4 py-3.5 text-neutral-300 tabular-nums">{g.targetCO2} t</td>
              <td className="px-4 py-3.5 text-neutral-300 tabular-nums">{g.currentCO2} t</td>
              <td className="px-4 py-3.5"><ProgressBar progress={progress} /></td>
              <td className="px-4 py-3.5 text-neutral-300">{g.deadline}</td>
              <td className="px-4 py-3.5"><Badge label={g.status} /></td>
            </tr>
          );
        })}
      </TableShell>

      {modalOpen && <NewGoalModal onSubmit={handleCreate} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function NewGoalModal({ onSubmit, onClose }) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [targetCO2, setTargetCO2] = useState("");
  const [currentCO2, setCurrentCO2] = useState("");
  const [deadline, setDeadline] = useState("");
  const [manager, setManager] = useState("");
  const isValid = name.trim() && targetCO2 && deadline && manager.trim();
  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60";

  function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({ name: name.trim(), department, targetCO2: Number(targetCO2), currentCO2: Number(currentCO2) || 0, deadline, manager: manager.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-100">New Sustainability Goal</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">Goal Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Reduce warehouse emissions" className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">Department</span>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">Manager</span>
              <input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Manager name" className={inputClass} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">Target CO2 (t)</span>
              <input type="number" value={targetCO2} onChange={(e) => setTargetCO2(e.target.value)} placeholder="500" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">Current CO2 (t)</span>
              <input type="number" value={currentCO2} onChange={(e) => setCurrentCO2(e.target.value)} placeholder="0" className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">Deadline</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={!isValid} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:opacity-40 transition-colors">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportsSection() {
  const reports = [
    { type: "Environmental Report", description: "Full overview of environmental performance and goals." },
    { type: "Carbon Summary", description: "Aggregated carbon emissions across all sources and departments." },
    { type: "Department Report", description: "Emission breakdown and ranking by department." },
    { type: "Sustainability Goal Report", description: "Progress and status of all active sustainability goals." },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-neutral-100">Generate a report</h2>
        <p className="mt-1 text-sm text-neutral-500">Export environmental data as PDF, Excel, or CSV.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <div key={r.type} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-neutral-100">{r.type}</p>
            <p className="mt-1 text-xs text-neutral-500">{r.description}</p>
            <button className="mt-4 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-neutral-200 hover:bg-white/5 transition-colors">Generate & Export</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTION_COMPONENTS = {
  Dashboard: DashboardSection,
  "Emission Factors": EmissionFactorsSection,
  "Product ESG Profiles": ProductProfilesSection,
  "Carbon Transactions": CarbonTransactionsSection,
  "Department Tracking": DepartmentTrackingSection,
  "Sustainability Goals": SustainabilityGoalsSection,
  Reports: ReportsSection,
};

export default function EnvironmentalModulePreview() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 px-1">
          {SECTIONS.map((s) => {
            const isActive = s === activeSection;
            return (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${isActive ? "text-emerald-400" : "text-neutral-400 hover:text-neutral-200"}`}>
                {s}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
        <div className="mt-6">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-neutral-50">{activeSection}</h1>
          </div>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
