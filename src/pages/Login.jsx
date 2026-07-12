import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleDemoAutofill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  const demoUsers = [
    { name: 'Naren Selvan (Admin)', email: 'admin@greenledger.com', role: 'ADMIN' },
    { name: 'Sarah Jenkins (Compliance)', email: 'compliance@greenledger.com', role: 'COMPLIANCE' },
    { name: 'David Miller (Auditor)', email: 'auditor@greenledger.com', role: 'AUDITOR' },
    { name: 'George Russel (Employee)', email: 'george.russel@gmail.com', role: 'EMPLOYEE' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-xl border border-black/[0.05] rounded-3xl shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Form */}
        <div className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C7 2 3 6 3 11c0 4 3 8 9 11 6-3 9-7 9-11 0-5-4-9-9-9z" fill="white" fill-opacity="0.95"/>
                <path d="M12 6c-1.5 3-1.5 6 0 10M8 9c1 2 3 3 4 3M16 9c-1 2-3 3-4 3" stroke="#059669" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-[16px] text-ink-900 tracking-tight">GreenLedger</span>
          </div>

          <h1 className="font-display font-bold text-2xl text-ink-900 tracking-tight">Welcome Back</h1>
          <p className="text-ink-600 text-sm mt-1 mb-8">Access the ESG Governance & Compliance portal.</p>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-ink-800 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/[0.08] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-[14px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-ink-800 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/[0.08] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-[14px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold py-3 rounded-xl shadow-glow transition-all duration-200 text-[14px] disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Right Side: Demo Accounts */}
        <div className="bg-gradient-to-br from-ink-900 to-brand-950 p-8 lg:p-12 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -left-4 -bottom-8 w-24 h-24 bg-brand-400/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <h3 className="font-display font-bold text-lg text-brand-400 mb-1">Hackathon Evaluator Box</h3>
            <p className="text-ink-400 text-xs mb-6">Click any role to auto-fill details instantly.</p>

            <div className="flex flex-col gap-3">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  onClick={() => handleDemoAutofill(u.email)}
                  className="w-full text-left p-3 border border-white/10 hover:border-brand-400 bg-white/[0.03] hover:bg-brand-500/10 rounded-xl transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-white group-hover:text-brand-300 transition-colors">
                      {u.name}
                    </span>
                    <span className="text-[10px] bg-white/10 group-hover:bg-brand-500/20 text-ink-400 group-hover:text-brand-400 px-2 py-0.5 rounded-md font-medium uppercase transition-colors">
                      {u.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-400 mt-1 truncate">{u.email}</p>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-ink-400 mt-6 text-center italic">
              Default password for all seeded accounts is <strong className="text-brand-300">password123</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
