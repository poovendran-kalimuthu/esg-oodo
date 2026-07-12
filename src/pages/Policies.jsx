import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, CheckCircle, Clock, Eye, AlertCircle, RefreshCw, Archive } from 'lucide-react';

export default function Policies() {
  const { token, user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    category: 'Sustainability',
    description: '',
    effectiveDate: '',
    expiryDate: '',
    departmentId: '',
  });

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [formError, setFormError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const isEditor = user?.role === 'ADMIN' || user?.role === 'COMPLIANCE_OFFICER';

  const fetchData = async () => {
    try {
      // Policies
      const policiesRes = await fetch('http://localhost:5000/api/v1/policies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const policiesData = await policiesRes.json();
      if (policiesData.success) {
        setPolicies(policiesData.policies);
      }

      // Departments (only needed for forms)
      if (isEditor) {
        const deptRes = await fetch('http://localhost:5000/api/v1/departments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const deptData = await deptRes.json();
        if (deptData.success) {
          setDepartments(deptData.departments);
        }
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

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-validate dates
    const eff = new Date(formData.effectiveDate);
    const exp = new Date(formData.expiryDate);
    const now = new Date();
    const yesterday = new Date(now.setDate(now.getDate() - 1));

    if (eff < yesterday) {
      setFormError('Effective date cannot be in the past');
      return;
    }
    if (exp <= eff) {
      setFormError('Expiry date must be greater than effective date');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/v1/policies', {
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
          category: 'Sustainability',
          description: '',
          effectiveDate: '',
          expiryDate: '',
          departmentId: '',
        });
        fetchData();
      } else {
        setFormError(data.message);
      }
    } catch (err) {
      setFormError('Failed to create policy.');
    }
  };

  const handlePublish = async (policyId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/policies/${policyId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (selectedPolicy?.id === policyId) {
          handleViewPolicy(policyId);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (policyId) => {
    if (!confirm('Are you sure you want to archive this policy? Archived policies cannot be modified.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/v1/policies/${policyId}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (selectedPolicy?.id === policyId) {
          handleViewPolicy(policyId);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledge = async (policyId, version) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/policies/${policyId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ versionNumber: version })
      });
      const data = await res.json();
      if (data.success) {
        alert('Thank you! Policy acknowledged digitally.');
        fetchData();
        if (selectedPolicy?.id === policyId) {
          handleViewPolicy(policyId);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewPolicy = async (policyId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/policies/${policyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedPolicy(data.policy);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPolicies = filterCategory
    ? policies.filter(p => p.category === filterCategory)
    : policies;

  const categories = Array.from(new Set(policies.map(p => p.category)));

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
          <h1 className="font-display font-bold text-2xl tracking-tight text-ink-900">Policies Directory</h1>
          <p className="text-ink-600 text-sm mt-0.5">View organization guidelines and submit digital compliance acknowledgements.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-black/[0.08] bg-white text-[13px] font-medium focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {isEditor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-[13.5px] px-4 py-2.5 rounded-xl shadow-glow hover:translate-y-[-1px] transition-all"
            >
              <Plus size={16} />
              Create Policy
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: List */}
        <div className="stagger s2 lg:col-span-2 flex flex-col gap-4">
          {filteredPolicies.length === 0 ? (
            <div className="glass-card rounded-3xl border border-black/[0.05] p-12 text-center text-ink-400">
              No policies found matching filter rules.
            </div>
          ) : (
            filteredPolicies.map(p => {
              // Employee check: did I acknowledge the current version?
              const myAck = p.acknowledgements && p.acknowledgements.find(a => a.versionNumber === p.version);
              const isEmp = user?.role === 'EMPLOYEE';
              return (
                <div
                  key={p.id}
                  onClick={() => handleViewPolicy(p.id)}
                  className={`
                    p-5 bg-white border rounded-2xl cursor-pointer hover:border-brand-500/50 shadow-soft transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4
                    ${selectedPolicy?.id === p.id ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-black/[0.05]'}
                  `}
                >
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{p.category}</span>
                        <span className="text-[10px] font-medium text-ink-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">ID: {p.id}</span>
                        <span className="text-[10px] font-medium text-ink-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">v{p.version}</span>
                      </div>
                      <h3 className="font-display font-semibold text-[15px] text-ink-900 mt-2">{p.title}</h3>
                      <p className="text-ink-600 text-xs mt-1 line-clamp-1">{p.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Status badges for admins */}
                    {!isEmp && (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                        p.status === 'PUBLISHED' ? 'bg-brand-50 text-brand-600' :
                        p.status === 'DRAFT' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-ink-400'
                      }`}>
                        {p.status}
                      </span>
                    )}

                    {/* Employee Acknowledged Status */}
                    {isEmp && (
                      myAck ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                          <CheckCircle size={12} /> Acknowledged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
                          <Clock size={12} /> Requires Action
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detail View */}
        <div className="stagger s3 lg:col-span-1">
          {selectedPolicy ? (
            <div className="glass-card rounded-3xl border border-black/[0.05] shadow-card p-6 flex flex-col gap-5 sticky top-6">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full uppercase tracking-wider">{selectedPolicy.category}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                    selectedPolicy.status === 'PUBLISHED' ? 'bg-brand-50 text-brand-600' :
                    selectedPolicy.status === 'DRAFT' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-ink-400'
                  }`}>
                    {selectedPolicy.status}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-ink-900 mt-3">{selectedPolicy.title}</h3>
                <p className="text-[11px] text-ink-400 mt-1">Code: {selectedPolicy.id} • Version {selectedPolicy.version}</p>
              </div>

              <div className="text-xs text-ink-600 bg-slate-50 rounded-xl p-3.5 border border-black/[0.02] flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-medium text-ink-400">Effective Date:</span>
                  <span className="font-semibold text-ink-900">{new Date(selectedPolicy.effectiveDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-ink-400">Expiry Date:</span>
                  <span className="font-semibold text-ink-900">{new Date(selectedPolicy.expiryDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-ink-900 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-xs text-ink-600 leading-relaxed bg-white border border-black/[0.03] p-3 rounded-xl">{selectedPolicy.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-black/[0.05]">
                {/* Employee Acknowledge Button */}
                {user?.role === 'EMPLOYEE' && selectedPolicy.status === 'PUBLISHED' && (
                  (() => {
                    const myAck = selectedPolicy.acknowledgements && selectedPolicy.acknowledgements.find(a => a.employeeId === user.id && a.versionNumber === selectedPolicy.version);
                    return !myAck ? (
                      <button
                        onClick={() => handleAcknowledge(selectedPolicy.id, selectedPolicy.version)}
                        className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-glow"
                      >
                        <CheckCircle size={14} /> Accept Policy Digitally
                      </button>
                    ) : (
                      <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-center text-xs text-brand-700 font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} /> Acknowledged v{selectedPolicy.version}
                      </div>
                    );
                  })()
                )}

                {/* Editor operations */}
                {isEditor && selectedPolicy.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePublish(selectedPolicy.id)}
                    className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-glow"
                  >
                    <CheckCircle size={14} /> Publish Policy
                  </button>
                )}

                {isEditor && selectedPolicy.status === 'PUBLISHED' && (
                  <button
                    onClick={() => handleArchive(selectedPolicy.id)}
                    className="w-full bg-slate-100 border border-slate-200 text-ink-800 hover:bg-slate-200 font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Archive size={14} /> Archive Policy
                  </button>
                )}
              </div>

              {/* Version History / Audit list for compliance officer */}
              {isEditor && selectedPolicy.acknowledgements && (
                <div className="pt-4 border-t border-black/[0.05] text-xs">
                  <h4 className="font-semibold text-ink-950 mb-2.5">Acknowledgement Registry ({selectedPolicy.acknowledgements.length})</h4>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto">
                    {selectedPolicy.acknowledgements.map(a => (
                      <div key={a.id} className="p-2 bg-slate-50 border border-black/[0.02] rounded-lg">
                        <div className="flex justify-between font-semibold">
                          <span>{a.employee.name}</span>
                          <span className="text-brand-600">v{a.versionNumber}</span>
                        </div>
                        <p className="text-[10px] text-ink-400 mt-0.5">
                          IP: {a.ipAddress} • {new Date(a.acknowledgementTime).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {selectedPolicy.acknowledgements.length === 0 && (
                      <p className="text-center text-ink-400 py-3 italic">No employee acknowledgements yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-black/[0.05] p-10 text-center text-ink-400 flex flex-col items-center justify-center min-h-[300px]">
              <FileText size={32} className="mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Select a policy to view metadata, version timelines, and acknowledgement logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-black/[0.06] p-6 w-full max-w-lg shadow-2xl relative text-left">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-ink-400 hover:text-ink-900"
            >
              Close
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-2">Create Governance Policy</h3>
            <p className="text-ink-600 text-xs mb-5">Fill in guidelines. Created policies will start in Draft mode.</p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-1.5">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePolicy} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Policy Code ID (e.g. POL-005)</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    placeholder="POL-XXX"
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                  >
                    <option value="Sustainability">Sustainability</option>
                    <option value="Ethics & Conduct">Ethics & Conduct</option>
                    <option value="Health & Safety">Health & Safety</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Policy Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g. Supplier Carbon Emissions Framework"
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Description Guidelines</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows="3"
                  placeholder="Write clear, comprehensive guidelines for organizational compliance..."
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    required
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-800 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    required
                    className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-800 mb-1">Target Department (Optional)</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full border border-black/[0.08] px-3 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none bg-white"
                >
                  <option value="">Organization-Wide (All Departments)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl shadow-glow text-xs mt-2"
              >
                Save Policy Code
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
