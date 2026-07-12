import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { csrApi } from '../../api';
import { PageHeader, StatusBadge, SkeletonRow, Button, Pagination, EmptyState } from '../../components/ui';
import { Leaf, Plus, Search, Filter, Eye, Edit2, Trash2, Calendar, Users, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['','DRAFT','PUBLISHED','REGISTRATION_CLOSED','ONGOING','COMPLETED','ARCHIVED'];

export default function CSRList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['csr-list', { search, status, page }],
    queryFn: () => csrApi.list({ search, status, page, limit: 10 }).then(r => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => csrApi.delete(id),
    onSuccess: () => {
      toast.success('Activity deleted');
      queryClient.invalidateQueries(['csr-list']);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const canManage = ['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(user?.role);

  return (
    <div className="p-6">
      <PageHeader
        title="CSR Activities"
        subtitle="Manage corporate social responsibility events"
        actions={canManage && (
          <Button onClick={() => navigate('/csr/new')} className="gap-2">
            <Plus className="w-4 h-4" /> Create Activity
          </Button>
        )}
      />

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search activities..."
            className="w-full bg-slate-800 border border-white/10 focus:border-emerald-500/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Activity','Category','Department','Date','Participants','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : data?.data?.length === 0
                  ? (
                    <tr><td colSpan={7}>
                      <EmptyState icon={Leaf} title="No CSR Activities" description="Create your first CSR activity to get started." />
                    </td></tr>
                  )
                  : data?.data?.map((a) => (
                    <tr key={a.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{a.title}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{a.venue}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{a.category?.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{a.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(a.eventDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {a._count?.participations}/{a.maxParticipants}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/csr/${a.id}`)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors rounded">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button onClick={() => navigate(`/csr/${a.id}/edit`)} className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors rounded">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if(confirm('Delete this activity?')) deleteMutation.mutate(a.id); }} className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        onPageChange={setPage}
      />
    </div>
  );
}
