import React from 'react';
import { LIME_ACCENT, NAV_ITEMS } from '../constants';
import { User } from '../types';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  currentUser?: User | null;
  onLogout: () => void;
  navItems?: typeof NAV_ITEMS;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, onLogout, navItems }) => {
  const itemsToRender = (navItems || NAV_ITEMS).filter(item => {
    if (!item.allowedRoles) return true;
    return currentUser?.role && item.allowedRoles.includes(currentUser.role);
  });

  return (
    <div className="w-16 md:w-20 lg:w-64 h-screen bg-[#111111] text-white flex flex-col p-3 md:p-4 fixed left-0 top-0 transition-all duration-300 z-50 shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 mb-8 md:mb-10 px-1 lg:px-2 shrink-0">
        <div className="w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center font-bold text-black shrink-0" style={{ backgroundColor: LIME_ACCENT }}>
          A4
        </div>
        <span className="hidden lg:block text-xl font-bold tracking-tight truncate">ALMAZARA 4.0</span>
      </div>

      {/* Menú navegable sin barra de scroll visible */}
      <nav className="flex-1 flex flex-col gap-1 md:gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {itemsToRender.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all relative group shrink-0 ${activeTab === item.id
              ? 'bg-[#222222] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            title={String(item.label)}
          >
            <div className={`shrink-0 ${activeTab === item.id ? 'text-[#D9FF66]' : ''}`}>
              {item.icon}
            </div>
            <span className="hidden lg:block font-medium truncate text-left text-sm">
              {String(item.label)}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800 shrink-0">
        <div className="flex items-center justify-between px-1 lg:px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
              {currentUser?.fullName ? String(currentUser.fullName).charAt(0) : 'A'}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-semibold truncate max-w-[120px]">{currentUser?.fullName ? String(currentUser.fullName) : 'Administrador'}</p>
              <p className="text-[10px] text-gray-500 uppercase truncate">Uso Privado</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
