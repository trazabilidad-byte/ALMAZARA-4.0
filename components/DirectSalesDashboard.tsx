
import React, { useMemo, useState } from 'react';
import { Vale, ValeType, Customer, Producer } from '../types';
import { ShoppingCart, Download, Search, Filter, Calendar, User, MapPin, ArrowUpRight, ExternalLink } from 'lucide-react';

interface DirectSalesDashboardProps {
  vales: Vale[];
  customers: Customer[];
  producers: Producer[];
  onViewVale: (vale: Vale) => void;
  onViewProducer: (producer: Producer) => void;
  onViewCustomer: (customer: Customer) => void;
}

const OliveIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.5 22c4.694 0 8.5-3.582 8.5-8s-3.806-8-8.5-8S4 9.582 4 14s3.806 8 8.5 8z" />
    <path d="M12.5 6V2" />
    <path d="M12.5 2L15 4.5" />
  </svg>
);

export const DirectSalesDashboard: React.FC<DirectSalesDashboardProps> = ({ 
  vales, customers, producers, onViewVale, onViewProducer, onViewCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const directSales = useMemo(() => {
    return vales.filter(v => v.tipo_vale === ValeType.VENTA_DIRECTA).sort((a,b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime());
  }, [vales]);

  const filteredSales = useMemo(() => {
    return directSales.filter(sale => {
      const producerName = String(sale.productor_name || '').toLowerCase();
      const customerName = String(customers.find(c => c.id === sale.comprador)?.name || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return producerName.includes(term) || customerName.includes(term) || String(sale.id_vale).includes(term);
    });
  }, [directSales, customers, searchTerm]);

  const totalKilos = filteredSales.reduce((acc, sale) => acc + (Number(sale.kilos_netos) || 0), 0);
  const totalOperaciones = filteredSales.length;
  
  const byVariety = filteredSales.reduce((acc, sale) => {
    const varName = String(sale.variedad || 'Desconocida');
    acc[varName] = (acc[varName] || 0) + (Number(sale.kilos_netos) || 0);
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = () => {
    const headers = ['Nº Vale', 'Fecha', 'Vendedor', 'Comprador', 'Variedad', 'Finca', 'Kilos Netos'];
    const rows = filteredSales.map(sale => {
        const buyer = customers.find(c => c.id === sale.comprador);
        return [
            sale.id_vale,
            new Date(sale.fecha_entrada).toLocaleDateString(),
            `"${String(sale.productor_name)}"`,
            `"${String(buyer?.name || 'N/A')}"`,
            String(sale.variedad),
            `"${String(sale.parcela)}"`,
            sale.kilos_netos
        ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `ventas_aceituna_directa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 w-full">
      <div className="flex flex-col md:flex-row justify-end items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar operación..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-100 focus:border-[#D9FF66] rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none transition-all shadow-sm"
                />
            </div>
            <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 bg-[#111111] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black/80 transition-all shadow-lg shrink-0">
                <Download size={16} /> Exportar Excel
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volumen Transaccionado</p>
                  <h3 className="text-4xl font-black text-[#111111] tracking-tighter">{totalKilos.toLocaleString()} <span className="text-sm text-gray-400">KG</span></h3>
               </div>
               <div className="p-3 bg-[#111111] text-[#D9FF66] rounded-xl"><OliveIcon size={24} /></div>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Operaciones</p>
                  <h3 className="text-4xl font-black text-[#111111] tracking-tighter">{totalOperaciones}</h3>
               </div>
               <div className="p-3 bg-gray-50 text-gray-600 rounded-xl"><Filter size={24} /></div>
            </div>
         </div>
         <div className="bg-[#111111] p-6 rounded-[24px] border border-gray-100 shadow-xl text-white flex flex-col justify-between">
            <div>
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Desglose por Variedad</p>
               <div className="space-y-2">
                 {Object.entries(byVariety).map(([variety, kgs]) => (
                    <div key={variety} className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-300">{String(variety)}</span>
                       <span className="font-black text-[#D9FF66]">{kgs.toLocaleString()} kg</span>
                    </div>
                 ))}
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto custom-scrollbar w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-[#F9FAF9] border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº Vale / Fecha</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendedor (Productor)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Comprador (Cliente)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Kilos Netos</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Variedad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filteredSales.map(sale => {
                        const buyer = customers.find(c => c.id === sale.comprador);
                        const seller = producers.find(p => p.id === sale.productor_id);
                        return (
                            <tr key={sale.id_vale} className="hover:bg-[#F4F7F4] transition-colors group">
                                <td className="px-6 py-5">
                                    <button onClick={() => onViewVale(sale)} className="text-left group-hover:scale-105 transition-transform">
                                      <p className="text-sm font-black text-[#111111] underline decoration-dotted decoration-[#D9FF66] underline-offset-4">
                                        #{String(sale.id_vale).padStart(3, '0')}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                                          <Calendar size={12} />
                                          <span className="text-[10px] font-bold uppercase">{new Date(sale.fecha_entrada).toLocaleDateString()}</span>
                                      </div>
                                    </button>
                                </td>
                                <td className="px-6 py-5">
                                    <button onClick={() => seller && onViewProducer(seller)} disabled={!seller} className={`text-left ${seller ? 'hover:opacity-70' : ''}`}>
                                      <p className="text-xs font-black text-[#111111] uppercase flex items-center gap-1">
                                        {String(sale.productor_name)}
                                        {seller && <ExternalLink size={10} className="text-gray-400" />}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                                          <MapPin size={12} />
                                          <span className="text-[10px] font-bold uppercase">{String(sale.parcela)}</span>
                                      </div>
                                    </button>
                                </td>
                                <td className="px-6 py-5">
                                    {buyer ? (
                                        <button onClick={() => onViewCustomer(buyer)} className="bg-[#efffc2] px-3 py-2 rounded-xl border border-[#D9FF66] text-left hover:bg-[#D9FF66] transition-colors group/buyer">
                                            <p className="text-xs font-black text-black uppercase flex items-center gap-1">
                                              {String(buyer.name)}
                                              <ExternalLink size={10} className="text-black/40 group-hover/buyer:text-black" />
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-black/60 group-hover/buyer:text-black">
                                                <User size={10} />
                                                <span className="text-[9px] font-bold uppercase">{String(buyer.cif)}</span>
                                            </div>
                                        </button>
                                    ) : <span className="text-red-400 text-xs font-bold uppercase">No Asignado</span>}
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <span className="text-base font-black text-[#111111]">{sale.kilos_netos.toLocaleString()}</span> <span className="text-[10px] font-bold text-gray-400">KG</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-lg border border-gray-200">
                                        {String(sale.variedad)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
