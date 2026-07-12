import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  AlertTriangle,
  LogOut,
  Bell,
  Search,
  UserCheck,
  Building,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout({ children, currentPage, setCurrentPage }) {
  const { user, logout, switchRole } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('esg_token');
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/v1/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.recentActivities) {
        // Map activities as mock notification feed
        const mapped = data.recentActivities.map(act => ({
          id: act.id,
          title: act.action.replace('_', ' '),
          message: act.details,
          time: new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        }));
        setNotifications(mapped);
        setUnreadCount(mapped.length > 3 ? 3 : mapped.length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleRoleSwitch = async (role) => {
    const res = await switchRole(role);
    if (res.success) {
      setShowRoleMenu(false);
    } else {
      alert('Failed to switch role: ' + res.message);
    }
  };

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'policies', name: 'Policies', icon: FileText },
    { id: 'audits', name: 'Audits Planner', icon: ShieldCheck },
    { id: 'findings', name: 'Findings & Actions', icon: AlertTriangle },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r border-black/[0.06] bg-white/70 backdrop-blur-xl px-4 py-6 flex flex-col
        transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 6 3 11c0 4 3 8 9 11 6-3 9-7 9-11 0-5-4-9-9-9z" fill="white" fill-opacity="0.95"/>
              <path d="M12 6c-1.5 3-1.5 6 0 10M8 9c1 2 3 3 4 3M16 9c-1 2-3 3-4 3" stroke="#059669" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-[17px] tracking-tight text-ink-900">GreenLedger</span>
        </div>

        {/* User context info block */}
        {user && (
          <div className="mb-6 p-3 bg-brand-50/50 border border-brand-100/50 rounded-xl flex items-center gap-2.5">
            <Building size={16} className="text-brand-600 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-semibold tracking-wider text-brand-700 uppercase">Context Department</p>
              <p className="text-[13px] font-medium text-ink-800 truncate">{user.department || 'All Departments'}</p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 text-[14px] font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setMobileOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left
                  ${active
                    ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold shadow-md shadow-brand-500/20'
                    : 'text-ink-600 hover:bg-brand-50/50 hover:text-brand-700'}
                `}
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-6 border-t border-black/[0.05]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink-600 hover:bg-rose-50 hover:text-rose-600 transition-colors duration-200 text-[14px] font-medium text-left"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-[72px] shrink-0 flex items-center justify-between px-6 lg:px-8 border-b border-black/[0.06] bg-white/60 backdrop-blur-xl z-30">
          {/* Header Title */}
          <div>
            <h2 className="font-display font-semibold text-[17px] text-ink-900 capitalize">
              {currentPage === 'dashboard' ? 'Governance Dashboard' : currentPage}
            </h2>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Demo Role Switcher Badge */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-[12.5px] font-semibold text-amber-800"
              >
                <UserCheck size={14} />
                Role: <span className="underline">{user?.role}</span>
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-black/[0.06] rounded-xl shadow-lg p-2 z-50">
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Demo Switch Role</p>
                  <div className="h-px bg-black/[0.05] my-1"></div>
                  {['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR', 'DEPARTMENT_HEAD', 'EMPLOYEE'].map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      className={`
                        w-full text-left px-2.5 py-2 text-[13px] rounded-lg transition-colors
                        ${user?.role === role
                          ? 'bg-brand-50 text-brand-700 font-semibold'
                          : 'hover:bg-slate-50 text-ink-800'}
                      `}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadCount(0);
                }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center border border-black/[0.06] hover:bg-slate-50 transition-colors"
              >
                <Bell size={18} className="text-ink-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-black/[0.06] rounded-xl shadow-lg p-2 z-50">
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Audit logs feed</p>
                  <div className="h-px bg-black/[0.05] my-1"></div>
                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 p-1">
                    {notifications.length === 0 ? (
                      <p className="text-center text-ink-400 text-xs py-4">No recent activity logs.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-2 hover:bg-slate-50 rounded-lg text-left text-xs">
                          <div className="flex justify-between font-semibold text-ink-900">
                            <span className="capitalize">{n.title.toLowerCase()}</span>
                            <span className="text-[10px] text-ink-400">{n.time}</span>
                          </div>
                          <p className="text-ink-600 text-[11px] mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-8 bg-black/[0.06]"></div>

            {/* Profile */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-soft">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <p className="text-[13px] font-semibold text-ink-900">{user.name}</p>
                  <p className="text-[11px] text-ink-400 uppercase tracking-wide font-medium">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/30">
          {children}
        </main>
      </div>
    </div>
  );
}
