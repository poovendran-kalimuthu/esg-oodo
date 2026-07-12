import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FileCheck,
  TrendingDown,
  Activity,
  Award,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token, user]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  const { scores, counts, severityDistribution, leaderboard, recentActivities, trends } = data;

  // Custom SVG Line Chart coordinates calculation for trends
  const svgWidth = 500;
  const svgHeight = 120;
  const padding = 20;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const getCoordinates = (metric) => {
    return trends.map((t, idx) => {
      const x = padding + (idx / (trends.length - 1)) * chartWidth;
      const y = padding + chartHeight - (t[metric] / 100) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  const scorePoints = getCoordinates('governanceScore');
  const policyPoints = getCoordinates('policyCompliance');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Welcome Title */}
      <div className="stagger s1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-ink-900">Governance Console</h1>
          <p className="text-ink-600 text-sm mt-0.5">Track policies, audits, findings, and ESG compliance score dynamically.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full w-fit">
          <span className="w-2 h-2 rounded-full bg-brand-500 pulse-dot"></span>
          REAL-TIME DATA SYNC ACTIVE
        </div>
      </div>

      {/* Top Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Governance Score circular gauge */}
        <div className="stagger s2 glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col items-center justify-center relative md:col-span-1">
          <h3 className="font-display font-semibold text-sm text-ink-900 mb-4 self-start">Governance Score</h3>
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="#eef2ee" strokeWidth="8"/>
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="url(#gradRing)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * scores.governanceScore) / 100}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center count-up">
              <span className="font-display font-extrabold text-[32px] text-brand-600 leading-none tracking-tight">
                {scores.governanceScore}%
              </span>
              <span className="text-[10px] text-ink-400 font-semibold mt-1">ORGANIZATION</span>
            </div>
          </div>
        </div>

        {/* Small Scores & Counts */}
        <div className="stagger s3 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Policy Compliance */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col justify-between">
            <div>
              <p className="text-[12px] font-semibold text-ink-400 uppercase tracking-wider">Policy Compliance</p>
              <h2 className="text-3xl font-extrabold text-ink-900 mt-2">{scores.policyCompliance}%</h2>
            </div>
            <div className="mt-4">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${scores.policyCompliance}%` }}></div>
              </div>
              <p className="text-[11px] text-ink-600 mt-2">Active employee acknowledgements</p>
            </div>
          </div>

          {/* Audit Completion */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col justify-between">
            <div>
              <p className="text-[12px] font-semibold text-ink-400 uppercase tracking-wider">Audit Completion</p>
              <h2 className="text-3xl font-extrabold text-ink-900 mt-2">{scores.auditCompletion}%</h2>
            </div>
            <div className="mt-4">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${scores.auditCompletion}%` }}></div>
              </div>
              <p className="text-[11px] text-ink-600 mt-2">Completed/Closed scheduled audits</p>
            </div>
          </div>

          {/* Issue Resolution */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col justify-between">
            <div>
              <p className="text-[12px] font-semibold text-ink-400 uppercase tracking-wider">Issue Resolution</p>
              <h2 className="text-3xl font-extrabold text-ink-900 mt-2">{scores.issueResolution}%</h2>
            </div>
            <div className="mt-4">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${scores.issueResolution}%` }}></div>
              </div>
              <p className="text-[11px] text-ink-600 mt-2">Resolved, verified or closed findings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Cards Grid */}
      <div className="stagger s4 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white border border-black/[0.04] p-5 rounded-2xl flex items-center gap-4 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
            <FileCheck size={20} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Active Policies</p>
            <p className="text-lg font-bold text-ink-900 mt-0.5">{counts.activePolicies}</p>
          </div>
        </div>

        <div className="bg-white border border-black/[0.04] p-5 rounded-2xl flex items-center gap-4 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Calendar size={20} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Scheduled Audits</p>
            <p className="text-lg font-bold text-ink-900 mt-0.5">{counts.scheduledAudits}</p>
          </div>
        </div>

        <div className="bg-white border border-black/[0.04] p-5 rounded-2xl flex items-center gap-4 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Layers size={20} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Open Findings</p>
            <p className="text-lg font-bold text-ink-900 mt-0.5">{counts.openFindings}</p>
          </div>
        </div>

        <div className="bg-white border border-black/[0.04] p-5 rounded-2xl flex items-center gap-4 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertOctagon size={20} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Critical Issues</p>
            <p className="text-lg font-bold text-ink-900 mt-0.5 text-rose-600">{counts.criticalFindings}</p>
          </div>
        </div>
      </div>

      {/* Main Sections: Leaderboard, Trends, Severity, Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Leaderboard & Severity */}
        <div className="stagger s5 lg:col-span-2 flex flex-col gap-6">
          {/* Department Leaderboard */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-[15px] text-ink-900">Department Compliance Ranking</h3>
              <Award size={16} className="text-brand-600" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.04] text-ink-400 font-semibold">
                    <th className="py-2.5 text-left font-medium">Department</th>
                    <th className="py-2.5 text-center font-medium">Policy Compliance</th>
                    <th className="py-2.5 text-center font-medium">Audit Comp.</th>
                    <th className="py-2.5 text-center font-medium">Resolution</th>
                    <th className="py-2.5 text-right font-medium">Gov. Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03]">
                  {leaderboard.map((dept, index) => (
                    <tr key={dept.id} className="row-hover">
                      <td className="py-3 font-semibold text-ink-900 flex items-center gap-2">
                        <span className="w-5 h-5 bg-slate-100 rounded-md text-[10px] text-ink-400 flex items-center justify-center font-medium">
                          #{index + 1}
                        </span>
                        {dept.name}
                      </td>
                      <td className="py-3 text-center text-ink-600">{dept.policyCompliance}%</td>
                      <td className="py-3 text-center text-ink-600">{dept.auditCompletion}%</td>
                      <td className="py-3 text-center text-ink-600">{dept.issueResolution}%</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          dept.governanceScore >= 85 ? 'bg-brand-50 text-brand-600' :
                          dept.governanceScore >= 65 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {dept.governanceScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom SVG Trend Chart */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 text-left">
            <h3 className="font-display font-semibold text-[15px] text-ink-900 mb-4">Governance Score Trend (Past 6 Months)</h3>
            <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-2xl border border-black/[0.03] p-4 flex flex-col items-center">
              <svg className="w-full max-w-[500px]" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                {/* Horizontal Guide Lines */}
                <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="20" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="20" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />

                {/* Score Line */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  points={scorePoints}
                  strokeLinecap="round"
                />

                {/* Policy Line */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4"
                  points={policyPoints}
                  strokeLinecap="round"
                />

                {/* Dots for endpoints */}
                {trends.map((t, idx) => {
                  const x = padding + (idx / (trends.length - 1)) * chartWidth;
                  const y = padding + chartHeight - (t.governanceScore / 100) * chartHeight;
                  return (
                    <circle key={idx} cx={x} cy={y} r="3.5" fill="#10b981" />
                  );
                })}
              </svg>

              <div className="flex justify-between w-full max-w-[500px] px-5 mt-2.5 text-[10px] font-semibold text-ink-400 uppercase tracking-wide">
                {trends.map((t, idx) => (
                  <span key={idx}>{t.month}</span>
                ))}
              </div>

              <div className="flex gap-4 mt-4 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                  <span className="text-ink-600">Overall Governance Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 border-t-2 border-dashed border-blue-500"></span>
                  <span className="text-ink-600">Policy Compliance Trend</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Severity & Activity Logs */}
        <div className="stagger s6 flex flex-col gap-6">
          {/* Findings by Severity progress block */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 text-left">
            <h3 className="font-display font-semibold text-[15px] text-ink-900 mb-4">Active Findings by Severity</h3>
            <div className="flex flex-col gap-4">
              {/* Critical */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-600 uppercase">Critical</span>
                  <span className="text-ink-900">{severityDistribution.critical}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(severityDistribution.critical * 20, 100)}%` }}></div>
                </div>
              </div>

              {/* High */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-orange-500 uppercase">High</span>
                  <span className="text-ink-900">{severityDistribution.high}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(severityDistribution.high * 20, 100)}%` }}></div>
                </div>
              </div>

              {/* Medium */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-500 uppercase">Medium</span>
                  <span className="text-ink-900">{severityDistribution.medium}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(severityDistribution.medium * 20, 100)}%` }}></div>
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-blue-500 uppercase">Low</span>
                  <span className="text-ink-900">{severityDistribution.low}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(severityDistribution.low * 20, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 text-left flex-1 flex flex-col">
            <h3 className="font-display font-semibold text-[15px] text-ink-900 mb-4">Governance Activity Feed</h3>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[300px]">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs leading-normal">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-brand-600 font-semibold uppercase text-[10px]">
                    {act.user?.name ? act.user.name.split(' ').map(n => n[0]).join('') : 'SYS'}
                  </div>
                  <div className="text-left">
                    <p className="text-ink-900 font-semibold">
                      {act.user?.name || 'System'} <span className="font-medium text-ink-600">{act.details}</span>
                    </p>
                    <p className="text-[10px] text-ink-400 mt-1">
                      {new Date(act.createdAt).toLocaleString()} • IP: {act.ipAddress}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-center text-ink-400 py-6">No actions logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
