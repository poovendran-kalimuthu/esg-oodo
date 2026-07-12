// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KPICard({ title, value, icon: Icon, color = 'emerald', trend, subtitle }) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
    rose:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
    teal:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
    indigo:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    cyan:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };
  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value ?? '—'}</p>
      <p className="text-sm text-slate-400">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    DRAFT:               'bg-slate-500/15 text-slate-400 border-slate-500/20',
    PUBLISHED:           'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    REGISTRATION_CLOSED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    ONGOING:             'bg-blue-500/15 text-blue-400 border-blue-500/20',
    COMPLETED:           'bg-purple-500/15 text-purple-400 border-purple-500/20',
    ARCHIVED:            'bg-slate-600/15 text-slate-500 border-slate-600/20',
    REGISTERED:          'bg-blue-500/15 text-blue-400 border-blue-500/20',
    PROOF_UPLOADED:      'bg-amber-500/15 text-amber-400 border-amber-500/20',
    UNDER_REVIEW:        'bg-orange-500/15 text-orange-400 border-orange-500/20',
    APPROVED:            'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    REJECTED:            'bg-rose-500/15 text-rose-400 border-rose-500/20',
    WITHDRAWN:           'bg-slate-500/15 text-slate-400 border-slate-500/20',
    NOT_STARTED:         'bg-slate-500/15 text-slate-400 border-slate-500/20',
    IN_PROGRESS:         'bg-blue-500/15 text-blue-400 border-blue-500/20',
    OVERDUE:             'bg-rose-500/15 text-rose-400 border-rose-500/20',
    SUBMITTED:           'bg-blue-500/15 text-blue-400 border-blue-500/20',
    HR_REVIEW:           'bg-purple-500/15 text-purple-400 border-purple-500/20',
    ASSIGNED:            'bg-amber-500/15 text-amber-400 border-amber-500/20',
    RESOLVED:            'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    CLOSED:              'bg-slate-500/15 text-slate-400 border-slate-500/20',
  };
  const label = status?.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-slate-500/15 text-slate-400'}`}>
      {label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 animate-pulse">
      <div className="w-10 h-10 bg-slate-700 rounded-xl mb-4" />
      <div className="h-7 bg-slate-700 rounded w-24 mb-2" />
      <div className="h-4 bg-slate-700 rounded w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array(5).fill(0).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        {Icon && <Icon className="w-8 h-8 text-slate-500" />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-slate-900 border border-white/10 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-emerald-500 hover:bg-emerald-600 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-white/5',
    danger:    'bg-rose-500 hover:bg-rose-600 text-white',
    ghost:     'text-slate-400 hover:text-white hover:bg-white/5',
    outline:   'border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <input
        className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors
          ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-emerald-500/50'}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <select
        className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors
          ${error ? 'border-rose-500/50' : 'border-white/10 focus:border-emerald-500/50'}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4 justify-end">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-xs bg-slate-800 border border-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
      >
        ← Prev
      </button>
      <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-xs bg-slate-800 border border-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
      >
        Next →
      </button>
    </div>
  );
}
