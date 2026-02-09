
import React from 'react';
import { Tank } from '../types';
import { AlertTriangle } from 'lucide-react';

interface TankGridProps {
  tanks: Tank[];
  onViewDetails: (tank: Tank) => void;
}

export const TankGrid: React.FC<TankGridProps> = ({ tanks, onViewDetails }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {tanks.map((tank) => {
        const percentage = (tank.currentKg / tank.maxCapacityKg) * 100;
        const isEmpty = tank.currentKg === 0;
        const isCritical = percentage >= 95;

        return (
          <div 
            key={tank.id} 
            onClick={() => onViewDetails(tank)}
            className={`group relative bg-white rounded-[24px] overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl h-[200px] flex flex-col justify-between ${isCritical ? 'border-red-500' : 'border-transparent hover:border-[#D9FF66]'}`}
          >
            {/* LÍQUIDO DE FONDO */}
            <div className="absolute inset-0 bg-[#F9FAF9] z-0 pointer-events-none">
               <div 
                  className={`absolute bottom-0 w-full transition-all duration-1000 ease-in-out ${isCritical ? 'bg-red-500' : 'bg-[#D9FF66]'}`}
                  style={{ height: `${percentage}%`, opacity: isEmpty ? 0 : 1 }}
               >
                  <div className="absolute top-0 w-full h-1 bg-white/20"></div>
               </div>
            </div>

            {/* CONTENIDO SUPERIOR */}
            <div className="relative z-10 p-4 text-[#111111]">
                <div className="flex justify-between items-start">
                    <span className={`text-lg font-black uppercase tracking-tighter leading-none ${isCritical ? 'text-white' : ''}`}>{tank.name}</span>
                    {isCritical && <AlertTriangle size={16} className="text-white animate-bounce" />}
                </div>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80 ${isCritical ? 'text-white' : 'text-gray-500'}`}>
                    {isEmpty ? 'DISPONIBLE' : tank.variety_id}
                </p>
            </div>

            {/* CONTENIDO INFERIOR */}
            <div className="relative z-10 px-4 pb-4">
                <p className={`text-4xl font-black tracking-tighter leading-none ${isCritical ? 'text-white' : 'text-[#111111]'}`}>{Math.round(percentage)}%</p>
                <div className={`h-px w-full my-2 ${isCritical ? 'bg-white/30' : 'bg-gray-200'}`}></div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? 'text-white' : 'text-gray-400'}`}>
                   {tank.currentKg.toLocaleString()} KG
                </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
