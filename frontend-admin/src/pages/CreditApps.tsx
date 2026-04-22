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

        <aside className="w-full xl:w-[400px] bg-[#f9f9f6] rounded-2xl h-[calc(100vh-6rem)] sticky top-4 overflow-y-auto border border-stone-200 shrink-0 custom-scrollbar flex flex-col">
          {!selected ? (
            <div className="p-8 text-sm text-outline font-semibold">Select an application to review.</div>
          ) : (
            <div className="p-8 space-y-8 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-2xl text-on-surface">Review Panel</h3>
                <span className="bg-[#084c17] text-white text-[9px] font-extrabold tracking-widest px-2 py-1 rounded">SELECTED USER</span>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-stone-200 border-2 border-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-stone-500 font-headline font-bold text-xl uppercase">{(selected.full_name || 'U').charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-headline font-bold text-xl leading-tight text-on-surface">{selected.full_name || selected.user_id}</h4>
                  <p className="text-xs text-outline font-medium">{selected.location || 'Cassava Farm, Volta Region'}</p>
                </div>
              </div>

              {/* Creditworthines Card */}
              <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-outline mb-3">Creditworthiness Label</p>
                <div className="flex items-center justify-between">
                  <p className="font-headline font-bold text-3xl text-[#084c17]">
                    {selected.creditworthiness || 'Good'} {Number(selected.final_score || 0).toFixed(0)}
                  </p>
                  <div className="flex items-end gap-1 h-6">
                    <div className="w-1.5 h-3 bg-[#084c17] rounded-full"></div>
                    <div className="w-1.5 h-5 bg-[#084c17] rounded-full"></div>
                    <div className="w-1.5 h-4 bg-stone-200 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-outline mb-4">Verification Documents</p>
                {loadingDetails ? (
                   <p className="text-xs text-outline italic">Fetching evidence dossier...</p>
                ) : (details?.documents || []).length === 0 ? (
                  <p className="text-xs text-outline italic">No supporting evidence provided.</p>
                ) : (
                  <div className="space-y-3">
                    {(details?.documents || []).map((doc) => (
                      <div key={doc.id} className="group flex items-center gap-3 bg-white p-3 rounded-xl border border-stone-100 shadow-sm hover:border-stone-200 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400 group-hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-xl">
                            {doc.document_type?.toLowerCase().includes('id') ? 'badge' : doc.document_type?.toLowerCase().includes('statement') ? 'account_balance_wallet' : 'description'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{doc.original_name || doc.document_type}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => void downloadAdminCreditDocument(selected.id, doc.id, doc.original_name || doc.stored_name)} className="w-8 h-8 flex items-center justify-center text-outline hover:text-on-surface hover:bg-stone-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button onClick={() => void downloadAdminCreditDocument(selected.id, doc.id, doc.original_name || doc.stored_name)} className="w-8 h-8 flex items-center justify-center text-outline hover:text-on-surface hover:bg-stone-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-lg">download</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Decision Section */}
              <div className="pt-6 mt-auto border-t border-stone-200 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-[0.15em] text-outline block">Assigned Limit (GHS)</label>
                  <input 
                    type="number" 
                    min={0} 
                    placeholder="0.00"
                    value={assignedLimit} 
                    onChange={(e) => setAssignedLimit(e.target.value)} 
                    disabled={selected.status === 'approved' || selected.status === 'rejected' || saving}
                    className="w-full bg-white border border-stone-200 rounded-xl text-lg font-headline font-bold p-4 outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:bg-stone-50" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-[0.15em] text-outline block">Reviewer Notes</label>
                  <textarea 
                    placeholder="Add archival notes or assessment details..."
                    value={reviewNote} 
                    onChange={(e) => setReviewNote(e.target.value)} 
                    disabled={selected.status === 'approved' || selected.status === 'rejected' || saving}
                    className="w-full bg-white border border-stone-200 rounded-xl text-sm p-4 outline-none focus:border-primary transition-colors min-h-[100px] disabled:opacity-50 disabled:bg-stone-50"
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {(selected.status === 'approved' || selected.status === 'rejected') ? (
                    <div className="bg-stone-100 text-stone-500 font-extrabold uppercase tracking-widest py-4 rounded-xl text-[10px] text-center border border-stone-200">
                      Case Archived
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => void submitDecision('rejected')} disabled={saving} className="bg-stone-100 text-stone-900 font-extrabold uppercase tracking-widest py-4 rounded-xl text-[10px] hover:bg-stone-200 transition-colors disabled:opacity-50">
                        {saving ? 'Processing...' : 'Reject Application'}
                      </button>
                      <button onClick={() => void submitDecision('approved')} disabled={saving} className="bg-[#084c17] text-white font-extrabold uppercase tracking-widest py-4 rounded-xl text-[10px] hover:opacity-90 shadow-lg shadow-emerald-900/10 transition-all disabled:opacity-50">
                        {saving ? 'Processing...' : 'Approve Credit'}
                      </button>
                    </div>
                  )}
                </div>
                {actionMessage && <p className="text-[10px] font-bold text-outline text-center uppercase tracking-widest">{actionMessage}</p>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
