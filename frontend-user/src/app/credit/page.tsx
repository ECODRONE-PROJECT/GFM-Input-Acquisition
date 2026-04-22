import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  fetchCreditApplicationDetails,
  fetchCreditApplicationStatus,
  submitCreditApplication,
  uploadCreditApplicationDocument,
  type CreditApplicationDetailsResponse,
  type CreditApplicationStatusResponse,
  type CreditApplicationPayload,
} from '@/lib/clientData';
import { requireSupabase } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { ShoppingCart, User, Check, X, ArrowLeft, ChevronRight, ChevronLeft, ShieldCheck, TrendingUp, History, Clock, Copy } from 'lucide-react';

// Import Chapter Components
import { ChapterIdentity } from '@/components/credit/ChapterIdentity';
import { ChapterFinance } from '@/components/credit/ChapterFinance';
import { ChapterFarm } from '@/components/credit/ChapterFarm';
import { ChapterInfrastructure } from '@/components/credit/ChapterInfrastructure';
import { ChapterSocial } from '@/components/credit/ChapterSocial';
import { ChapterSummary } from '@/components/credit/ChapterSummary';

const GHS_PER_USD = 15;

const initialPayload: CreditApplicationPayload = {
  userId: '',
  consent_credit_assessment: false,
  drought_flood_index: 35,
  gender: 'female',
  savings: 0,
  payment_frequency: 0,
  crop_types: 'Maize',
  is_association_member: false,
  has_motorbike: false,
  national_id: '',
  acres: 0,
  satellite_verified: false,
  repayment_rate: 60,
  yield_data: '0, 0, 0',
  yield_precise: false,
  yield_unit: 'Bags',
  endorsements: 0,
  has_irrigation: 'none',
  irrigation_scheme: false,
  market_access_index: 55,
  training_sessions: 0,
  livestock_value: 0,
  alternative_income: 0,
  has_insurance: 'none',
  insurance_subscription: false,
  digital_score: 50,
  soil_health_index: 55,
  soil_health_observation: 'average',
  has_loan_history: false,
  loan_referee_name: '',
  loan_referee_phone: '',
  referee_1_name: '',
  referee_1_phone: '',
  referee_2_name: '',
  referee_2_phone: '',
  region: '',
  district: '',
  town: '',
  momo_number: '',
  momo_provider: '',
  full_name: '',
  dob: ''
};

