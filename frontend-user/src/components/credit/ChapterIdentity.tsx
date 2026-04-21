import React from 'react';
import { Camera, ShieldCheck, User, X } from 'lucide-react';
import { AestheticDatePicker } from './AestheticDatePicker';

interface ChapterIdentityProps {
  data: {
    gender: string;
    national_id: string;
    digital_score: number;
    full_name?: string;
    dob?: string;
  };
  updateData: (fields: Partial<ChapterIdentityProps['data']>) => void;
  onFileUpload: (file: File | null, type: string) => void;
  documents: { file: File; type: string }[];
}

export const ChapterIdentity: React.FC<ChapterIdentityProps> = ({ data, updateData, onFileUpload, documents }) => {
  const genderOptions = [
    { id: 'female', label: 'Female', icon: 'woman' },
    { id: 'male', label: 'Male', icon: 'man' },
    { id: 'other', label: 'Other', icon: 'person' }
  ];

  // Defensive search for the file
  const nationalIdFile = Array.isArray(documents) ? documents.find(d => d.type === 'national_id')?.file : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileUpload(e.target.files[0], 'national_id');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', borderRadius: '10px',
    padding: '0.85rem 1.1rem', fontSize: '0.9rem', boxSizing: 'border-box', 
    backgroundColor: '#f1f1ee', color: '#1a1c1b', fontWeight: 600, outline: 'none'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', 
    textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', fontFamily: 'Newsreader, serif' }}>
          Who are you?
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          We use this to verify your identity and ensure inclusivity in our lending.
        </p>
      </div>

      {/* Name & DOB */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>FULL NAME</label>
          <div style={{ position: 'relative' }}>
            <input 
              style={inputStyle} 
              value={data.full_name || ''}
              onChange={(e) => updateData({ full_name: e.target.value })}
              placeholder="e.g. Samuel Okoro"
            />
            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <User size={16} />
            </div>
          </div>
        </div>
        <AestheticDatePicker 
          label="DATE OF BIRTH"
          value={data.dob || ''}
          onChange={(val) => updateData({ dob: val })}
        />
      </div>

      {/* National ID Row */}
      <div>
        <label style={labelStyle}>NATIONAL ID VERIFICATION</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              style={{ ...inputStyle, height: '100%' }} 
              value={data.national_id}
              onChange={(e) => updateData({ national_id: e.target.value })}
              placeholder="Enter ID Number (GH-XXXXXXXXX-X)"
            />
            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          
          <div 
            style={{ 
              width: '160px', border: nationalIdFile ? '1px solid #084c17' : '2px dashed #e2e8f0', 
              borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', 
              justifyContent: 'center', cursor: 'pointer', 
              backgroundColor: nationalIdFile ? '#f0fdf4' : '#f8fafc', 
              overflow: 'hidden', position: 'relative', minHeight: '50px' 
            }}
          >
            {nationalIdFile ? (
              <div style={{ padding: '0.4rem 0.6rem', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <ShieldCheck size={14} color="#084c17" />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#084c17', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nationalIdFile?.name || 'Uploaded'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onFileUpload(null, 'national_id'); }}
                  style={{ background: 'none', border: 'none', padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={12} color="#084c17" />
                </button>
              </div>
            ) : (
              <>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Camera size={18} color="#084c17" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#084c17' }}>Upload ID</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gender Selection */}
      <div>
        <label style={labelStyle}>GENDER IDENTITY</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {genderOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateData({ gender: opt.id })}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: `2px solid ${data.gender === opt.id ? '#084c17' : '#e2e8f0'}`,
                backgroundColor: data.gender === opt.id ? '#f0fdf4' : 'white',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ color: data.gender === opt.id ? '#084c17' : '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{opt.icon}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: data.gender === opt.id ? '#084c17' : '#4b5563' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Digital Presence Quiz */}
      <div style={{ backgroundColor: '#fcfcf9', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.75rem 0' }}>Digital Experience</h3>
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          How comfortable are you with using smartphone apps for business?
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { score: 25, label: "I'm still learning" },
            { score: 50, label: "I use them sometimes" },
            { score: 80, label: "I use apps every day" },
            { score: 100, label: "I'm a power user" }
          ].map((level) => (
            <button
              key={level.score}
              type="button"
              onClick={() => updateData({ digital_score: level.score })}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                textAlign: 'left',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: data.digital_score === level.score ? '#084c17' : '#e2e8f0',
                backgroundColor: data.digital_score === level.score ? '#f0fdf4' : 'white',
                color: data.digital_score === level.score ? '#084c17' : '#4b5563',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.1s'
              }}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
