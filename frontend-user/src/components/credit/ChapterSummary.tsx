import React from 'react';
import { Check, Edit3, MapPin, Smartphone, Trees, TrendingUp, Users, ShieldCheck } from 'lucide-react';

interface ChapterSummaryProps {
  data: any; 
  updateData: (fields: any) => void;
  setStep: (step: number) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  status?: string | null;
}

export const ChapterSummary: React.FC<ChapterSummaryProps> = ({ data, updateData, setStep, isSubmitting, onSubmit, status }) => {
  const isApproved = status === 'approved';

  const SectionHeader = ({ title, step, icon: Icon }: { title: string, step: number, icon: any }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ color: '#084c17' }}><Icon size={20} /></div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a1c1b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</h3>
      </div>
      {!isApproved && (
        <button onClick={() => setStep(step)} style={{ border: 'none', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Edit3 size={14} /> Edit
        </button>
      )}
    </div>
  );

  const DataRow = ({ label, value }: { label: string, value: any }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px dashed #f1f5f9' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1c1b' }}>{String(value || 'Not provided')}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', backgroundColor: '#e2f5e8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#084c17', margin: '0 auto 1.5rem' }}>
          <Check size={24} />
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', fontFamily: 'Newsreader, serif' }}>
          Ready for Submission
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
          Please review your agronomy profile below. Accurate data leads to faster approvals and higher limits.
        </p>
      </div>

      <div style={{ backgroundColor: '#fcfcf9', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '2rem' }}>
          
          {/* Identity */}
          <SectionHeader title="Identity & ID" step={1} icon={Smartphone} />
          <div style={{ padding: '0.5rem 0 1.5rem' }}>
            <DataRow label="Full Name" value={data.full_name} />
            <DataRow label="Date of Birth" value={data.dob} />
            <DataRow label="Gender" value={data.gender} />
            <DataRow label="National ID" value={data.national_id} />
            <DataRow label="Digital Score" value={`${data.digital_score}%`} />
          </div>

          {/* Finance */}
          <SectionHeader title="Financial Profile" step={2} icon={Smartphone} />
          <div style={{ padding: '0.5rem 0 1.5rem' }}>
            <DataRow label="MoMo Provider" value={data.momo_provider.toUpperCase()} />
            <DataRow label="MoMo Number" value={data.momo_number} />
            <DataRow label="Off-season Income" value={`GHS ${Math.round(data.alternative_income * 15).toLocaleString()}`} />
            <DataRow label="Loan History" value={data.has_loan_history ? 'Yes' : 'No'} />
            {data.has_loan_history && <DataRow label="Loan Referee" value={data.loan_referee_name} />}
          </div>

          {/* Farm */}
          <SectionHeader title="Farm & Environment" step={3} icon={MapPin} />
          <div style={{ padding: '0.5rem 0 1.5rem' }}>
            <DataRow label="Location" value={`${data.town}, ${data.district}, ${data.region}`} />
            <DataRow label="Farm Size" value={`${data.acres} Acres`} />
            <DataRow label="Soil Type" value={data.soil_health_observation} />
            <DataRow label="Crops" value={data.crop_types} />
          </div>

          {/* Productivity */}
          <SectionHeader title="Productivity & Assets" step={4} icon={Trees} />
          <div style={{ padding: '0.5rem 0 1.5rem' }}>
            <DataRow label="Yield History" value={data.yield_precise ? `Precise (${data.yield_unit})` : 'Estimated'} />
            <DataRow label="Recent Yields" value={data.yield_data} />
            <DataRow label="Irrigation" value={data.has_irrigation} />
            <DataRow label="Motorbike" value={data.has_motorbike ? 'Yes' : 'No'} />
            <DataRow label="Livestock" value={data.livestock_value > 0 ? `Yes (GHS ${data.livestock_value})` : 'No'} />
          </div>

          {/* Social */}
          <SectionHeader title="Social Capital" step={5} icon={Users} />
          <div style={{ padding: '0.5rem 0 1.5rem' }}>
            <DataRow label="Referee 1" value={`${data.referee_1_name} (${data.referee_1_phone})`} />
            <DataRow label="Referee 2" value={`${data.referee_2_name} (${data.referee_2_phone})`} />
            <DataRow label="Association" value={data.is_association_member ? 'Member' : 'No'} />
            <DataRow label="Insurance" value={data.has_insurance !== 'none' ? `${data.has_insurance} (${data.insurance_subscription ? 'Subscribed' : 'Not Subscribed'})` : 'None'} />
          </div>

        </div>
      </div>

      {!isApproved && (
        <>
          <div 
            onClick={() => updateData({ consent_credit_assessment: !data.consent_credit_assessment })}
            style={{ 
              backgroundColor: data.consent_credit_assessment ? '#f0fdf4' : '#fcfcf9', 
              padding: '2rem', borderRadius: '24px', border: `2px solid ${data.consent_credit_assessment ? '#084c17' : '#e2e8f0'}`, 
              display: 'flex', gap: '1.5rem', alignItems: 'flex-start', cursor: 'pointer', transition: 'all 0.3s'
            }}
          >
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '8px', 
              border: `2px solid ${data.consent_credit_assessment ? '#084c17' : '#cbd5e1'}`,
              backgroundColor: data.consent_credit_assessment ? '#084c17' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0, marginTop: '0.2rem'
            }}>
              {data.consent_credit_assessment && <Check size={16} color="white" strokeWidth={4} />}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 800, color: '#1a1c1b', fontSize: '1.15rem', fontFamily: 'Newsreader, serif' }}>Consent & Declaration</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                I confirm that all provided information is true and consent to the use of my data for this credit assessment.
              </p>
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitting || !data.consent_credit_assessment}
            style={{
              width: '100%',
              padding: '1.25rem',
              backgroundColor: '#084c17',
              color: 'white',
              borderRadius: '16px',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: 800,
              cursor: (isSubmitting || !data.consent_credit_assessment) ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 25px -5px rgba(8, 76, 23, 0.3)',
              opacity: (isSubmitting || !data.consent_credit_assessment) ? 0.7 : 1,
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
            {!isSubmitting && <TrendingUp size={20} />}
          </button>
        </>
      )}
    </div>
  );
};
