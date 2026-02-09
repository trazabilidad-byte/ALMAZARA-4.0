
import React, { useState, useMemo } from 'react';
import { Producer, ProducerStatus } from '../types';
import { Search, MapPin, Phone, User, ChevronRight, Archive, AlertCircle } from 'lucide-react';

interface ProducersListProps {
  producers: Producer[];
  onSelect: (producer: Producer) => void;
}

export const ProducersList: React.FC<ProducersListProps> = ({ producers, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  const filteredProducers = useMemo(() => {
    return producers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.nif.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = viewMode === 'active' 
        ? p.status === ProducerStatus.ACTIVE || !p.status 
        : p.status === ProducerStatus.ARCHIVED;
      
      return matchesSearch && matchesStatus;
    });
  }, [producers, searchTerm, viewMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 rounded-full bg-black shrink-0"></div>
             <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-[#111111]">Socios y Productores</h2>
           </div>
           
           <div className="relative w-full sm:w-72">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por nombre o DNI..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white border border-gray-100 focus:border-[#D9FF66] rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none transition-all shadow-sm"
             />
           </div>
         </div>

         <div className="flex gap-2 p-1 bg-white rounded-xl w-fit border border-gray-100 shadow-sm">
            <button 
               onClick={() => setViewMode('active')}
               className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'active' ? 'bg-[#111111] text-white shadow-md' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
            >
               Activos
            </button>
            <button 
               onClick={() => setViewMode('archived')}
               className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'archived' ? 'bg-[#111111] text-white shadow-md' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
            >
               Archivados <Archive size={14} />
            </button>
         </div>

         {viewMode === 'archived' && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-xs">
               <AlertCircle size={16} className="shrink-0 mt-0.5" />
               <p className="font-medium">
                  <strong>Política de Retención:</strong> Los productores archivados se conservarán en el sistema durante un periodo de <strong>5 campañas</strong> por motivos fiscales y de trazabilidad antes de permitir su borrado definitivo.
               </p>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducers.map(producer => (
          <div 
            key={producer.id} 
            onClick={() => onSelect(producer)}
            className={`p-6 rounded-[24px] border transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden ${producer.status === ProducerStatus.ARCHIVED ? 'bg-gray-50 border-gray-200 opacity-80' : 'bg-white border-gray-100 hover:border-black'}`}
          >
            <div className="flex justify-between items-start mb-4">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${producer.status === ProducerStatus.ARCHIVED ? 'bg-gray-200 text-gray-500' : 'bg-[#F9FAF9] text-gray-400 group-hover:bg-[#111111] group-hover:text-[#D9FF66]'}`}>
                  <User size={24} />
               </div>
               <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${producer.status === ProducerStatus.ARCHIVED ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>{producer.nif}</span>
            </div>
            
            <h3 className="text-lg font-black text-[#111111] uppercase tracking-tight mb-3 line-clamp-1">{producer.name}</h3>
            
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{producer.municipality}</span>
               </div>
               <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Phone size={14} className="shrink-0" />
                  <span className="truncate">{producer.phone || 'Sin teléfono'}</span>
               </div>
            </div>

            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${producer.status === ProducerStatus.ARCHIVED ? 'bg-gray-300 text-gray-600' : 'bg-[#D9FF66] text-black'}`}>
                  <ChevronRight size={16} />
               </div>
            </div>
          </div>
        ))}
        
        {filteredProducers.length === 0 && (
           <div className="col-span-full py-20 text-center text-gray-400">
              <p className="font-bold">No se encontraron productores {viewMode === 'active' ? 'activos' : 'archivados'} con ese criterio.</p>
           </div>
        )}
      </div>
    </div>
  );
};
