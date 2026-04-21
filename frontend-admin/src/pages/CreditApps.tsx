import { useEffect, useMemo, useState } from 'react';
import {
  decideAdminCreditApplication,
  downloadAdminCreditDocument,
  fetchAdminCreditApplicationDetails,
  fetchAdminCreditApplications,
  type AdminCreditApplication,
  type AdminCreditApplicationDetailsResponse,
} from '../lib/adminCredit';

const PAGE_SIZE = 12;

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function statusLabel(status: string) {
  const key = String(status || '').toLowerCase();
  if (key === 'submitted') return 'Submitted';
  if (key === 'under_review') return 'Under Review';
  if (key === 'pending_documents') return 'Pending Docs';
  if (key === 'approved') return 'Approved';
  if (key === 'rejected') return 'Rejected';
  return status;
}

function statusPill(status: string) {
  const key = String(status || '').toLowerCase();
  if (key === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (key === 'rejected') return 'bg-red-50 text-red-700 border-red-100';
  if (key === 'pending_documents') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

export default function CreditApps() {
  const [applications, setApplications] = useState<AdminCreditApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);
  const [approvedToday, setApprovedToday] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<AdminCreditApplicationDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [assignedLimit, setAssignedLimit] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchAdminCreditApplications({ limit: PAGE_SIZE, offset });
        if (cancelled) return;
        setApplications(response.applications || []);
        setTotal(response.total || 0);
        setPendingReview(response.summary?.pending_review || 0);
        setApprovedToday(response.summary?.approved_today || 0);
        setAvgScore(response.summary?.avg_score || 0);
        const exists = selectedId ? response.applications.some((item) => item.id === selectedId) : false;
        setSelectedId(exists ? selectedId : (response.applications[0]?.id || null));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch credit applications.');
          setApplications([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [offset]);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingDetails(true);
      try {
        const response = await fetchAdminCreditApplicationDetails(selectedId);
        if (!cancelled) setDetails(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch application details.');
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = useMemo(() => {
    if (details?.application?.id === selectedId) return details.application;
    return applications.find((item) => item.id === selectedId) || null;
  }, [applications, details, selectedId]);

  useEffect(() => {
    if (!selected) return;
    const defaultLimit = Number(selected.approved_credit_limit || selected.suggested_credit_limit || 0);
    setAssignedLimit(defaultLimit > 0 ? String(defaultLimit) : '');
    setReviewNote(selected.review_note || '');
    setActionMessage('');
  }, [selected?.id]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const submitDecision = async (status: 'approved' | 'rejected' | 'under_review' | 'pending_documents') => {
    if (!selected || saving) return;
    let approved: number | undefined;
    if (status === 'approved') {
      const parsed = Number(assignedLimit);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setActionMessage('Provide a valid approved limit.');
        return;
      }
      approved = parsed;
    }

    setSaving(true);
    setActionMessage('');
    try {
      await decideAdminCreditApplication(selected.id, {
        status,
        review_note: reviewNote.trim() || undefined,
        approved_credit_limit: approved,
      });
      const [listResp, detailsResp] = await Promise.all([
        fetchAdminCreditApplications({ limit: PAGE_SIZE, offset }),
        fetchAdminCreditApplicationDetails(selected.id),
      ]);
      setApplications(listResp.applications || []);
      setTotal(listResp.total || 0);
      setPendingReview(listResp.summary?.pending_review || 0);
      setApprovedToday(listResp.summary?.approved_today || 0);
      setAvgScore(listResp.summary?.avg_score || 0);
      setDetails(detailsResp);
      setActionMessage(`Application marked as ${statusLabel(status).toLowerCase()}.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to update application.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="mb-10">
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">Credit Application Review Queue</h2>
        <p className="text-outline font-body max-w-2xl">Manage and assess financial eligibility for local farmers. Ensure precision in credit risk evaluation to foster sustainable agricultural growth.</p>
      </header>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm"><p className="text-xs uppercase tracking-widest text-outline mb-2 font-bold">Pending Review</p><p className="text-4xl font-headline font-extrabold">{pendingReview}</p></div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm"><p className="text-xs uppercase tracking-widest text-outline mb-2 font-bold">Approved Today</p><p className="text-4xl font-headline font-extrabold">{approvedToday}</p></div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm"><p className="text-xs uppercase tracking-widest text-outline mb-2 font-bold">Avg Score</p><p className="text-4xl font-headline font-extrabold">{avgScore.toFixed(1)}</p></div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="flex-1 w-full overflow-x-auto bg-surface-container-low rounded-2xl">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-outline font-bold">
                <th className="py-4 px-4">Applicant Name</th>
                <th className="py-4 px-4 text-center">Date Submitted</th>
                <th className="py-4 px-4 text-center">Score</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td className="py-8 px-4 text-center text-outline font-semibold" colSpan={5}>Loading applications...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td className="py-8 px-4 text-center text-outline font-semibold" colSpan={5}>No applications found.</td></tr>
              ) : applications.map((app) => (
                <tr key={app.id} onClick={() => setSelectedId(app.id)} className={`cursor-pointer border-t border-stone-100 ${selectedId === app.id ? 'bg-white' : 'hover:bg-white/60'}`}>
                  <td className="py-4 px-4 font-bold">{app.full_name || app.user_id}</td>
                  <td className="py-4 px-4 text-center text-outline">{formatDate(app.submitted_at)}</td>
                  <td className="py-4 px-4 text-center font-bold">{Number(app.final_score || 0).toFixed(1)}</td>
                  <td className="py-4 px-4"><span className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase border ${statusPill(app.status)}`}>{statusLabel(app.status)}</span></td>
                  <td className="py-4 px-4 text-right"><span className="material-symbols-outlined text-outline">chevron_right</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-outline">
            <span>Showing {total === 0 ? 0 : offset + 1} to {Math.min(offset + applications.length, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 border rounded disabled:opacity-40" disabled={offset === 0 || loading} onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}>Prev</button>
              <span>{page}/{totalPages}</span>
              <button className="px-2 py-1 border rounded disabled:opacity-40" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => setOffset((v) => v + PAGE_SIZE)}>Next</button>
            </div>
          </div>
        </div>

        <aside className="w-full xl:w-96 bg-surface-container-low rounded-2xl p-6 h-[calc(100vh-6rem)] sticky top-4 overflow-y-auto border border-stone-200/50 shrink-0 custom-scrollbar">
          {!selected ? (
            <div className="text-sm text-outline font-semibold">Select an application to review.</div>
          ) : (
            <>
              <h3 className="font-headline font-bold text-xl text-on-surface mb-6">Review Panel</h3>
              <p className="font-headline font-extrabold text-lg">{selected.full_name || selected.user_id}</p>
              <p className="text-xs text-outline mb-5">{selected.location || 'Location not provided'}</p>
              <div className="mb-5 p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
                <p className="text-xs uppercase font-bold tracking-widest text-outline mb-2">Creditworthiness</p>
                <p className="font-bold text-primary">{selected.creditworthiness || 'Unrated'} · {Number(selected.final_score || 0).toFixed(1)}</p>
              </div>
              <div className="mb-5">
                <p className="text-xs uppercase font-bold tracking-widest text-outline mb-2">Documents</p>
                {loadingDetails ? <p className="text-xs text-outline">Loading...</p> : (details?.documents || []).length === 0 ? <p className="text-xs text-outline">No documents.</p> : (
                  <div className="space-y-2">
                    {(details?.documents || []).map((doc) => (
                      <button key={doc.id} onClick={() => void downloadAdminCreditDocument(selected.id, doc.id, doc.original_name || doc.stored_name)} className="w-full text-left px-3 py-2 rounded border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold">
                        {doc.original_name || doc.document_type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-outline-variant/20 space-y-3">
                <label className="text-[10px] uppercase font-bold tracking-widest text-outline block">Assigned Limit (GHS)</label>
                <input 
                  type="number" 
                  min={0} 
                  value={assignedLimit} 
                  onChange={(e) => setAssignedLimit(e.target.value)} 
                  disabled={selected.status === 'approved' || selected.status === 'rejected' || saving}
                  className="w-full bg-surface-container-highest rounded-lg text-sm font-bold p-3 outline-none disabled:opacity-60" 
                />
                
                <label className="text-[10px] uppercase font-bold tracking-widest text-outline block">Reviewer Notes</label>
                <textarea 
                  value={reviewNote} 
                  onChange={(e) => setReviewNote(e.target.value)} 
                  disabled={selected.status === 'approved' || selected.status === 'rejected' || saving}
                  className="w-full bg-surface-container-highest rounded-lg text-sm p-3 outline-none min-h-[90px] disabled:opacity-60"
                ></textarea>
                
                <div className="grid grid-cols-1 gap-2">
                  {(selected.status === 'approved' || selected.status === 'rejected') ? (
                    <button disabled className="bg-surface-container-highest text-outline font-bold py-3 rounded-lg text-sm opacity-60 cursor-not-allowed">
                      Archived
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void submitDecision('rejected')} disabled={saving} className="bg-surface-container-highest text-tertiary font-bold py-3 rounded-lg text-sm disabled:opacity-50">
                        {saving ? 'Working...' : 'Reject'}
                      </button>
                      <button onClick={() => void submitDecision('approved')} disabled={saving} className="bg-primary text-on-primary font-bold py-3 rounded-lg text-sm disabled:opacity-50">
                        {saving ? 'Working...' : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
                {actionMessage && <p className="text-xs font-semibold text-outline">{actionMessage}</p>}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
