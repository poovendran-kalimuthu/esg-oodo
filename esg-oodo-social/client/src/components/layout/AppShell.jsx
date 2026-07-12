import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api';
import {
  LayoutDashboard, Leaf, Users, GraduationCap, MessageSquare,
  BarChart3, Trophy, Bell, LogOut, Menu, X, ChevronRight,
  Activity, PieChart, Zap
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/csr',             label: 'CSR Activities',icon: Leaf },
  { to: '/participation',   label: 'Participation', icon: Users },
  { to: '/training',        label: 'Training',      icon: GraduationCap },
  { to: '/diversity',       label: 'Diversity',     icon: PieChart },
  { to: '/feedback',        label: 'Feedback',      icon: MessageSquare },
  { to: '/reports',         label: 'Reports',       icon: BarChart3 },
  { to: '/leaderboard',     label: 'Leaderboard',   icon: Trophy },
  { to: '/notifications',   label: 'Notifications', icon: Bell },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data.data.count),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData || 0;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className={`
        flex flex-col transition-all duration-300 bg-slate-900 border-r border-white/5
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-bold text-white">EcoSphere</p>
              <p className="text-xs text-slate-400">Social Module</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* XP Bar */}
        {sidebarOpen && user && (
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-400">Level {user.level}</span>
              <span className="ml-auto text-xs text-amber-400 font-semibold">{user.xpTotal} XP</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${Math.min(((user.xpTotal % 200) / 200) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group
                ${isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
              {to === '/notifications' && unreadCount > 0 && sidebarOpen && (
                <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {!sidebarOpen && to === '/notifications' && unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center text-slate-400 hover:text-red-400 transition-colors py-1">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
