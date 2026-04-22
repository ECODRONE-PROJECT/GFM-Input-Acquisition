import React from 'react';
import { Waves, Tractor, Beef, TrendingUp, HelpCircle, Activity } from 'lucide-react';

interface ChapterInfrastructureProps {
  data: {
    has_irrigation: string;
    irrigation_scheme: boolean;
    has_motorbike: boolean;
    livestock_value: number;
    yield_precise: boolean;
    yield_data: string;
    yield_unit: string;
  };
  updateData: (fields: Partial<ChapterInfrastructureProps['data']>) => void;
}

export const ChapterInfrastructure: React.FC<ChapterInfrastructureProps> = ({ data, updateData }) => {
  const yieldUnits = ['Bags', 'Kgs', 'Sacks', 'Tonnes'];
  const irrigationTypes = [
    { id: 'none', label: 'Rain-fed only' },
    { id: 'canal', label: 'Canal/Gravity' },
    { id: 'drip', label: 'Drip/Sprinkler' },
    { id: 'pump', label: 'River/Borehole Pump' }
  ];

  const handleYieldValueChange = (index: number, val: string) => {
    const values = data.yield_data.split(',').map(v => v.trim());
    while (values.length < 3) values.push('0');
    values[index] = val || '0';
    updateData({ yield_data: values.join(', ') });
  };

  const getYieldValue = (index: number) => {
    const values = data.yield_data.split(',').map(v => v.trim());
    return values[index] || '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', fontFamily: 'Newsreader, serif' }}>
          Productivity & Assets
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
          Your history of harvests and available equipment determine your capacity to scale.
        </p>
      </div>

      {/* Yield History Mode Toggle */}
      <div style={{ backgroundColor: '#fcfcf9', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#e2f5e8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#084c17' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a1c1b', margin: 0 }}>Seasonal Harvest Performance</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Reporting precise yields increases your score weight.</p>
            </div>
          </div>
          <div style={{ display: 'flex', backgroundColor: '#e8e8e5', padding: '4px', borderRadius: '12px' }}>
            <button 
              onClick={() => updateData({ yield_precise: false })}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: !data.yield_precise ? 'white' : 'transparent', color: !data.yield_precise ? '#084c17' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: !data.yield_precise ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            >
              Estimated
            </button>
            <button 
              onClick={() => updateData({ yield_precise: true })}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: data.yield_precise ? 'white' : 'transparent', color: data.yield_precise ? '#084c17' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: data.yield_precise ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            >
              Precise
            </button>
          </div>
        </div>

        {!data.yield_precise ? (
          /* Estimated Mode */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { id: '100', label: 'Above Average' },
              { id: '70', label: 'Good' },
              { id: '50', label: 'Average' },
              { id: '30', label: 'Poor' }
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => updateData({ yield_data: `${lvl.id}, ${lvl.id}, ${lvl.id}` })}
                style={{
                  padding: '1.25rem', borderRadius: '16px', border: `2px solid ${data.yield_data.startsWith(lvl.id) ? '#084c17' : '#e2e8f0'}`,
                  backgroundColor: data.yield_data.startsWith(lvl.id) ? '#f0fdf4' : 'white',
                  cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: data.yield_data.startsWith(lvl.id) ? '#084c17' : '#64748b', fontSize: '0.9rem'
                }}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        ) : (
          /* Precise Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[0, 1, 2].map(i => (
                <div key={i}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c9196', marginBottom: '0.5rem', display: 'block' }}>
                    {i === 0 ? 'LATEST SEASON' : (i === 1 ? 'PREVIOUS' : '2 SEASONS AGO')}
                  </label>
                  <input 
                    type="number"
                    style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '1rem', backgroundColor: 'white', color: '#1a1c1b', fontWeight: 800, fontSize: '1.1rem', boxShadow: 'inset 0 0 0 1px #e2e8f0' }}
                    value={getYieldValue(i)}
                    onChange={(e) => handleYieldValueChange(i, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c9196', marginBottom: '0.75rem', display: 'block' }}>YIELD UNIT</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {yieldUnits.map(unit => (
                  <button
                    key={unit}
                    onClick={() => updateData({ yield_unit: unit })}
                    style={{ 
                      flex: 1, padding: '0.75rem', borderRadius: '10px', border: `1px solid ${data.yield_unit === unit ? '#084c17' : '#e2e8f0'}`,
                      backgroundColor: data.yield_unit === unit ? '#e2f5e8' : 'white',
                      color: data.yield_unit === unit ? '#084c17' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                    }}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Irrigation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'block' }}>
            IRRIGATION INFRASTRUCTURE
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {irrigationTypes.map(opt => (
              <button
                key={opt.id}
                onClick={() => updateData({ has_irrigation: opt.id })}
                style={{
                  padding: '1.25rem', borderRadius: '16px', border: `2px solid ${data.has_irrigation === opt.id ? '#084c17' : '#e2e8f0'}`,
                  backgroundColor: data.has_irrigation === opt.id ? '#f0fdf4' : 'white',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem'
                }}
              >
                <div style={{ width: '40px', height: '40px', backgroundColor: data.has_irrigation === opt.id ? '#e2f5e8' : '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#084c17' }}>
                  <Waves size={20} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: data.has_irrigation === opt.id ? '#084c17' : '#4b5563' }}>{opt.label}</span>
              </button>
            ))}
          </div>
          
          {data.has_irrigation !== 'none' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', cursor: 'pointer', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <input type="checkbox" checked={data.irrigation_scheme} onChange={(e) => updateData({ irrigation_scheme: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', accentColor: '#084c17' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Associated with official scheme (GIDA, etc.)</span>
            </label>
          )}
        </div>

        {/* Assets */}
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'block' }}>
            CAPITAL ASSETS
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Tractor size={20} color="#64748b" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1c1b' }}>Motorbike</span>
              </div>
              <button 
                onClick={() => updateData({ has_motorbike: !data.has_motorbike })}
                style={{ width: '50px', height: '28px', borderRadius: '14px', backgroundColor: data.has_motorbike ? '#084c17' : '#cbd5e1', position: 'relative', border: 'none', cursor: 'pointer' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '4px', left: data.has_motorbike ? '26px' : '4px', transition: 'left 0.2s' }} />
              </button>
            </div>

            <div style={{ display: 'flex', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Beef size={20} color="#64748b" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1c1b' }}>Livestock</span>
              </div>
              <button 
                onClick={() => updateData({ livestock_value: data.livestock_value > 0 ? 0 : 5000 })}
                style={{ width: '50px', height: '28px', borderRadius: '14px', backgroundColor: data.livestock_value > 0 ? '#084c17' : '#cbd5e1', position: 'relative', border: 'none', cursor: 'pointer' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '4px', left: data.livestock_value > 0 ? '26px' : '4px', transition: 'left 0.2s' }} />
              </button>
            </div>
            
            {data.livestock_value > 0 && (
              <div style={{ padding: '1.25rem', backgroundColor: '#fcfcf9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4b5563', marginBottom: '0.75rem', display: 'block' }}>EST. LIVESTOCK VALUE (GHS)</label>
                <input 
                  type="number" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.25rem', fontWeight: 800, color: '#084c17', outline: 'none' }}
                  value={data.livestock_value}
                  onChange={(e) => updateData({ livestock_value: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
