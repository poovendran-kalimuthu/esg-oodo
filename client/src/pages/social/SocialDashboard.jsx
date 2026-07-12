import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api';
import { KPICard, SkeletonCard, PageHeader } from '../../components/ui';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Leaf, Users, Clock, TrendingUp, GraduationCap,
  PieChart as PieIcon, Award, MessageSquare, Activity,
  Calendar
} from 'lucide-react';
import { StatusBadge } from '../../components/ui';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SocialDashboard() {
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['social-dashboard'],
    queryFn: () => socialApi.dashboard().then(r => r.data.data.cards),
  });

  const { data: participationChart } = useQuery({
    queryKey: ['chart-participation'],
    queryFn: () => socialApi.participation().then(r => r.data.data.data),
  });

  const { data: deptChart } = useQuery({
    queryKey: ['chart-departments'],
    queryFn: () => socialApi.departments().then(r => r.data.data.data),
  });

  const { data: diversityChart } = useQuery({
    queryKey: ['chart-diversity'],
    queryFn: () => socialApi.diversity().then(r => r.data.data.data),
  });

  const { data: trainingChart } = useQuery({
    queryKey: ['chart-training'],
    queryFn: () => socialApi.training().then(r => r.data.data.data),
  });

  const { data: upcomingData } = useQuery({
    queryKey: ['social-upcoming'],
    queryFn: () => socialApi.upcoming().then(r => r.data.data.activities),
  });

  const kpiCards = [
    { title: 'Total CSR Activities', value: dashData?.totalCSRActivities, icon: Leaf, color: 'emerald' },
    { title: 'Active CSR Events', value: dashData?.activeCSREvents, icon: Activity, color: 'blue' },
    { title: 'Employees Participated', value: dashData?.employeesParticipated, icon: Users, color: 'purple' },
    { title: 'Volunteer Hours', value: dashData?.volunteerHours?.toFixed(0), icon: Clock, color: 'amber' },
    { title: 'Participation Rate', value: `${dashData?.participationRate ?? 0}%`, icon: TrendingUp, color: 'teal' },
    { title: 'Training Completion', value: `${dashData?.trainingCompletionPct ?? 0}%`, icon: GraduationCap, color: 'indigo' },
    { title: 'Diversity Score', value: dashData?.diversityScore, icon: PieIcon, color: 'cyan' },
    { title: 'Social Score', value: dashData?.socialScore, icon: Award, color: 'rose' },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Social Dashboard"
        subtitle="EcoSphere ESG Social Module Overview"
      />

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {dashLoading
          ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : kpiCards.map((card) => <KPICard key={card.title} {...card} />)
        }
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Participation */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Monthly Participation (6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={participationChart || []}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="participants" name="Participants" stroke="#22c55e" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Diversity Pie */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={diversityChart || []} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                {(diversityChart || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Comparison */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Participation by Department</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptChart || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="department" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="participants" name="Participants" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Training Completion Pie */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Training Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={trainingChart || []} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                {(trainingChart || []).map((entry, i) => (
                  <Cell key={i} fill={entry.fill || CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Upcoming CSR ───────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          Upcoming CSR Activities
        </h3>
        <div className="space-y-3">
          {upcomingData?.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No upcoming activities</p>
          )}
          {upcomingData?.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{a.title}</p>
                <p className="text-xs text-slate-400">{a.category?.name} · {new Date(a.eventDate).toLocaleDateString()}</p>
              </div>
              <StatusBadge status="PUBLISHED" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
