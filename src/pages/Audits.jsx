import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Plus, CheckCircle2, AlertCircle, ArrowRight, Play, Check } from 'lucide-react';

export default function Audits() {
  const { token, user } = useAuth();
  const [audits, setAudits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    auditType: 'ESG Audit',
    departmentId: '',
    auditorId: '',
    scheduledDate: '',
  });

  const [selectedAudit, setSelectedAudit] = useState(null);
  const [formError, setFormError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const isAuditor = user?.role === 'ADMIN' || user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'AUDITOR';

  const fetchData = async () => {
    try {
      const url = filterStatus
        ? `http://localhost:5000/api/v1/audits?status=${filterStatus}`
        : 'http://localhost:5000/api/v1/audits';
      const auditsRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const auditsData = await auditsRes.json();
      if (auditsData.success) {
        setAudits(auditsData.audits);
      }

      if (isAuditor) {
        // Departments
        const deptRes = await fetch('http://localhost:5000/api/v1/departments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const deptData = await deptRes.json();
        if (deptData.success) setDepartments(deptData.departments);

        // Auditors
        const auditRes = await fetch('http://localhost:5000/api/v1/users?role=AUDITOR', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const auditData = await auditRes.json();
        if (auditData.success) setAuditors(auditData.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, user, filterStatus]);

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await fetch('http://localhost:5000/api/v1/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          id: '',
          title: '',
          auditType: 'ESG Audit',
          departmentId: '',
          auditorId: '',
          scheduledDate: '',
        });
        fetchData();
      } else {
        setFormError(data.message);
      }
    } catch (err) {
      setFormError('Failed to schedule audit.');
    }
  };

  const handleStatusTransition = async (auditId, nextStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/audits/${auditId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (selectedAudit?.id === auditId) {
          handleViewAudit(auditId);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewAudit = async (auditId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/audits/${auditId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAudit(data.audit);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto text-left">
      {/* Page Header */}
      <div className="stagger s1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-ink-900">Audits Planner</h1>
          <p className="text-ink-600 text-sm mt-0.5">Manage and track internal safety, security, and ESG compliance audit stages.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-black/[0.08] bg-white text-[13px] font-medium focus:outline-none"
          >
            <option value="">All Audits</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>

          {isAuditor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-[13.5px] px-4 py-2.5 rounded-xl shadow-glow hover:translate-y-[-1px] transition-all"
            >
              <Plus size={16} />
              Schedule Audit
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Audits List */}
        <div className="stagger s2 lg:col-span-2 flex flex-col gap-4">
          {audits.length === 0 ? (
            <div className="glass-card rounded-3xl border border-black/[0.05] p-12 text-center text-ink-400">
              No audits registered or scheduled.
            </div>
          ) : (
            audits.map(a => (
              <div
                key={a.id}
                onClick={() => handleViewAudit(a.id)}
                className={`
                  p-5 bg-white border rounded-2xl cursor-pointer hover:border-brand-500/50 shadow-soft transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4
                  ${selectedAudit?.id === a.id ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-black/[0.05]'}
                `}
              >
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-ink-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">{a.auditType}</span>
                      <span className="text-[10px] font-medium text-ink-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">Code: {a.id}</span>
                      <span className="text-[10px] font-medium text-ink-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{a.department.name}</span>
                    </div>
                    <h3 className="font-display font-semibold text-[15px] text-ink-900 mt-2">{a.title}</h3>
                    <p className="text-ink-600 text-xs mt-1">
                      Scheduled: {new Date(a.scheduledDate).toLocaleDateString()} • Auditor: {a.auditor.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                    a.status === 'CLOSED' ? 'bg-slate-100 text-ink-400' :
                    a.status === 'COMPLETED' ? 'bg-brand-50 text-brand-600' :
                    a.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right column: Audit Detail and workflow transitions */}
        <div className="stagger s3 lg:col-span-1">
          {selectedAudit ? (
            <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col gap-5 sticky top-6">
              <div>
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full uppercase tracking-wider">{selectedAudit.auditType}</span>
                <h3 className="font-display font-bold text-lg text-ink-900 mt-3">{selectedAudit.title}</h3>
                <p className="text-[11px] text-ink-400 mt-1">Code: {selectedAudit.id} • Department: {selectedAudit.department.name}</p>
              </div>

              {/* Scheduled date */}
              <div className="text-xs text-ink-600 bg-slate-50 rounded-xl p-3.5 border border-black/[0.02] flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-medium text-ink-400">Scheduled Date:</span>
                  <span className="font-semibold text-ink-900">{new Date(selectedAudit.scheduledDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-ink-400">Auditor:</span>
                  <span className="font-semibold text-ink-900">{selectedAudit.auditor.name}</span>
                </div>
                {selectedAudit.completionDate && (
                  <div className="flex justify-between">
                    <span className="font-medium text-ink-400">Completed Date:</span>
                    <span className="font-semibold text-brand-600">{new Date(selectedAudit.completionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Workflow Status Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-ink-900 uppercase tracking-wider mb-3">Audit Stage Transitions</h4>
                <div className="flex flex-col gap-2.5">
                  {[
                    { key: 'SCHEDULED', label: 'Scheduled', action: 'Plan Scheduled' },
                    { key: 'IN_PROGRESS', label: 'In Progress', action: 'Start Fieldwork' },
                    { key: 'COMPLETED', label: 'Completed', action: 'Log Completed' },
                    { key: 'CLOSED', label: 'Closed', action: 'Finalize & Close' },
                  ].map((stage, idx) => {
                    const currentIdx = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].indexOf(selectedAudit.status);
                    const stageIdx = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].indexOf(stage.key);

                    const isPast = stageIdx < currentIdx;
                    const isCurrent = stageIdx === currentIdx;
                    const isNext = stageIdx === currentIdx + 1;

                    return (
                      <div key={stage.key} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-black/[0.03]">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            isPast ? 'bg-brand-500 text-white' :
                            isCurrent ? 'bg-blue-500 text-white font-bold' : 'bg-slate-100 text-ink-400'
                          }`}>
                            {isPast ? <Check size={10} /> : idx + 1}
                          </div>
                          <span className={`font-medium ${isCurrent ? 'text-ink-950 font-semibold' : 'text-ink-600'}`}>{stage.label}</span>
                        </div>

                        {/* Transition button */}
                        {isAuditor && isNext && selectedAudit.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleStatusTransition(selectedAudit.id, stage.key)}
                            className="bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold px-2.5 py-1 rounded-lg text-[10.5px] transition-colors"
                          >
                            {stage.action}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audit Findings */}
              <div className="pt-4 border-t border-black/[0.05] text-xs">
                <h4 className="font-semibold text-ink-950 mb-2">Audit Findings ({selectedAudit.findings.length})</h4>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto">
                  {selectedAudit.findings.map(f => (
                    <div key={f.id} className="p-2.5 bg-slate-50 border border-black/[0.02] rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-ink-900">{f.id}: {f.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                          f.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                          f.severity === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                          f.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-ink-600 mt-1 line-clamp-1">{f.description}</p>
                    </div>
                  ))}
                  {selectedAudit.findings.length === 0 && (
                    <p className="text-center text-ink-400 py-3 italic">No findings logged for this audit.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-black/[0.05] p-10 text-center text-ink-400 flex flex-col items-center justify-center min-h-[300px]">
              <ShieldCheck size={32} className="mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Select an audit to inspect schedules, track workflow transitions, and audit logged findings.</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Audit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-black/[0.06] p-6 w-full max-w-lg shadow-2xl relative text-left">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-ink-400 hover:text-ink-900"
            >
              Close
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-2">Schedule Regulatory Audit</h3>
            <p className="text-ink-600 text-xs mb-5">Set targets and designate auditors. Audits start in Scheduled status.</p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-1.5">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAudit} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Audit Code ID (e.g. AUD-005)</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    placeholder="AUD-XXXX"
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Audit Type</label>
                  <select
                    value={formData.auditType}
                    onChange={(e) => setFormData({ ...formData, auditType: e.target.value })}
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="ESG Audit">ESG Audit</option>
                    <option value="Safety Audit">Safety Audit</option>
                    <option value="Security Audit">Security Audit</option>
                    <option value="Compliance Audit">Compliance Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Audit Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g. Annual ESG Operations Review"
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Target Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    required
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Assigned Auditor</label>
                  <select
                    value={formData.auditorId}
                    onChange={(e) => setFormData({ ...formData, auditorId: e.target.value })}
                    required
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Auditor</option>
                    {auditors.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl shadow-glow text-xs mt-2"
              >
                Schedule Audit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
