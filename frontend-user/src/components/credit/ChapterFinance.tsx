import React from 'react';
import { Wallet, Landmark, FileText, Smartphone, History, UserCheck, X } from 'lucide-react';

interface ChapterFinanceProps {
  data: {
    momo_number: string;
    momo_provider: string;
    alternative_income: number;
    has_loan_history: boolean;
    loan_referee_name: string;
    loan_referee_phone: string;
    savings: number;
  };
  updateData: (fields: Partial<ChapterFinanceProps['data']>) => void;
  onFileUpload: (file: File | null, type: string) => void;
  documents: { file: File; type: string }[];
}

export const ChapterFinance: React.FC<ChapterFinanceProps> = ({ data, updateData, onFileUpload, documents }) => {
  const providers = [
    { id: 'mtn', label: 'MTN Mobile Money', color: '#ffcc00' },
    { id: 'telecel', label: 'Telecel Cash', color: '#ff0000' },
    { id: 'at', label: 'AT Money', color: '#003399' }
  ];

  // Defensive search for files
  const momoFile = Array.isArray(documents) ? documents.find(d => d.type === 'momo_statement')?.file : null;
  const loanFile = Array.isArray(documents) ? documents.find(d => d.type === 'loan_evidence')?.file : null;

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', 
    textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', borderRadius: '10px',
    padding: '0.85rem 1.1rem', fontSize: '0.9rem', boxSizing: 'border-box', 
    backgroundColor: '#f1f1ee', color: '#1a1c1b', fontWeight: 600, outline: 'none'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', fontFamily: 'Newsreader, serif' }}>
          Financial Foundation
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Your digital transaction history is our strongest indicator of creditworthiness.
        </p>
      </div>

      {/* MoMo Provider */}
      <div>
        <label style={labelStyle}>PRIMARY MOBILE MONEY PROVIDER</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => updateData({ momo_provider: p.id })}
              style={{
                padding: '0.85rem',
                borderRadius: '12px',
                border: `2px solid ${data.momo_provider === p.id ? '#084c17' : '#e2e8f0'}`,
                backgroundColor: data.momo_provider === p.id ? '#f0fdf4' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.color }} />
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: data.momo_provider === p.id ? '#084c17' : '#4b5563' }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MoMo Details */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>MOMO NUMBER</label>
          <div style={{ position: 'relative' }}>
            <input 
              style={inputStyle} 
              value={data.momo_number}
              onChange={(e) => updateData({ momo_number: e.target.value })}
              placeholder="024 XXX XXXX"
            />
            <Smartphone size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>MOMO STATEMENT (PDF)</label>
          <div 
            onClick={() => !momoFile && document.getElementById('momo_file')?.click()}
            style={{ 
              backgroundColor: momoFile ? '#f0fdf4' : 'white', 
              border: `1px solid ${momoFile ? '#084c17' : '#e2e8f0'}`, 
              borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', 
              gap: '0.6rem', cursor: momoFile ? 'default' : 'pointer', height: '42px', boxSizing: 'border-box',
              justifyContent: 'space-between'
            }}
          >
            <input id="momo_file" type="file" hidden accept=".pdf" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'momo_statement')} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
              <FileText size={16} color="#084c17" />
              <span style={{ fontSize: '0.8rem', color: momoFile ? '#084c17' : '#4b5563', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {momoFile ? momoFile.name : 'Click to upload'}
              </span>
            </div>
            {momoFile && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onFileUpload(null, 'momo_statement'); }}
                style={{ background: 'none', border: 'none', padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} color="#084c17" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alternative Income */}
      <div>
        <label style={labelStyle}>OFF-SEASON / ALTERNATIVE INCOME (GHS/MO)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input 
            type="range" min="0" max="10000" step="500"
            value={data.alternative_income * 15}
            onChange={(e) => updateData({ alternative_income: Number(e.target.value) / 15 })}
            style={{ flex: 1, accentColor: '#084c17' }}
          />
          <div style={{ backgroundColor: '#084c17', color: 'white', padding: '0.6rem 1rem', borderRadius: '10px', fontWeight: 800, minWidth: '120px', textAlign: 'center', fontSize: '0.9rem' }}>
            GHS {(data.alternative_income * 15).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Loan History Toggle */}
      <div style={{ backgroundColor: '#fcfcf9', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#e2f5e8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#084c17' }}>
              <History size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1c1b', margin: 0 }}>Previous Loan History</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Agricultural loans in the past 2 years?</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => updateData({ has_loan_history: !data.has_loan_history })}
            style={{ 
              width: '48px', height: '24px', borderRadius: '12px', backgroundColor: data.has_loan_history ? '#084c17' : '#cbd5e1', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' 
            }}
          >
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: data.has_loan_history ? '27px' : '3px', transition: 'left 0.2s' }} />
          </button>
        </div>

        {data.has_loan_history && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', marginBottom: '0.25rem' }}>
              <UserCheck size={14} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Verification Details</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>REFEREE NAME</label>
                <input 
                  style={{ ...inputStyle, padding: '0.6rem 0.75rem' }}
                  value={data.loan_referee_name}
                  onChange={(e) => updateData({ loan_referee_name: e.target.value })}
                  placeholder="Officer Name"
                />
              </div>
              <div>
                <label style={labelStyle}>REFEREE PHONE</label>
                <input 
                  style={{ ...inputStyle, padding: '0.6rem 0.75rem' }}
                  value={data.loan_referee_phone}
                  onChange={(e) => updateData({ loan_referee_phone: e.target.value })}
                  placeholder="+233..."
                />
              </div>
            </div>
            
            <div 
              onClick={() => !loanFile && document.getElementById('loan_doc')?.click()}
              style={{ 
                border: `2px dashed ${loanFile ? '#084c17' : '#e2e8f0'}`, 
                borderRadius: '10px', padding: '1.25rem', textAlign: 'center', 
                cursor: loanFile ? 'default' : 'pointer', 
                backgroundColor: loanFile ? '#f0fdf4' : '#f8fafc',
                position: 'relative'
              }}
            >
              <input id="loan_doc" type="file" hidden accept=".pdf" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'loan_evidence')} />
              {loanFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      <FileText size={18} color="#084c17" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#084c17' }}>{loanFile?.name || 'Evidence Uploaded'}</span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onFileUpload(null, 'loan_evidence'); }}
                        style={{ background: '#084c17', border: 'none', padding: '0.25rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.4rem' }}
                      >
                        <X size={12} color="white" />
                      </button>
                   </div>
                   <div style={{ fontSize: '0.65rem', color: '#084c17', fontWeight: 600 }}>File attached</div>
                </div>
              ) : (
                <>
                  <FileText size={18} color="#94a3b8" style={{ marginBottom: '0.4rem' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563' }}>Upload Clearance Certificate (PDF)</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Proof is critical for your score</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
