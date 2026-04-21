import React, { useState } from 'react';
import { MapPin, Trees, Waves, Shovel, Check, X, Search } from 'lucide-react';

interface ChapterFarmProps {
  data: {
    region: string;
    district: string;
    town: string;
    acres: string;
    soil_health_observation: string;
    crop_types: string;
  };
  updateData: (fields: Partial<ChapterFarmProps['data']>) => void;
}

export const ChapterFarm: React.FC<ChapterFarmProps> = ({ data, updateData }) => {
  const [newCrop, setNewCrop] = useState('');

  const soilOptions = [
    { id: 'rich', label: 'Rich & Dark', description: 'Loamy, high organic matter', color: '#3d2b1f' },
    { id: 'sandy', label: 'Sandy', description: 'Light, fast draining', color: '#d2b48c' },
    { id: 'rocky', label: 'Rocky/Hard', description: 'Chalky or heavy clay', color: '#8b8589' },
    { id: 'average', label: 'Average', description: 'Standard red earth', color: '#a0522d' }
  ];

  const regions = ['Ashanti', 'Brong-Ahafo', 'Central', 'Eastern', 'Greater Accra', 'Northern', 'Savannah', 'Upper East', 'Upper West', 'Volta', 'Western'];

  const currentCrops = data.crop_types ? data.crop_types.split(',').map(c => c.trim()).filter(Boolean) : [];

  const addCrop = () => {
    if (newCrop.trim() && !currentCrops.includes(newCrop.trim())) {
      updateData({ crop_types: [...currentCrops, newCrop.trim()].join(', ') });
    }
    setNewCrop('');
  };

  const removeCrop = (crop: string) => {
    updateData({ crop_types: currentCrops.filter(c => c !== crop).join(', ') });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', fontFamily: 'Newsreader, serif' }}>
          Land & Soil
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
          Help us locate your field and understand its productivity potential.
        </p>
      </div>

      {/* Location Structured Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>REGION</label>
          <select 
            style={{ width: '240px', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            value={data.region}
            onChange={(e) => updateData({ region: e.target.value })}
          >
            <option value="">Select Region</option>
            {regions.map(r => <option key={r} value={r.toLowerCase().replace(' ', '_')}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>DISTRICT</label>
          <input 
            style={{ width: '240px', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
            value={data.district}
            onChange={(e) => updateData({ district: e.target.value })}
            placeholder="e.g. Ejura"
          />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>TOWN/LOCATION</label>
          <input 
            style={{ width: '240px', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
            value={data.town}
            onChange={(e) => updateData({ town: e.target.value })}
            placeholder="e.g. Aframso"
          />
        </div>
      </div>

      {/* Farm Size & Soil */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
            FARM SIZE (ACRES)
          </label>
          <div style={{ 
            position: 'relative', height: '48px', backgroundColor: '#f8fafc', 
            borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', 
            alignItems: 'center', boxSizing: 'border-box', width: '240px'
          }}>
            <input 
              type="number" step="0.1"
              style={{ border: 'none', background: 'transparent', flex: 1, padding: '0 1rem', fontSize: '0.9rem', fontWeight: 600, outline: 'none', color: '#1a1c1b' }}
              value={data.acres}
              onChange={(e) => updateData({ acres: e.target.value })}
              placeholder="0.0"
            />
          </div>
          <p style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 500, lineHeight: 1.4 }}>
            Total cultivable land area.
          </p>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
            SOIL HEALTH OBSERVATION
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {soilOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateData({ soil_health_observation: opt.id })}
                style={{
                  padding: '1rem 1.25rem', borderRadius: '16px', border: `2px solid ${data.soil_health_observation === opt.id ? '#084c17' : '#e2e8f0'}`,
                  backgroundColor: data.soil_health_observation === opt.id ? '#f0fdf4' : 'white',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', gap: '1rem', alignItems: 'center',
                  minHeight: '72px', boxSizing: 'border-box',
                  boxShadow: data.soil_health_observation === opt.id ? '0 4px 12px rgba(8,76,23,0.08)' : 'none'
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: opt.color, flexShrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1a1c1b', whiteSpace: 'nowrap' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{opt.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Crop Types (Chips) */}
      <div>
        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
          CROP DIVERSIFICATION
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '1.25rem', backgroundColor: '#fcfcf9', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          {currentCrops.map(crop => (
            <div key={crop} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#084c17', color: 'white', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 700 }}>
              {crop}
              <X size={14} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => removeCrop(crop)} />
            </div>
          ))}
          <div style={{ display: 'flex', flex: 1, minWidth: '200px' }}>
            <input 
              style={{ border: 'none', background: 'transparent', flex: 1, padding: '0.25rem 0.5rem', outline: 'none', fontSize: '0.9rem', fontWeight: 600 }}
              value={newCrop}
              onChange={(e) => setNewCrop(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCrop()}
              placeholder="Add another crop (e.g. Maize)..."
            />
            {newCrop && (
              <button onClick={addCrop} style={{ backgroundColor: '#e2f5e8', border: 'none', borderRadius: '8px', color: '#084c17', padding: '0.25rem 0.75rem', cursor: 'pointer' }}>
                <Check size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
