
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vale, ValeStatus, OliveVariety, ValeType } from '../types';
import { Filter, Edit3, Search, MapPin, Calendar, ShoppingCart, X, Check, ChevronDown, ExternalLink } from 'lucide-react';

interface ValesListProps {
  vales: Vale[];
  onEdit: (vale: Vale) => void;
  onView: (vale: Vale) => void; // Nuevo prop para ver detalle
  onViewProducer: (producerName: string) => void; // Nuevo prop para navegar a productor
  onUpdateAnalitica: (valeId: number, rend: number, acidez: number) => void;
}

const CustomDropdown: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || options[0].label;

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center bg-[#111111] text-white rounded-xl px-4 py-3 text-xs font-black outline-none border border-white/5 transition-all hover:border-[#D9FF66]/50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180 text-[#D9FF66]' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#111111] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-xl text-left text-xs font-black transition-all mb-1 last:mb-0 ${value === opt.value ? 'bg-[#D9FF66] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {opt.label}
                {value === opt.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ValesList: React.FC<ValesListProps> = ({ vales, onEdit, onView, onViewProducer, onUpdateAnalitica }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterVariety, setFilterVariety] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const varietyOptions = useMemo(() => [
    { label: 'Todas las variedades', value: 'all' },
    ...Object.values(OliveVariety).map(v => ({ label: v, value: v }))
  ], []);

  const typeOptions = useMemo(() => [
    { label: 'Todos los tipos', value: 'all' },
    ...Object.values(ValeType).map(t => ({ label: t, value: t }))
  ], []);

  const filteredVales = useMemo(() => {
    return vales.filter(v => {
      const matchesText =
        v.productor_name.toLowerCase().includes(filterText.toLowerCase()) ||
        v.id_vale.toString().includes(filterText) ||
        v.parcela.toLowerCase().includes(filterText.toLowerCase());

      const matchesVariety = filterVariety === 'all' || v.variedad === filterVariety;
      const matchesType = filterType === 'all' || v.tipo_vale === filterType;

      return matchesText && matchesVariety && matchesType;
    }).sort((a, b) => b.id_vale - a.id_vale);
  }, [vales, filterText, filterVariety, filterType]);

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 rounded-full bg-black shrink-0"></div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tighter text-[#111111]">Histórico</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por socio, finca o nº..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#111111] text-white border-2 border-transparent focus:border-[#D9FF66] rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none transition-all placeholder:text-gray-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border-2 transition-all shrink-0 flex items-center justify-center shadow-lg ${showFilters ? 'bg-black text-[#D9FF66] border-black' : 'bg-white border-transparent text-gray-400 hover:text-black hover:border-[#D9FF66]/20'}`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[#111111] p-6 rounded-[32px] border border-white/5 shadow-2xl animate-in slide-in-from-top-4 duration-300 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <CustomDropdown
            label="Variedad de Oliva"
            value={filterVariety}
            options={varietyOptions}
            onChange={setFilterVariety}
          />
          <CustomDropdown
            label="Tipo de Entrada"
            value={filterType}
            options={typeOptions}
            onChange={setFilterType}
          />
          <div className="flex items-end">
            <button
              onClick={() => { setFilterVariety('all'); setFilterType('all'); setFilterText(''); }}
              className="w-full py-3.5 rounded-xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-[#D9FF66] transition-all border border-white/5"
            >
              Limpiar Criterios
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] custom-shadow overflow-hidden border border-gray-50 w-full">
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#F9FAF9] border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Nº Vale</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Fecha / Tipo</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Productor / Finca</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Tolva / Uso</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Variedad</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Kilos Netos</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Analítica Lab.</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredVales.map((v) => (
                <tr key={v.id} className="hover:bg-[#F4F7F4]/30 transition-colors group">
                  <td className="px-6 py-5">
                    <button
                      onClick={() => onView(v)}
                      className="text-sm font-black text-black tracking-tight hover:text-[#D9FF66] hover:bg-black px-2 py-1 rounded transition-colors"
                      title="Ver Trazabilidad"
                    >
                      #{v.id_vale.toString().padStart(3, '0')}
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={12} className="text-gray-400 shrink-0" />
                      <p className="text-[11px] font-black text-black whitespace-nowrap">{new Date(v.fecha_entrada).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block whitespace-nowrap ${v.tipo_vale === ValeType.MOLTURACION ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                      {v.tipo_vale}
                    </span>
                  </td>
                  <td className="px-6 py-5 max-w-[250px]">
                    <button
                      onClick={() => onViewProducer(v.productor_name)}
                      className="text-left group/prod"
                    >
                      <p className="text-sm font-black text-[#111111] uppercase tracking-tighter truncate group-hover/prod:text-blue-600 transition-colors flex items-center gap-1">
                        {v.productor_name}
                        {v.tipo_vale === ValeType.VENTA_DIRECTA && v.comprador_name && (
                          <span className="text-blue-500 lowercase font-bold"> → {v.comprador_name}</span>
                        )}
                        <ExternalLink size={10} className="opacity-0 group-hover/prod:opacity-100 text-blue-400" />
                      </p>
                    </button>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 truncate">
                      <MapPin size={10} className="shrink-0" /> {v.parcela}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {v.tipo_vale === ValeType.MOLTURACION ? (
                      <div className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                        <span className="text-[11px] font-black text-black">T{v.ubicacion_id}</span>
                        <span className="text-[11px] font-bold text-gray-400">/</span>
                        <span className="text-[11px] font-black text-blue-600">U{v.uso_contador}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase italic">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border inline-block whitespace-nowrap ${v.variedad === OliveVariety.PICUAL ? 'bg-green-50 text-green-700 border-green-100' :
                      'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                      {v.variedad}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-[#111111] whitespace-nowrap">
                    {v.kilos_netos.toLocaleString()} <span className="text-[10px] text-gray-400">KG</span>
                  </td>
                  <td className="px-6 py-5">
                    {v.tipo_vale === ValeType.VENTA_DIRECTA ? (
                      <div className="text-center italic text-gray-300 text-[10px] font-bold uppercase tracking-widest">Sin análisis</div>
                    ) : (
                      <div className="flex justify-center gap-3">
                        <div className="text-center">
                          <p className="text-[11px] font-black text-[#111111]">{v.analitica.rendimiento_graso || '--'}%</p>
                          <p className="text-[8px] font-black text-gray-300 uppercase">Rend.</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-black text-[#111111]">{v.analitica.acidez || '--'}º</p>
                          <p className="text-[8px] font-black text-gray-300 uppercase">Acid.</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button
                      onClick={() => onEdit(v)}
                      className="p-2.5 bg-[#111111] text-[#D9FF66] hover:bg-black rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95"
                      title="Editar registro completo"
                    >
                      <Edit3 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVales.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <Search size={48} className="text-gray-100" />
              <p className="text-gray-300 uppercase font-black tracking-widest text-[10px]">No se han encontrado resultados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
