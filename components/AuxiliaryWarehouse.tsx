
import React, { useState, useMemo } from 'react';
import { AuxMaterialType, AuxEntry, AuxStock, AuxProductDefinition } from '../types';
import { Plus, Search, AlertTriangle, Package, Calendar, DollarSign, Box, Layers, History, ArrowDown, X, Settings2, BarChart3, AlertCircle } from 'lucide-react';

interface AuxiliaryWarehouseProps {
  entries: AuxEntry[];
  stockData: AuxStock[];
  availableProducts: AuxProductDefinition[]; 
  onAddEntry: (entry: AuxEntry) => void;
}

export const AuxiliaryWarehouse: React.FC<AuxiliaryWarehouseProps> = ({ entries, stockData, availableProducts, onAddEntry }) => {
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false); // Modal Ajuste
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State Entrada Normal
  const [formData, setFormData] = useState<Partial<AuxEntry>>({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    materialType: availableProducts.length > 0 ? availableProducts[0].name : '',
    quantity: 0,
    manufacturerBatch: '',
    pricePerUnit: 0
  });

  // Form State Ajuste Manual
  const [adjustData, setAdjustData] = useState({
      materialType: '',
      quantity: '',
      reason: 'Rotura / Merma',
      date: new Date().toISOString().split('T')[0]
  });

  // --- HANDLERS ---

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier || !formData.quantity || !formData.materialType) return;

    onAddEntry({
      id: `AUX-${Date.now()}`,
      almazaraId: 'private',
      date: formData.date!,
      supplier: String(formData.supplier),
      materialType: String(formData.materialType),
      quantity: Number(formData.quantity),
      manufacturerBatch: String(formData.manufacturerBatch || 'N/A'),
      pricePerUnit: Number(formData.pricePerUnit) || 0
    });

    setShowEntryForm(false);
    // Reset
    setFormData({
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      materialType: availableProducts.length > 0 ? availableProducts[0].name : '',
      quantity: 0,
      manufacturerBatch: '',
      pricePerUnit: 0
    });
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!adjustData.materialType || !adjustData.quantity) return;

      const qty = parseInt(adjustData.quantity);
      if (qty === 0) return;

      onAddEntry({
          id: `ADJ-${Date.now()}`,
          almazaraId: 'private',
          date: adjustData.date,
          supplier: 'AJUSTE INTERNO',
          materialType: String(adjustData.materialType),
          quantity: qty, // Puede ser negativo
          manufacturerBatch: `AJUSTE: ${adjustData.reason}`,
          pricePerUnit: 0
      });

      setShowAdjustForm(false);
      setAdjustData({ materialType: '', quantity: '', reason: 'Rotura / Merma', date: new Date().toISOString().split('T')[0] });
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      String(e.supplier).toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(e.materialType).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.manufacturerBatch).toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchTerm]);

  // Filtrar inventario para la tabla
  const inventoryList = useMemo(() => {
      return stockData.filter(item => 
        String(item.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.category).toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [stockData, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/* HEADER & ACTIONS (Título eliminado, solo botones a la derecha) */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
            <button 
                onClick={() => setShowAdjustForm(true)}
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#111111] px-6 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all shadow-sm w-full sm:w-auto"
            >
                <Settings2 size={16} /> Ajuste Manual
            </button>
            <button 
                onClick={() => setShowEntryForm(true)}
                className="flex items-center justify-center gap-2 bg-[#111111] text-[#D9FF66] px-6 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10 w-full sm:w-auto"
            >
                <Plus size={18} /> Registrar Entrada
            </button>
      </div>

      {/* TABLA DE INVENTARIO PRINCIPAL */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden w-full">
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-[#F9FAF9] gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
                  <h3 className="text-lg font-black uppercase text-[#111111]">Inventario Actual</h3>
              </div>
              
              {/* Buscador Integrado */}
              <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Buscar material..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:border-[#D9FF66]"
                  />
              </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-white">
                      <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Disponible</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Movimientos</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {inventoryList.map((item, idx) => {
                          const isLow = item.currentStock < 500;
                          const progress = Math.min((item.currentStock / 5000) * 100, 100); // 5000 como referencia visual arbitraria

                          return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-8 py-5">
                                      <p className="text-sm font-black text-[#111111] uppercase">{String(item.type)}</p>
                                  </td>
                                  <td className="px-6 py-5">
                                      <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                          {String(item.category)}
                                      </span>
                                  </td>
                                  <td className="px-6 py-5">
                                      <div className="flex items-center gap-4">
                                          <span className={`text-lg font-black tabular-nums ${isLow ? 'text-red-600' : 'text-[#111111]'}`}>
                                              {item.currentStock.toLocaleString()} <span className="text-xs text-gray-400">uds</span>
                                          </span>
                                      </div>
                                      {/* Barra visual de stock */}
                                      <div className="h-1.5 w-32 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                          <div 
                                              className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-[#D9FF66]'}`} 
                                              style={{ width: `${progress}%` }}
                                          ></div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-5">
                                      {isLow ? (
                                          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 w-fit px-3 py-1.5 rounded-lg border border-red-100">
                                              <AlertTriangle size={14} />
                                              <span className="text-[10px] font-black uppercase">Stock Bajo</span>
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-1.5 text-green-600 bg-green-50 w-fit px-3 py-1.5 rounded-lg border border-green-100">
                                              <BarChart3 size={14} />
                                              <span className="text-[10px] font-black uppercase">Óptimo</span>
                                          </div>
                                      )}
                                  </td>
                                  <td className="px-6 py-5 text-right">
                                      <div className="flex flex-col items-end gap-1">
                                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                              <ArrowDown size={10} className="rotate-180" /> Entradas: {item.totalIn.toLocaleString()}
                                          </span>
                                          <span className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
                                              <ArrowDown size={10} /> Salidas: {item.totalOut.toLocaleString()}
                                          </span>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {inventoryList.length === 0 && (
                          <tr>
                              <td colSpan={5} className="p-12 text-center text-gray-400">
                                  <Package size={48} className="mx-auto mb-2 opacity-20" />
                                  <p className="text-xs font-bold uppercase">No hay productos registrados</p>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* HISTÓRICO DE ENTRADAS */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mt-8 w-full">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><History size={20} /></div>
               <h3 className="text-lg font-black uppercase text-[#111111]">Histórico de Movimientos (Entradas)</h3>
            </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar w-full">
           <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-[#F9FAF9] border-b border-gray-100">
                 <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Proveedor / Origen</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Material</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lote / Motivo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Cantidad</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Coste</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                       <td className="px-6 py-4 text-xs font-black uppercase text-[#111111]">{String(entry.supplier)}</td>
                       <td className="px-6 py-4">
                          <span className="text-[10px] font-black uppercase bg-gray-100 px-2 py-1 rounded-md text-gray-600 border border-gray-200">
                              {String(entry.materialType)}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-xs font-bold text-gray-500 font-mono">{String(entry.manufacturerBatch)}</td>
                       <td className={`px-6 py-4 text-sm font-black text-right ${entry.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                           {entry.quantity > 0 ? '+' : ''}{entry.quantity.toLocaleString()}
                       </td>
                       <td className="px-6 py-4 text-xs font-bold text-gray-500 text-right">{entry.pricePerUnit > 0 ? `${entry.pricePerUnit.toFixed(2)}€` : '-'}</td>
                    </tr>
                 ))}
                 {filteredEntries.length === 0 && (
                    <tr>
                       <td colSpan={6} className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No hay movimientos registrados</td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* MODAL REGISTRO DE ENTRADA */}
      {showEntryForm && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">GESTIÓN DE COMPRAS</p>
                     <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Nueva Entrada de Stock</h3>
                  </div>
                  <button onClick={() => setShowEntryForm(false)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
               </div>
               
               <form onSubmit={handleSubmitEntry} className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="date" 
                                required
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-[#111111] outline-none"
                            />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Lote Fabricante</label>
                        <input 
                            type="text" 
                            placeholder="L-123456"
                            value={formData.manufacturerBatch}
                            onChange={e => setFormData({...formData, manufacturerBatch: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Proveedor</label>
                     <input 
                        type="text" 
                        required
                        placeholder="Nombre del proveedor"
                        value={formData.supplier}
                        onChange={e => setFormData({...formData, supplier: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Producto</label>
                     <select 
                        required
                        value={formData.materialType}
                        onChange={e => setFormData({...formData, materialType: e.target.value})}
                        className="w-full bg-[#111111] text-white border-2 border-transparent focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold outline-none"
                     >
                        {availableProducts.length > 0 ? (
                            availableProducts.map(prod => (
                               <option key={prod.id} value={prod.name} className="text-black bg-white">{String(prod.name)}</option>
                            ))
                        ) : (
                            <option value="" disabled className="text-gray-400">Sin productos configurados</option>
                        )}
                     </select>
                     {availableProducts.length === 0 && (
                         <p className="text-[9px] text-red-500 font-bold mt-1">Configura productos en Ajustes &gt; Formatos</p>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad (Uds)</label>
                        <div className="relative">
                            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="number" 
                                required
                                placeholder="0"
                                value={formData.quantity || ''}
                                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-black text-[#111111] outline-none"
                            />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio Unitario (€)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="number" 
                                step="0.0001"
                                placeholder="0.00"
                                value={formData.pricePerUnit || ''}
                                onChange={e => setFormData({...formData, pricePerUnit: parseFloat(e.target.value)})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-black text-[#111111] outline-none"
                            />
                        </div>
                     </div>
                  </div>

                  <button 
                     type="submit"
                     className="w-full py-5 rounded-[24px] bg-[#D9FF66] text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                  >
                     Confirmar Entrada de Stock
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL AJUSTE MANUAL */}
      {showAdjustForm && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                  <div>
                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">CORRECCIÓN DE INVENTARIO</p>
                     <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Ajuste Manual</h3>
                  </div>
                  <button onClick={() => setShowAdjustForm(false)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
               </div>
               
               <form onSubmit={handleSubmitAdjustment} className="p-8 space-y-6">
                  
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 text-orange-800">
                      <AlertCircle size={20} className="shrink-0" />
                      <p className="text-xs font-medium leading-relaxed">
                          Usa valores <strong>negativos</strong> (ej: -50) para restar stock por roturas o mermas, y <strong>positivos</strong> para correcciones de conteo.
                      </p>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Producto a Ajustar</label>
                     <select 
                        required
                        value={adjustData.materialType}
                        onChange={e => setAdjustData({...adjustData, materialType: e.target.value})}
                        className="w-full bg-[#111111] text-white border-2 border-transparent focus:border-orange-400 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                     >
                        <option value="">Seleccionar...</option>
                        {stockData.map(item => (
                           <option key={item.type} value={item.type} className="text-black bg-white">{String(item.type)}</option>
                        ))}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad (+/-)</label>
                     <input 
                        type="number" 
                        required
                        placeholder="-10"
                        value={adjustData.quantity}
                        onChange={e => setAdjustData({...adjustData, quantity: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xl font-black text-[#111111] outline-none focus:border-orange-400"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Motivo</label>
                     <select 
                        value={adjustData.reason}
                        onChange={e => setAdjustData({...adjustData, reason: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none"
                     >
                         <option value="Rotura / Merma">Rotura / Merma (Resta)</option>
                         <option value="Error Conteo">Error de Conteo (Suma/Resta)</option>
                         <option value="Devolución">Devolución (Suma)</option>
                         <option value="Otro">Otro Motivo</option>
                     </select>
                  </div>

                  <button 
                     type="submit"
                     className="w-full py-5 rounded-[24px] bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl"
                  >
                     Aplicar Ajuste
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};
