import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AestheticDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const AestheticDatePicker: React.FC<AestheticDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Parse YYYY-MM-DD safely
  const parseSafeDate = (val: string) => {
    if (!val || typeof val !== 'string') return null;
    const parts = val.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const selectedDate = parseSafeDate(value);

  // Sync viewDate when opening
  useEffect(() => {
    if (isOpen && selectedDate) {
      setViewDate(new Date(selectedDate));
    } else if (isOpen) {
      setViewDate(new Date());
    }
  }, [isOpen]);

  // Track position for Portal
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 80 + i);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calendar Overlay (to be Portaled)
  const calendarOverlay = (
    <div 
      style={{
        position: 'fixed',
        top: coords.top - window.scrollY + 8,
        left: Math.min(coords.left - window.scrollX, window.innerWidth - 300),
        zIndex: 999999,
        width: '280px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        animation: 'fadeInScale 0.15s ease-out',
        fontFamily: 'Inter, sans-serif'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div 
          onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
          style={{ fontWeight: 800, color: '#1a1c1b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}
        >
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          <ChevronRight size={14} style={{ transform: isYearPickerOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button" 
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
            style={{ border: 'none', background: '#f8fafc', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            type="button" 
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
            style={{ border: 'none', background: '#f8fafc', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isYearPickerOpen ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem 0' }}>
          {years.map(y => (
            <div 
              key={y} 
              onClick={() => {
                setViewDate(new Date(y, viewDate.getMonth(), 1));
                setIsYearPickerOpen(false);
              }}
              style={{
                padding: '0.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700,
                backgroundColor: y === viewDate.getFullYear() ? '#084c17' : 'transparent',
                color: y === viewDate.getFullYear() ? 'white' : '#4b5563'
              }}
            >
              {y}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', padding: '0.25rem 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
              const isSelected = selectedDate?.toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
              
              return (
                <div 
                  key={day}
                  onClick={() => handleDateClick(day)}
                  style={{
                    padding: '0.5rem 0', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.1s',
                    backgroundColor: isSelected ? '#084c17' : (isToday ? '#f0fdf4' : 'transparent'),
                    color: isSelected ? 'white' : (isToday ? '#084c17' : '#1a1c1b'),
                    border: isToday && !isSelected ? '1px solid #084c17' : 'none'
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ width: '100%' }}>
      {label && (
        <label 
          style={{ 
            fontSize: '0.65rem', 
            fontWeight: 800, 
            color: '#8c9196', 
            letterSpacing: '0.05em', 
            textTransform: 'uppercase', 
            marginBottom: '0.5rem', 
            display: 'block' 
          }}
        >
          {label}
        </label>
      )}
      
      <button 
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{ 
          width: '100%', 
          border: '2px solid transparent', 
          borderRadius: '10px', 
          padding: '0.85rem 1.1rem', 
          fontSize: '0.9rem', 
          backgroundColor: '#f1f1ee', 
          color: selectedDate ? '#1a1c1b' : '#94a3b8', 
          fontWeight: 600, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(8, 76, 23, 0.1)' : 'none',
          borderColor: isOpen ? '#084c17' : 'transparent'
        }}
      >
        <span>
          {selectedDate 
            ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
            : placeholder || 'Pick a date'}
        </span>
        <Calendar size={16} color={isOpen ? '#084c17' : '#94a3b8'} />
      </button>

      {/* Underlay to capture clicks outside when open */}
      {isOpen && (
        <div 
          onClick={() => { setIsOpen(false); setIsYearPickerOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 999998, cursor: 'default' }} 
        />
      )}

      {isOpen && createPortal(calendarOverlay, document.body)}
    </div>
  );
};
