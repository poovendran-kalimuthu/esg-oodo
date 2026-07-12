import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import Audits from './pages/Audits';
import Findings from './pages/Findings';
import './App.css';

function NavigationWrapper() {
  const { token, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
          <p className="text-xs font-semibold text-ink-600">Loading GreenLedger Session...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  return (
    <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'policies' && <Policies />}
      {currentPage === 'audits' && <Audits />}
      {currentPage === 'findings' && <Findings />}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <NavigationWrapper />
    </AuthProvider>
  );
}

export default App;
