import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">ESG Odoo</span>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item active" id="nav-dashboard">
            <span className="nav-icon">🏠</span> Dashboard
          </a>
          <a href="#users" className="nav-item" id="nav-users">
            <span className="nav-icon">👥</span> Users
          </a>
          <a href="#reports" className="nav-item" id="nav-reports">
            <span className="nav-icon">📊</span> Reports
          </a>
          <a href="#settings" className="nav-item" id="nav-settings">
            <span className="nav-icon">⚙️</span> Settings
          </a>
        </nav>

        <button onClick={handleLogout} className="logout-btn" id="logout-btn">
          <span>🚪</span> Sign Out
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h1>Dashboard</h1>
            <p className="subtitle">Welcome back, {user?.name} 👋</p>
          </div>
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* ── Stats Grid ───────────────────────────────────────────── */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <p className="stat-label">Total Users</p>
              <h2 className="stat-value">—</h2>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <p className="stat-label">Active Sessions</p>
              <h2 className="stat-value">1</h2>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🌿</div>
            <div className="stat-info">
              <p className="stat-label">ESG Reports</p>
              <h2 className="stat-value">—</h2>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <p className="stat-label">Compliance</p>
              <h2 className="stat-value">100%</h2>
            </div>
          </div>
        </div>

        {/* ── Profile Card ─────────────────────────────────────────── */}
        <div className="profile-card">
          <h2>Your Profile</h2>
          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">Name</span>
              <span className="detail-value">{user?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user?.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Role</span>
              <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