export default function CreditPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Farmer';
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [payload, setPayload] = useState<CreditApplicationPayload>(initialPayload);
  const [statusData, setStatusData] = useState<CreditApplicationStatusResponse | null>(null);
  const [details, setDetails] = useState<CreditApplicationDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [documentQueue, setDocumentQueue] = useState<{file: File, type: string}[]>([]);
  const [viewingApplication, setViewingApplication] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const nextStatus = await fetchCreditApplicationStatus(userId);
        setStatusData(nextStatus);
        if (nextStatus.application.id) {
          const nextDetails = await fetchCreditApplicationDetails(userId, nextStatus.application.id);
          setDetails(nextDetails);
        }
      } catch (error) {
        setSubmitError('Failed to load status.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  // Pre-fill name from auth metadata
  useEffect(() => {
    if (user?.user_metadata?.name && !payload.full_name) {
      setPayload(prev => ({
        ...prev,
        full_name: user.user_metadata.name
      }));
    }
  }, [user]);

  const updatePayload = (fields: Partial<CreditApplicationPayload>) => {
    setPayload(p => ({ ...p, ...fields }));
  };

  const handleFileUpload = (file: File | null, type: string) => {
    if (file === null) {
      setDocumentQueue(prev => prev.filter(item => item.type !== type));
    } else {
      setDocumentQueue(prev => [...prev.filter(item => item.type !== type), { file, type }]);
    }
  };

  const handleLogout = async () => {
    const client = requireSupabase();
    await client.auth.signOut();
    navigate('/login');
  };

  const onSubmit = async () => {
    if (!userId) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await submitCreditApplication({
        ...payload,
        userId,
        consent_credit_assessment: true,
        acres: Number(payload.acres) || 0,
        endorsements: (payload.referee_1_name ? 1 : 0) + (payload.referee_2_name ? 1 : 0)
      });

      // Upload queued documents
      for (const item of documentQueue) {
        await uploadCreditApplicationDocument({
          userId,
          applicationId: response.application_id,
          documentType: item.type,
          file: item.file
        });
      }

      setSubmitMessage('Application submitted successfully!');
      const nextStatus = await fetchCreditApplicationStatus(userId);
      setStatusData(nextStatus);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const chapters = [
    { id: 1, title: 'Identity', subtitle: 'Verification' },
    { id: 2, title: 'Financials', subtitle: 'Mobile Money' },
    { id: 3, title: 'Land/Soil', subtitle: 'Environment' },
    { id: 4, title: 'Productivity', subtitle: 'Yield History' },
    { id: 5, title: 'Social Capital', subtitle: 'Endorsements' },
    { id: 6, title: 'Review', subtitle: 'One-Shot' }
  ];

  const validateStep = (s: number): { valid: boolean; error?: string } => {
    if (s === 1) {
      if (!payload.full_name) return { valid: false, error: 'Please enter your full name.' };
      if (!payload.dob) return { valid: false, error: 'Please enter your date of birth.' };
      if (!payload.national_id) return { valid: false, error: 'Please enter your National ID number.' };
      const hasIdDoc = documentQueue.some(d => d.type === 'national_id');
      if (!hasIdDoc) return { valid: false, error: 'Please upload a photo of your National ID.' };
    }

    if (s === 2) {
      if (!payload.momo_number) return { valid: false, error: 'Please enter your Mobile Money number.' };
      if (!payload.momo_provider) return { valid: false, error: 'Please select your MoMo provider.' };
      const hasStatement = documentQueue.some(d => d.type === 'momo_statement');
      if (!hasStatement) return { valid: false, error: 'Please upload your MoMo statement (last 6 months).' };
    }

    if (s === 3) {
      if (!payload.region) return { valid: false, error: 'Please select your region.' };
      if (!payload.district) return { valid: false, error: 'Please enter your district.' };
      if (!payload.town) return { valid: false, error: 'Please enter your town.' };
      if (Number(payload.acres) <= 0) return { valid: false, error: 'Please enter a valid farm size (acres).' };
    }

    return { valid: true };
  };

  const handleNextStep = () => {
    setSubmitError('');
    const validation = validateStep(step);
    if (!validation.valid) {
      setSubmitError(validation.error || 'Please fill in all mandatory fields.');
      return;
    }
    setStep(s => Math.min(6, s + 1));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f6' }}>
        <div style={{ animation: 'pulse 2s infinite', fontSize: '1.2rem', fontWeight: 800, color: '#084c17', fontFamily: 'Newsreader, serif' }}>
          Loading your agronomy form...
        </div>
      </div>
    );
  }

  const hasSubmitted = statusData?.has_application || statusData?.application?.id;

  if (hasSubmitted) {
    const referenceNumber = `AGR-2026-${statusData?.application?.id?.slice(0, 4)}-${statusData?.application?.id?.slice(-2)}`.toUpperCase();

    return (
      <div style={{ backgroundColor: '#f9f9f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: 'white', maxWidth: '1000px', width: '100%', borderRadius: '40px', boxShadow: '0 30px 60px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex' }}>
          
          {/* Left Visual */}
          <div style={{ width: '28%', position: 'relative', minHeight: '600px' }}>
            <img 
              src="/images/success_sprout.png" 
              alt="Success" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,76,23,0.1), rgba(0,0,0,0.4))' }} />
          </div>

          {/* Right Content Area */}
          <div style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#e2f5e8', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#084c17', marginBottom: '2rem' }}>
              <Check size={32} strokeWidth={3} />
            </div>

            <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 1rem 0', fontFamily: 'Newsreader, serif', lineHeight: 1.1 }}>
              Submission Successful
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.2rem', margin: '0 0 3rem 0', lineHeight: 1.5 }}>
              Your agronomy credit application has been received and added to our review queue.
            </p>

            <div style={{ backgroundColor: '#fcfcf9', borderRadius: '24px', padding: '2.5rem', border: '1px solid #e2e8f0', marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>REFERENCE NUMBER</label>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#084c17', margin: 0, fontFamily: 'monospace' }}>{referenceNumber}</p>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(referenceNumber)}
                  style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer', color: '#64748b' }}
                >
                  <Copy size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ color: '#084c17', marginTop: '0.2rem' }}><Clock size={20} /></div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 800, color: '#1a1c1b', fontSize: '1rem' }}>Next Steps</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Our underwriting team will review your documents within 48 hours. Current Status: <strong style={{color: '#084c17'}}>{statusData?.application?.status === 'under_review' ? 'SUBMITTED' : (statusData?.application?.status?.toUpperCase() || 'SUBMITTED')}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <button 
                onClick={() => navigate('/orders')}
                style={{ flex: 1, backgroundColor: '#084c17', color: 'white', border: 'none', borderRadius: '16px', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                Return to Dashboard <ChevronRight size={20} />
              </button>
              <button 
                onClick={() => setViewingApplication(true)}
                style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer' }}
              >
                View Details
              </button>
            </div>

            <p style={{ marginTop: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Need help? Contact support at <a href="mailto:support@gfm.ia" style={{ color: '#084c17', fontWeight: 700, textDecoration: 'none' }}>support@gfm.ia</a>
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9f9f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: '4rem' }}>
      
      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 5%', backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <Logo />
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <Link to="/shop" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Catalog</Link>
          <Link to="/credit" style={{ textDecoration: 'none', color: '#084c17', fontWeight: 700, fontSize: '0.9rem', borderBottom: '2px solid #084c17', paddingBottom: '0.25rem' }}>Credit App</Link>
          <Link to="/orders" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Orders</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '20%', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1c1b' }}>{displayName}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Farmer</span>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#e8e8e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
            <User size={20} />
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1440px', margin: '4rem auto', padding: '0 5%', display: 'flex', gap: '5rem', alignItems: 'flex-start' }}>
        
        {/* Left Progress Sidebar */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '120px' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: '#084c17', margin: '0 0 3rem 0', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'Newsreader, serif' }}>
            Seasonal<br/>Credit.
          </h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {chapters.map((ch) => (
              <div 
                key={ch.id} 
                onClick={() => ch.id < step && setStep(ch.id)}
                style={{ 
                  display: 'flex', gap: '1rem', alignItems: 'center', 
                  opacity: step === ch.id ? 1 : 0.4, 
                  cursor: ch.id < step ? 'pointer' : 'default',
                  transition: 'opacity 0.2s'
                }}
              >
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', 
                  backgroundColor: step === ch.id ? '#084c17' : (step > ch.id ? '#e2f5e8' : '#e2e8f0'), 
                  color: step === ch.id ? 'white' : (step > ch.id ? '#084c17' : '#94a3b8'), 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' 
                }}>
                  {step > ch.id ? <Check size={18} strokeWidth={3} /> : ch.id}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: step === ch.id ? '#1a1c1b' : '#64748b' }}>{ch.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{ch.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '4rem', padding: '2rem', backgroundColor: '#fcfcf9', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#084c17', marginBottom: '1rem' }}>
              <ShieldCheck size={20} />
              <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>Agronomy ML</span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6 }}>
              Our model uses 20+ data points including MoMo statements and satellite yield trends to issue instant limits.
            </p>
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '40px', padding: '3.5rem', boxShadow: '0 4px 30px rgba(0,0,0,0.03)', position: 'relative', minHeight: '600px', zIndex: 10 }}>
          
          <div style={{ marginBottom: '4rem' }}>
             {step === 1 && <ChapterIdentity data={payload as any} updateData={updatePayload as any} onFileUpload={handleFileUpload} documents={documentQueue} />}
             {step === 2 && <ChapterFinance data={payload as any} updateData={updatePayload as any} onFileUpload={handleFileUpload} documents={documentQueue} />}
             {step === 3 && <ChapterFarm data={payload as any} updateData={updatePayload as any} />}
             {step === 4 && <ChapterInfrastructure data={payload as any} updateData={updatePayload as any} />}
             {step === 5 && <ChapterSocial data={payload as any} updateData={updatePayload as any} />}
             {step === 6 && (
               <ChapterSummary 
                 data={payload} 
                 updateData={updatePayload} 
                 setStep={setStep} 
                 isSubmitting={submitting} 
                 onSubmit={onSubmit} 
                 status={statusData?.application?.status}
               />
             )}
          </div>

          {step < 6 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '3rem' }}>
              <button 
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', color: '#1a1c1b', 
                  padding: '1rem 2rem', borderRadius: '12px', fontWeight: 700, cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.5 : 1 
                }}
              >
                <ChevronLeft size={20} /> Back
              </button>
              
              <button 
                onClick={handleNextStep}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#084c17', color: 'white', 
                  padding: '1rem 2.5rem', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(8,76,23,0.15)'
                }}
              >
                Continue <ChevronRight size={20} />
              </button>
            </div>
          )}

          {submitError && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', fontWeight: 700, textAlign: 'center' }}>
              {submitError}
            </div>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Inter:wght@400;500;600;700;800&display=swap');
        
        body { margin: 0; background-color: #f9f9f6; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; borderRadius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />

      {viewingApplication && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,28,27,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ backgroundColor: 'white', maxWidth: '800px', width: '100%', maxHeight: '85vh', borderRadius: '40px', boxShadow: '0 40px 100px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '2rem 3rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdfdfc' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1a1c1b', fontFamily: 'Newsreader, serif' }}>Recorded Application Details</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Reference: {statusData?.application?.id?.toUpperCase() || 'NEW'}</p>
              </div>
              <button onClick={() => setViewingApplication(false)} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '0.6rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '3rem' }}>
              <ChapterSummary 
                data={payload} 
                updateData={updatePayload} 
                setStep={setStep} 
                isSubmitting={false} 
                onSubmit={() => {}} 
                status={statusData?.application?.status}
              />
            </div>
            <div style={{ padding: '1.5rem 3rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#fdfdfc' }}>
              <button 
                onClick={() => setViewingApplication(false)}
                style={{ backgroundColor: '#084c17', color: 'white', border: 'none', borderRadius: '12px', padding: '0.8rem 2rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
