
import React, { useState, useMemo } from 'react';
import { Customer, CustomerStatus, CustomerType } from '../types';
import { Search, MapPin, Phone, Building2, ChevronRight, Archive, AlertCircle, ShoppingBag, Truck } from 'lucide-react';

interface CustomersListProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
}

export const CustomersList: React.FC<CustomersListProps> = ({ customers, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.cif.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = viewMode === 'active' 
        ? c.status === CustomerStatus.ACTIVE || !c.status 
        : c.status === CustomerStatus.ARCHIVED;
      
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, viewMode]);

  const getTypeIcon = (type: CustomerType) => {
    switch (type) {
      case CustomerType.MAYORISTA: return <Truck size={16} />;
      case CustomerType.MINORISTA: return <ShoppingBag size={16} />;
      default: return <Building2 size={16} />;
    }
  };

  const getTypeStyle = (type: CustomerType) => {
    switch (type) {
      case CustomerType.MAYORISTA: return 'bg-blue-50 text-blue-700 border-blue-100';
      case CustomerType.MINORISTA: return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 rounded-full bg-black shrink-0"></div>
             <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-[#111111]">Cartera de Clientes</h2>
           </div>
           
           <div className="relative w-full sm:w-72">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por nombre o CIF..." 
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
                  <strong>Política de Retención:</strong> Los clientes archivados se conservarán en el sistema durante un periodo de <strong>5 campañas</strong> por motivos fiscales antes de permitir su borrado definitivo.
               </p>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
          <div 
            key={customer.id} 
            onClick={() => onSelect(customer)}
            className={`p-6 rounded-[24px] border transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden flex flex-col h-full ${customer.status === CustomerStatus.ARCHIVED ? 'bg-gray-50 border-gray-200 opacity-80' : 'bg-white border-gray-100 hover:border-black'}`}
          >
            <div className="flex justify-between items-start mb-4">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${customer.status === CustomerStatus.ARCHIVED ? 'bg-gray-200 text-gray-500' : 'bg-[#F9FAF9] text-gray-400 group-hover:bg-[#111111] group-hover:text-[#D9FF66]'}`}>
                  <Building2 size={24} />
               </div>
               <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase border flex items-center gap-1.5 ${getTypeStyle(customer.type)}`}>
                  {getTypeIcon(customer.type)}
                  {customer.type}
               </span>
            </div>
            
            <h3 className="text-lg font-black text-[#111111] uppercase tracking-tight mb-1 line-clamp-1">{customer.name}</h3>
            <p className="text-xs font-bold text-gray-400 mb-4">{customer.cif}</p>
            
            <div className="space-y-2 mt-auto">
               <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{customer.address}</span>
               </div>
               <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Phone size={14} className="shrink-0" />
                  <span className="truncate">{customer.phone || 'Sin teléfono'}</span>
               </div>
            </div>

            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${customer.status === CustomerStatus.ARCHIVED ? 'bg-gray-300 text-gray-600' : 'bg-[#D9FF66] text-black'}`}>
                  <ChevronRight size={16} />
               </div>
            </div>
          </div>
        ))}
        
        {filteredCustomers.length === 0 && (
           <div className="col-span-full py-20 text-center text-gray-400">
              <p className="font-bold">No se encontraron clientes {viewMode === 'active' ? 'activos' : 'archivados'} con ese criterio.</p>
           </div>
        )}
      </div>
    </div>
  );
};
