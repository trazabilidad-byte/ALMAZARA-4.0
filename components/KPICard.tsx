
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ChevronRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  percentage?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  onClick?: () => void;
  menuActions?: { label: string; action: () => void; color?: string }[];
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, percentage, icon, trend, onClick, menuActions }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="bg-white p-5 rounded-[28px] custom-shadow flex flex-col relative overflow-visible transition-all hover:translate-y-[-2px] group cursor-pointer border border-transparent hover:border-[#D9FF66]"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F9FAF9] flex items-center justify-center text-gray-500 border border-gray-100 group-hover:bg-[#111111] group-hover:text-[#D9FF66] transition-colors">
            {icon}
          </div>
          <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{title}</span>
        </div>
        
        {menuActions && menuActions.length > 0 && (
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-300 hover:text-black transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <MoreVertical size={16} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#111111] rounded-xl shadow-xl border border-gray-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="py-1">
                  {menuActions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { item.action(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:text-[#D9FF66] hover:bg-white/10 transition-colors flex items-center justify-between group/item"
                    >
                      {item.label}
                      <ChevronRight size={12} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="text-2xl font-extrabold tracking-tighter text-[#111111]">{value}</span>
        {percentage !== undefined && (
          <div className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${trend === 'down' ? 'bg-red-100 text-red-600' : 'bg-[#111111] text-[#D9FF66]'}`}>
            {percentage}%
          </div>
        )}
      </div>
      
      <p className="text-gray-400 text-[11px] font-semibold mb-4 flex items-center gap-1">
        {subtitle}
      </p>
      
      {percentage !== undefined && (
        <div className="mt-auto flex gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div 
              key={i} 
              className={`h-1.5 w-full rounded-full transition-all ${i <= (percentage / 10) ? (trend === 'down' ? 'bg-red-500' : 'bg-[#111111]') : 'bg-[#F2F4F2]'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
