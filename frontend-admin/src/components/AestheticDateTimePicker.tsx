import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface AestheticDateTimePickerProps {
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const AestheticDateTimePicker: React.FC<AestheticDateTimePickerProps> = ({ 
  value, 
  onChange, 
  label, 
  placeholder,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Internal state for the picker viewport
  const getInitialDate = (val: string) => {
    const d = val ? new Date(val) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [viewDate, setViewDate] = useState(getInitialDate(value));
  const [tempDate, setTempDate] = useState<Date | null>(value && !isNaN(new Date(value).getTime()) ? new Date(value) : null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setTempDate(d);
      }
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 420px below, open upwards
      setPlacement(spaceBelow < 420 ? 'top' : 'bottom');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDayClick = (day: number) => {
    const newDate = tempDate ? new Date(tempDate) : new Date();
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    updateValue(newDate);
  };

  const updateValue = (date: Date) => {
    setTempDate(date);
    // Format to YYYY-MM-DDTHH:mm local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    
    onChange(`${year}-${month}-${day}T${hours}:${mins}`);
  };

  const changeMonth = (offset: number) => {
    const newView = new Date(viewDate);
    newView.setMonth(newView.getMonth() + offset);
    setViewDate(newView);
  };

  const setTime = (hours: number, minutes: number) => {
    const newDate = tempDate ? new Date(tempDate) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    updateValue(newDate);
  };

  // Calendar Logic
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-semibold text-stone-700 mb-1">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 text-sm font-bold text-stone-700 outline-none hover:border-[#0d631b]/30 transition-all cursor-pointer"
      >
        <span className={tempDate && !isNaN(tempDate.getTime()) ? 'text-stone-900' : 'text-stone-400 font-normal'}>
          {tempDate && !isNaN(tempDate.getTime()) ? tempDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : placeholder || 'Select date and time'}
        </span>
        <CalendarIcon size={18} className="text-stone-400" />
      </div>

      {isOpen && (
        <div 
          className={`
            absolute right-0 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-stone-100 p-6 z-[999] animate-in fade-in duration-300 w-[320px]
            ${placement === 'top' ? 'bottom-full mb-2 slide-in-from-bottom-4' : 'top-full mt-2 slide-in-from-top-4'}
          `}
        >
          {/* Picker Header */}
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-headline font-black text-lg text-stone-900 tracking-tight">
              {monthName} <span className="text-stone-300 font-normal">{year}</span>
            </h4>
            <div className="flex gap-1">
              <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-stone-50 text-stone-400 hover:text-stone-900 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-stone-50 text-stone-400 hover:text-stone-900 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-stone-300 uppercase py-2 tracking-widest">{d}</div>
            ))}
            {padding.map(p => <div key={`p-${p}`} />)}
            {days.map(d => {
              const isActive = tempDate && !isNaN(tempDate.getTime()) &&
                tempDate.getDate() === d && 
                tempDate.getMonth() === viewDate.getMonth() && 
                tempDate.getFullYear() === viewDate.getFullYear();
              
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDayClick(d)}
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isActive 
                      ? 'bg-[#0d631b] text-white shadow-lg shadow-[#0d631b]/20 scale-110' 
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}
                  `}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Time Picker Component */}
          <div className="pt-6 border-t border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-stone-400" />
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Time selection</span>
              </div>
              <div className="text-xs font-black text-[#0d631b]">
                {tempDate && !isNaN(tempDate.getTime()) ? tempDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '00:00'}
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl">
              <div className="flex-1 flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest pl-1">Hour</span>
                  <select 
                    value={tempDate && !isNaN(tempDate.getTime()) ? tempDate.getHours() : 0}
                    onChange={(e) => setTime(parseInt(e.target.value), tempDate?.getMinutes() || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg py-1.5 px-2 text-xs font-bold text-stone-700 outline-none focus:border-[#0d631b] transition-all appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest pl-1">Min</span>
                  <select 
                    value={tempDate && !isNaN(tempDate.getTime()) ? tempDate.getMinutes() : 0}
                    onChange={(e) => setTime(tempDate?.getHours() || 0, parseInt(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-lg py-1.5 px-2 text-xs font-bold text-stone-700 outline-none focus:border-[#0d631b] transition-all appearance-none cursor-pointer"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
            >
              Close
            </button>
            <button 
              type="button" 
              onClick={() => {
                if (!tempDate || isNaN(tempDate.getTime())) updateValue(new Date());
                setIsOpen(false);
              }}
              className="px-5 py-2 rounded-lg bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors shadow-xl"
            >
              Set Date
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
