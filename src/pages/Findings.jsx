import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Plus, CheckCircle, AlertOctagon, HelpCircle, FileCheck, Check, X, Upload } from 'lucide-react';

export default function Findings() {
  const { token, user } = useAuth();
  const [findings, setFindings] = useState([]);
  const [audits, setAudits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    auditId: '',
    title: '',
    description: '',
    category: 'Environmental',
    severity: 'LOW',
    ownerId: '',
    dueDate: ''
  });

  // Action states
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [formError, setFormError] = useState('');

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionProgress, setActionProgress] = useState(100);

  const [verifyNotes, setVerifyNotes] = useState('');

  const isAuditor = user?.role === 'ADMIN' || user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'AUDITOR';

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/findings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFindings(data.findings);
      }

      if (isAuditor) {
        // Audits (only fetch in-progress audits or all audits)
        const auditsRes = await fetch('http://localhost:5000/api/v1/audits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const auditsData = await auditsRes.json();
        if (auditsData.success) {
          // Allow logging findings for Scheduled, In Progress, or Completed audits
          setAudits(auditsData.audits.filter(a => a.status !== 'CLOSED'));
        }

        // Employees
        const empRes = await fetch('http://localhost:5000/api/v1/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const empData = await empRes.json();
        if (empData.success) setEmployees(empData.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, user]);

  const handleCreateFinding = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-validations
    const parentAudit = audits.find(a => a.id === formData.auditId);
    if (!parentAudit) {
      setFormError('Please select a valid associated audit.');
      return;
    }

    if (new Date(formData.dueDate) < new Date(parentAudit.scheduledDate)) {
      setFormError('Finding due date cannot be earlier than the audit scheduled date (' + new Date(parentAudit.scheduledDate).toLocaleDateString() + ').');
      return;
    }

    if (formData.severity === 'CRITICAL' && !formData.ownerId) {
      setFormError('Critical severity findings require an immediate owner assignment.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/v1/findings', {
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
          auditId: '',
          title: '',
          description: '',
          category: 'Environmental',
          severity: 'LOW',
          ownerId: '',
          dueDate: ''
        });
        fetchData();
      } else {
        setFormError(data.message);
      }
    } catch (err) {
      setFormError('Failed to create finding.');
    }
  };

  const handleResolveActionSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const formBody = new FormData();
    formBody.append('notes', actionNotes);
    formBody.append('progress', actionProgress.toString());
    if (evidenceFile) {
      formBody.append('evidence', evidenceFile);
    }

    try {
      const res = await fetch(`http://localhost:5000/api/v1/findings/${selectedFinding.id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formBody
      });
      const data = await res.json();
      if (data.success) {
        setShowActionModal(false);
        setEvidenceFile(null);
        setActionNotes('');
        fetchData();
        handleViewFinding(selectedFinding.id);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifySubmit = async (isApproved) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/findings/${selectedFinding.id}/verify-close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isApproved, verificationNotes: verifyNotes })
      });
      const data = await res.json();
      if (data.success) {
        setShowVerifyModal(false);
        setVerifyNotes('');
        fetchData();
        handleViewFinding(selectedFinding.id);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewFinding = async (findingId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/findings/${findingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFinding(data.finding);
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
          <h1 className="font-display font-bold text-2xl tracking-tight text-ink-900">Findings & Corrective Actions</h1>
          <p className="text-ink-600 text-sm mt-0.5">Log audit findings, assign owners, submit mitigation evidence, and close issues.</p>
        </div>

        {isAuditor && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-[13.5px] px-4 py-2.5 rounded-xl shadow-glow hover:translate-y-[-1px] transition-all"
          >
            <Plus size={16} />
            Log Finding
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Findings list */}
        <div className="stagger s2 lg:col-span-2 flex flex-col gap-4">
          {findings.length === 0 ? (
            <div className="glass-card rounded-3xl border border-black/[0.05] p-12 text-center text-ink-400">
              No audit findings registered.
            </div>
          ) : (
            findings.map(f => (
              <div
                key={f.id}
                onClick={() => handleViewFinding(f.id)}
                className={`
                  p-5 bg-white border rounded-2xl cursor-pointer hover:border-brand-500/50 shadow-soft transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4
                  ${selectedFinding?.id === f.id ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-black/[0.05]'}
                `}
              >
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-ink-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className={f.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase ${
                        f.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                        f.severity === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                        f.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>{f.severity}</span>
                      <span className="text-[10px] font-medium text-ink-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">Code: {f.id}</span>
                      <span className="text-[10px] font-medium text-ink-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{f.category}</span>
                    </div>
                    <h3 className="font-display font-semibold text-[15px] text-ink-900 mt-2">{f.title}</h3>
                    <p className="text-ink-600 text-xs mt-1 line-clamp-1">{f.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                    f.status === 'CLOSED' ? 'bg-slate-100 text-ink-400' :
                    f.status === 'RESOLVED' ? 'bg-blue-50 text-blue-600' :
                    f.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {f.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right column: Detail & actions */}
        <div className="stagger s3 lg:col-span-1">
          {selectedFinding ? (
            <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col gap-5 sticky top-6">
              <div>
                <div className="flex justify-between items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase ${
                    selectedFinding.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                    selectedFinding.severity === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                    selectedFinding.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>{selectedFinding.severity}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md uppercase font-semibold">{selectedFinding.status}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-ink-900 mt-3">{selectedFinding.title}</h3>
                <p className="text-[11px] text-ink-400 mt-1">Audit Ref: {selectedFinding.auditId} • Cat: {selectedFinding.category}</p>
              </div>

              <div className="text-xs text-ink-600 bg-slate-50 rounded-xl p-3.5 border border-black/[0.02] flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-medium text-ink-400">Resolution Due:</span>
                  <span className="font-semibold text-ink-900">{new Date(selectedFinding.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-ink-400">Assigned Owner:</span>
                  <span className="font-semibold text-ink-900">{selectedFinding.owner ? selectedFinding.owner.name : 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-ink-900 uppercase tracking-wider mb-2">Finding description</h4>
                <p className="text-xs text-ink-600 leading-relaxed bg-white border border-black/[0.03] p-3 rounded-xl">{selectedFinding.description}</p>
              </div>

              {/* Action Progress tracking */}
              {selectedFinding.correctiveActions && selectedFinding.correctiveActions[0] && (
                <div className="p-3 bg-slate-50 rounded-xl border border-black/[0.02]">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ink-600">Corrective Action Progress:</span>
                    <span className="text-brand-600">{selectedFinding.correctiveActions[0].progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${selectedFinding.correctiveActions[0].progress}%` }}></div>
                  </div>
                  {selectedFinding.correctiveActions[0].closureNotes && (
                    <div className="mt-2 text-[11px] text-ink-600">
                      <strong>Notes:</strong> {selectedFinding.correctiveActions[0].closureNotes}
                    </div>
                  )}
                  {selectedFinding.correctiveActions[0].evidence && (
                    <div className="mt-1 text-[11px] text-brand-600 font-semibold flex items-center gap-1">
                      <FileCheck size={12} />
                      <a href={`http://localhost:5000${selectedFinding.correctiveActions[0].evidence}`} target="_blank" rel="noreferrer" className="underline">
                        View evidence attachment
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Corrective Action workflow triggers */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-t-black/[0.05]">
                {/* Submit Action modal trigger */}
                {selectedFinding.ownerId === user?.id && selectedFinding.status !== 'CLOSED' && (
                  <button
                    onClick={() => setShowActionModal(true)}
                    className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-glow"
                  >
                    <Upload size={14} /> Submit Action Evidence
                  </button>
                )}

                {/* Verification Modal trigger (Auditor role) */}
                {isAuditor && selectedFinding.status === 'RESOLVED' && (
                  <button
                    onClick={() => setShowVerifyModal(true)}
                    className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-glow"
                  >
                    <CheckCircle size={14} /> Verify & Close Finding
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-black/[0.05] p-10 text-center text-ink-400 flex flex-col items-center justify-center min-h-[300px]">
              <AlertTriangle size={32} className="mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Select a finding to audit description, trace corrective actions progress, or review compliance evidence.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Finding Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-black/[0.06] p-6 w-full max-w-lg shadow-2xl relative text-left">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-ink-400 hover:text-ink-900"
            >
              Close
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-2">Log Audit Finding</h3>
            <p className="text-ink-600 text-xs mb-5">Create corrective entries. Critical findings require immediate owner assignment.</p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-1.5">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFinding} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Finding ID (e.g. FND-005)</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    placeholder="FND-XXXX"
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Associated Audit</label>
                  <select
                    value={formData.auditId}
                    onChange={(e) => setFormData({ ...formData, auditId: e.target.value })}
                    required
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Audit</option>
                    {audits.map(a => (
                      <option key={a.id} value={a.id}>{a.id} - {a.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="Environmental">Environmental</option>
                    <option value="Ethics">Ethics</option>
                    <option value="Health & Safety">Health & Safety</option>
                    <option value="Documentation">Documentation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Finding Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g. Blocked Warehouse Evacuation Exits"
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows="3"
                  placeholder="Describe the issue, violating codes, and mitigation requirements..."
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Assigned Owner (Required for Critical)</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="">Unassigned (Open)</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role.toLowerCase()})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl shadow-glow text-xs mt-2"
              >
                Log Finding
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Corrective Action Submit Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-black/[0.06] p-6 w-full max-w-md shadow-2xl relative text-left text-xs">
            <button
              onClick={() => setShowActionModal(false)}
              className="absolute top-4 right-4 text-ink-400 hover:text-ink-900"
            >
              Close
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-1">Submit Corrective Action</h3>
            <p className="text-ink-600 text-[11px] mb-4">Provide proof and completion details to resolve this finding.</p>

            <form onSubmit={handleResolveActionSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold text-ink-800 mb-1">Progress Percentage</label>
                <select
                  value={actionProgress}
                  onChange={(e) => setActionProgress(Number(e.target.value))}
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl bg-white"
                >
                  <option value={20}>20% - Planning/Initiated</option>
                  <option value={50}>50% - Halfway Complete</option>
                  <option value={80}>80% - In Review/Wrapping Up</option>
                  <option value={100}>100% - Fully Resolved (Requires Approval)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Upload Evidence Image / Document</label>
                <input
                  type="file"
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                  className="w-full border border-black/[0.08] px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Closure Notes / Action Taken</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  required
                  rows="3"
                  placeholder="Summarize the remediation actions implemented..."
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl shadow-glow text-xs mt-2"
              >
                Log Corrective Action
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Verify / Close Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-black/[0.06] p-6 w-full max-w-md shadow-2xl relative text-left text-xs">
            <button
              onClick={() => setShowVerifyModal(false)}
              className="absolute top-4 right-4 text-ink-400 hover:text-ink-900"
            >
              Close
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-1">Verify Corrective Action</h3>
            <p className="text-ink-600 text-[11px] mb-4">Confirm if the resolution evidence satisfies compliance criteria.</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold text-ink-800 mb-1">Verification Review Notes</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  required
                  rows="3"
                  placeholder="Specify feedback, approval criteria or rejection reasons..."
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => handleVerifySubmit(false)}
                  className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <X size={14} /> Reject & Reassign
                </button>
                <button
                  onClick={() => handleVerifySubmit(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-glow"
                >
                  <Check size={14} /> Approve & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
