import React from 'react';
import { UserPlus, Users, ShieldCheck, Phone, School, MapPin } from 'lucide-react';

interface ChapterSocialProps {
  data: {
    is_association_member: boolean;
    training_sessions: number;
    market_access_index: number;
    has_insurance: string;
    insurance_subscription: boolean;
    referee_1_name: string;
    referee_1_phone: string;
    referee_2_name: string;
    referee_2_phone: string;
  };
  updateData: (fields: Partial<ChapterSocialProps['data']>) => void;
}

export const ChapterSocial: React.FC<ChapterSocialProps> = ({ data, updateData }) => {
  const insuranceOptions = [
    { id: 'none', label: 'No insurance' },
    { id: 'crop', label: 'Crop only' },
    { id: 'livestock', label: 'Livestock only' },
    { id: 'both', label: 'Both' }
  ];

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
          Social Capital & Resilience
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Your social network and risk management profile are key predictors of stability.
        </p>
      </div>

      {/* Peer Referees */}
      <div>
        <label style={labelStyle}>PEER ENDORSEMENTS (2 REQUIRED)</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[1, 2].map(num => (
            <div key={num} style={{ backgroundColor: '#fcfcf9', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: '#084c17' }}>
                <UserPlus size={14} />
                <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Referee 0{num}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input 
                  style={{ ...inputStyle, backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '0.6rem 0.75rem' }}
                  value={num === 1 ? data.referee_1_name : data.referee_2_name}
                  onChange={(e) => updateData(num === 1 ? { referee_1_name: e.target.value } : { referee_2_name: e.target.value })}
                  placeholder="Full Name"
                />
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{ ...inputStyle, backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '0.6rem 0.75rem 0.6rem 2.2rem' }}
                    value={num === 1 ? data.referee_1_phone : data.referee_2_phone}
                    onChange={(e) => updateData(num === 1 ? { referee_1_phone: e.target.value } : { referee_2_phone: e.target.value })}
                    placeholder="+233..."
                  />
                  <Phone size={12} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Association & Training */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>ASSOCIATION MEMBER</label>
            <div 
              onClick={() => updateData({ is_association_member: !data.is_association_member })}
              style={{ 
                padding: '0.85rem 1rem', borderRadius: '12px', border: `2px solid ${data.is_association_member ? '#084c17' : '#e2e8f0'}`, 
                backgroundColor: data.is_association_member ? '#f0fdf4' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' 
              }}
            >
              <div style={{ width: '32px', height: '32px', backgroundColor: data.is_association_member ? '#e2f5e8' : '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#084c17' }}>
                <Users size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Yes, I am a member</span>
            </div>
          </div>
          
          <div>
            <label style={labelStyle}>AGRI-TRAINING (SESSIONS/YR)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number"
                min="0"
                max="52"
                style={inputStyle}
                value={data.training_sessions || ''}
                onChange={(e) => updateData({ training_sessions: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <School size={16} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>MARKET PROXIMITY</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { id: 90, label: 'Very Close (< 5km)' },
              { id: 60, label: 'Moderate (5-15km)' },
              { id: 30, label: 'Remote (> 15km)' }
            ].map((mkt) => (
              <button
                key={mkt.id}
                type="button"
                onClick={() => updateData({ market_access_index: mkt.id })}
                style={{ 
                  width: '100%', padding: '0.75rem 1rem', textAlign: 'left', borderRadius: '10px', border: `1px solid ${data.market_access_index === mkt.id ? '#084c17' : '#e2e8f0'}`,
                  backgroundColor: data.market_access_index === mkt.id ? '#f0fdf4' : 'white',
                  color: data.market_access_index === mkt.id ? '#084c17' : '#4b5563', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem'
                }}
              >
                <MapPin size={14} />
                {mkt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Insurance */}
      <div style={{ backgroundColor: '#fcfcf9', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
        <label style={labelStyle}>RISK MITIGATION (INSURANCE)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {insuranceOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateData({ has_insurance: opt.id })}
              style={{
                padding: '0.75rem', borderRadius: '10px', border: `2px solid ${data.has_insurance === opt.id ? '#084c17' : '#e2e8f0'}`,
                backgroundColor: data.has_insurance === opt.id ? '#f0fdf4' : 'white',
                color: data.has_insurance === opt.id ? '#084c17' : '#4b5563',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        {data.has_insurance !== 'none' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <input type="checkbox" checked={data.insurance_subscription} onChange={(e) => updateData({ insurance_subscription: e.target.checked })} style={{ width: '1.1rem', height: '1.1rem', accentColor: '#084c17' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={18} color="#166534" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Active subscription for current season.</span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
};
