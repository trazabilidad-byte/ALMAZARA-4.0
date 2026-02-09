
import React, { useState, useMemo, useEffect } from 'react';
import { FinishedProduct, Customer, SalesOrder, PomaceExit, CustomerType, CustomerStatus, OilExit, ExitType, Tank } from '../types';
import { ShoppingCart, Package, Truck, Search, Plus, Calendar, User, FileText, CheckCircle2, Box, ArrowUpRight, DollarSign, List, Trash2, AlertTriangle, Droplets, X, ChevronDown, Download, Factory } from 'lucide-react';

interface SalesDashboardProps {
  finishedProducts: FinishedProduct[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  pomaceExits: PomaceExit[];
  oilExits: OilExit[]; // Para mostrar historial de granel (cisternas)
  tanks: Tank[]; // Necesario para el selector de origen granel
  currentCampaign: string;
  onProcessSale: (order: SalesOrder) => void;
  onProcessPomaceExit: (exit: PomaceExit) => void;
  onProcessBulkExit: (data: { customerId: string, date: string, driver: string, plate: string, seals: string, deliveryNote: string, sources: { tankId: number, kg: number }[] }) => void;
  onViewLot?: (lotId: string) => void; // Prop para trazabilidad
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  finishedProducts,
  customers,
  salesOrders,
  pomaceExits,
  oilExits,
  tanks,
  currentCampaign,
  onProcessSale,
  onProcessPomaceExit,
  onProcessBulkExit,
  onViewLot
}) => {
  const [activeTab, setActiveTab] = useState<'packaged' | 'pomace' | 'bulk'>('packaged');
  const [selectedBulkExit, setSelectedBulkExit] = useState<{ note: string, exits: OilExit[] } | null>(null);
  
  // Modales nuevos
  const [selectedSaleOrder, setSelectedSaleOrder] = useState<SalesOrder | null>(null);
  const [selectedPomaceExit, setSelectedPomaceExit] = useState<PomaceExit | null>(null);

  // --- ESTADOS VENTA ENVASADO ---
  const [saleForm, setSaleForm] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    selectedProductStockId: '',
    units: '',
    price: ''
  });

  // --- ESTADOS VENTA ORUJO ---
  const [pomaceForm, setPomaceForm] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    kg: '',
    valeNumber: '',
    notes: ''
  });

  // --- ESTADOS VENTA GRANEL (MULTI-DEPÓSITO) ---
  const [bulkForm, setBulkForm] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    driver: '',
    plate: '',
    seals: '',
    deliveryNote: '', // Autogenerado
    sources: [{ tankId: 0, kg: '' }] // Array dinámico de orígenes
  });

  // Helper para sufijo de campaña
  const getCampaignSuffix = () => {
      const campaignYears = currentCampaign.split('/');
      if (campaignYears.length === 2) {
          const y1 = campaignYears[0].slice(-2);
          const y2 = campaignYears[1].slice(-2);
          return `${y1}/${y2}`;
      }
      return new Date().getFullYear().toString().slice(-2);
  };

  // Generar Nº Albarán Automático al cambiar a pestaña Bulk o al enviar
  useEffect(() => {
      if (activeTab === 'bulk') {
          const suffix = getCampaignSuffix();
          const uniqueNotes = new Set(oilExits.filter(e => e.type === ExitType.CISTERNA).map(e => e.deliveryNote));
          const nextSequence = uniqueNotes.size + 1;
          const autoNote = `${nextSequence.toString().padStart(3, '0')}/${suffix}`;
          setBulkForm(prev => ({ ...prev, deliveryNote: autoNote }));
      }
  }, [activeTab, oilExits, currentCampaign]);

  // --- LÓGICA VENTA ENVASADO ---
  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.customerId || !saleForm.selectedProductStockId || !saleForm.units) return;

    const stockItem = finishedProducts.find(p => p.id === saleForm.selectedProductStockId);
    if (!stockItem) return;

    const units = parseInt(saleForm.units);
    if (units > stockItem.unitsAvailable) return alert("Stock insuficiente para esta venta.");

    // Generar ID de Venta Secuencial V00X/YY/YY
    const suffix = getCampaignSuffix();
    const nextSeq = salesOrders.length + 1;
    const saleId = `V${nextSeq.toString().padStart(3, '0')}/${suffix}`;

    const newOrder: SalesOrder = {
      id: saleId,
      almazaraId: '',
      date: saleForm.date,
      customerId: saleForm.customerId,
      products: [{
        finishedProductId: stockItem.id,
        lotId: stockItem.lotId,
        format: stockItem.format,
        units: units,
        pricePerUnit: parseFloat(saleForm.price) || 0
      }],
      totalAmount: (parseFloat(saleForm.price) || 0) * units,
      status: 'Completed'
    };

    onProcessSale(newOrder);
    setSaleForm(prev => ({ ...prev, units: '', price: '', selectedProductStockId: '' }));
    alert(`Venta registrada correctamente: ${saleId}`);
  };

  // --- LÓGICA SALIDA ORUJO ---
  const handlePomaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pomaceForm.customerId || !pomaceForm.kg || !pomaceForm.valeNumber) return;

    // Generar ID de Salida Orujo Secuencial VO00X/YY/YY
    const suffix = getCampaignSuffix();
    const nextSeq = pomaceExits.length + 1;
    const exitId = `VO${nextSeq.toString().padStart(3, '0')}/${suffix}`;

    const newExit: PomaceExit = {
      id: exitId, // Usamos el ID como número de documento
      almazaraId: '',
      date: pomaceForm.date,
      customerId: pomaceForm.customerId,
      kg: parseFloat(pomaceForm.kg),
      valeNumber: pomaceForm.valeNumber,
      notes: pomaceForm.notes
    };

    onProcessPomaceExit(newExit);
    setPomaceForm({ customerId: '', date: new Date().toISOString().split('T')[0], kg: '', valeNumber: '', notes: '' });
    alert(`Salida de orujo registrada: ${exitId}`);
  };

  // --- LÓGICA SALIDA GRANEL ---
  const handleBulkAddSource = () => {
    setBulkForm(prev => ({ ...prev, sources: [...prev.sources, { tankId: 0, kg: '' }] }));
  };

  const handleBulkRemoveSource = (index: number) => {
    setBulkForm(prev => ({ ...prev, sources: prev.sources.filter((_, i) => i !== index) }));
  };

  const handleBulkSourceChange = (index: number, field: 'tankId' | 'kg', value: any) => {
    const newSources = [...bulkForm.sources];
    // Si es kg, permitimos string temporalmente para escritura
    newSources[index] = { ...newSources[index], [field]: value };
    setBulkForm(prev => ({ ...prev, sources: newSources }));
  };

  const parseKg = (val: string | number) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      // Reemplazar coma por punto para soporte decimal
      return parseFloat(val.toString().replace(',', '.')) || 0;
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones Explícitas con Alertas
    if (!bulkForm.customerId) return alert("Por favor, selecciona un Cliente Destino.");
    if (!bulkForm.date) return alert("Por favor, selecciona una fecha.");

    // Validar fuentes
    const validSources = bulkForm.sources
        .map(s => ({ tankId: s.tankId, kg: parseKg(s.kg) }))
        .filter(s => s.tankId !== 0 && s.kg > 0);

    if (validSources.length === 0) {
        return alert("Debes indicar al menos un depósito de origen y una cantidad de kilos válida.");
    }

    // Validar Stock
    for (const source of validSources) {
       const tank = tanks.find(t => t.id === source.tankId);
       if (!tank) return alert(`El depósito ID ${source.tankId} no es válido.`);
       if (source.kg > tank.currentKg) {
           return alert(`No hay suficiente aceite en el Depósito ${tank.name}. Solicitado: ${source.kg}kg, Disponible: ${tank.currentKg}kg.`);
       }
    }

    onProcessBulkExit({
        customerId: bulkForm.customerId,
        date: bulkForm.date,
        driver: bulkForm.driver,
        plate: bulkForm.plate,
        seals: bulkForm.seals,
        deliveryNote: bulkForm.deliveryNote,
        sources: validSources
    });

    setBulkForm({
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        driver: '',
        plate: '',
        seals: '',
        deliveryNote: '', // Se regenerará por useEffect
        sources: [{ tankId: 0, kg: '' }]
    });
    alert("Salida a granel registrada correctamente.");
  };

  const totalBulkKg = bulkForm.sources.reduce((acc, curr) => acc + parseKg(curr.kg), 0);

  // --- FILTROS DE CLIENTES ---
  const retailCustomers = customers.filter(c => c.type === CustomerType.MINORISTA || c.type === CustomerType.MAYORISTA);
  const pomaceCustomers = customers.filter(c => c.type === CustomerType.COMPRADOR_ORUJO || c.type === CustomerType.MAYORISTA);
  const bulkCustomers = customers.filter(c => c.type === CustomerType.MAYORISTA); // Clientes para cisternas

  // --- AGRUPACIÓN HISTORIAL CISTERNAS ---
  const groupedBulkExits = useMemo(() => {
      const exits = oilExits.filter(e => e.type === ExitType.CISTERNA);
      const groups: Record<string, OilExit[]> = {};
      
      exits.forEach(e => {
          const key = e.deliveryNote || `UNKNOWN-${e.date}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(e);
      });

      return Object.entries(groups).map(([note, items]) => ({
          note,
          items,
          date: items[0].date,
          customer: items[0].customer_id,
          totalKg: items.reduce((acc, i) => acc + i.kg, 0)
      })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [oilExits]);

  // --- GENERACIÓN PDF ALBARÁN ---
  const handleDownloadPDF = (title: string, note: string, date: string, clientName: string, items: any[]) => {
      if (!window.jspdf) return alert("Librería PDF no cargada.");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(217, 255, 102); // Lime
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 20);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`Nº DOCUMENTO: ${note}`, 14, 30);
      doc.text(`FECHA: ${new Date(date).toLocaleDateString()}`, 150, 30);

      // Datos Cliente
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DESTINATARIO", 14, 55);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Cliente: ${clientName || 'Desconocido'}`, 14, 62);

      // Tabla Contenido (Genérico)
      const tableColumn = ["Concepto / Producto", "Detalle / Lote", "Cantidad"];
      const tableRows = items.map(item => [item.concept, item.detail, item.qty]);

      // @ts-ignore
      doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 85,
          theme: 'grid',
          headStyles: { fillColor: [17, 17, 17], textColor: [217, 255, 102] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold' }
      });

      // Firmas
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      doc.setLineWidth(0.1);
      doc.line(14, finalY, 80, finalY);
      doc.line(120, finalY, 190, finalY);
      doc.setFontSize(8);
      doc.text("Firma y Sello Almazara", 14, finalY + 5);
      doc.text("Firma Cliente / Transportista", 120, finalY + 5);

      doc.save(`Documento_${note.replace(/\//g, '-')}.pdf`);
  };

  const darkSelectClass = "w-full bg-[#000] text-white border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none transition-all";
  const lightSelectClass = "w-full bg-white text-[#111111] border border-gray-200 focus:border-orange-500 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none transition-all shadow-sm";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* HEADER TABS */}
      <div className="bg-white rounded-[32px] p-2 flex flex-wrap border border-gray-100 shadow-sm w-fit">
         <button 
            onClick={() => setActiveTab('packaged')}
            className={`px-6 py-3 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'packaged' ? 'bg-[#111111] text-[#D9FF66] shadow-md' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
         >
            <ShoppingCart size={16} /> Venta Envasado
         </button>
         <button 
            onClick={() => setActiveTab('pomace')}
            className={`px-6 py-3 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'pomace' ? 'bg-[#111111] text-[#D9FF66] shadow-md' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
         >
            <Truck size={16} /> Salida Orujo
         </button>
         <button 
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'bulk' ? 'bg-[#111111] text-[#D9FF66] shadow-md' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
         >
            <Droplets size={16} /> Salida Granel (Cisterna)
         </button>
      </div>

      {/* --- TAB 1: VENTA DE ENVASADO --- */}
      {activeTab === 'packaged' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* STOCK DISPONIBLE */}
           <div className="lg:col-span-12">
              <div className="flex items-center gap-2 mb-4">
                 <Box size={20} className="text-gray-400" />
                 <h3 className="text-lg font-black uppercase text-[#111111]">Stock Disponible para Venta</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {finishedProducts.filter(p => p.unitsAvailable > 0).map(product => (
                    <div 
                        key={product.id} 
                        onClick={() => onViewLot && onViewLot(product.lotId)}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-[#D9FF66] transition-all group cursor-pointer hover:shadow-md"
                    >
                       <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded uppercase text-gray-800">{product.format}</span>
                          <span className={`text-[10px] font-black uppercase ${product.type === 'Filtrado' ? 'text-green-600' : 'text-orange-600'}`}>{product.type}</span>
                       </div>
                       <p className="text-2xl font-black text-[#111111] my-1">{product.unitsAvailable}</p>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">Lote: {product.lotId}</p>
                    </div>
                 ))}
                 {finishedProducts.filter(p => p.unitsAvailable > 0).length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                       <p className="text-xs font-black uppercase">No hay stock disponible</p>
                    </div>
                 )}
              </div>
           </div>

           {/* FORMULARIO DE VENTA */}
           <div className="lg:col-span-5">
              <form onSubmit={handleSaleSubmit} className="bg-[#111111] p-8 rounded-[32px] shadow-2xl space-y-6 border border-white/5">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#D9FF66] rounded-lg text-black"><ShoppingCart size={20} /></div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Nueva Venta</h3>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cliente</label>
                       <div className="relative">
                          <select 
                             required
                             value={saleForm.customerId}
                             onChange={e => setSaleForm({...saleForm, customerId: e.target.value})}
                             className={darkSelectClass}
                          >
                             <option value="" className="text-gray-500">Seleccionar Cliente...</option>
                             {retailCustomers.map(c => (
                                <option key={c.id} value={c.id} className="text-white bg-[#111]">{c.name}</option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Producto (Lote)</label>
                       <div className="relative">
                          <select 
                             required
                             value={saleForm.selectedProductStockId}
                             onChange={e => setSaleForm({...saleForm, selectedProductStockId: e.target.value})}
                             className={darkSelectClass}
                          >
                             <option value="" className="text-gray-500">Seleccionar Producto...</option>
                             {finishedProducts.filter(p => p.unitsAvailable > 0).map(p => (
                                <option key={p.id} value={p.id} className="text-white bg-[#111]">
                                   {p.format} - {p.type} (Lote: {p.lotId}) - Disp: {p.unitsAvailable}
                                </option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cantidad</label>
                          <input 
                             type="number" 
                             required
                             placeholder="0"
                             value={saleForm.units}
                             onChange={e => setSaleForm({...saleForm, units: e.target.value})}
                             className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-lg font-black text-white outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precio / Ud</label>
                          <div className="relative">
                             <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                             <input 
                                type="number" 
                                step="0.01"
                                placeholder="0.00"
                                value={saleForm.price}
                                onChange={e => setSaleForm({...saleForm, price: e.target.value})}
                                className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl pl-8 pr-4 py-3 text-lg font-black text-white outline-none"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha Venta</label>
                       <input 
                          type="date" 
                          required
                          value={saleForm.date}
                          onChange={e => setSaleForm({...saleForm, date: e.target.value})}
                          className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
                       />
                    </div>
                 </div>

                 <button 
                    type="submit"
                    className="w-full py-4 bg-[#D9FF66] hover:bg-[#cbf550] text-black rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95"
                 >
                    Confirmar Venta
                 </button>
              </form>
           </div>

           {/* HISTORIAL RECIENTE ENVASADO */}
           <div className="lg:col-span-7 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-[#F9FAF9]">
                 <h3 className="text-sm font-black uppercase text-[#111111]">Últimas Ventas (Envasado)</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[500px]">
                 <table className="w-full text-left">
                    <thead className="bg-white sticky top-0 z-10">
                       <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Documento</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Fecha</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Cliente</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {salesOrders.slice().reverse().map(order => (
                          <tr key={order.id} onClick={() => setSelectedSaleOrder(order)} className="hover:bg-gray-50 cursor-pointer group">
                             <td className="px-6 py-4">
                                <span className="text-xs font-black text-[#111111] group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                    {order.id} <Search size={12} className="opacity-0 group-hover:opacity-100 text-blue-400" />
                                </span>
                             </td>
                             <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                             <td className="px-6 py-4 text-xs font-black uppercase text-[#111111]">
                                {customers.find(c => c.id === order.customerId)?.name || 'Desconocido'}
                             </td>
                             <td className="px-6 py-4 text-sm font-black text-[#111111] text-right">{order.totalAmount.toLocaleString()}€</td>
                          </tr>
                       ))}
                       {salesOrders.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-xs font-bold text-gray-400 uppercase">Sin ventas registradas</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* --- TAB 2: SALIDA ORUJO --- */}
      {activeTab === 'pomace' && (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
               <form onSubmit={handlePomaceSubmit} className="bg-white p-8 rounded-[32px] shadow-lg space-y-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Truck size={20} /></div>
                     <h3 className="text-xl font-black text-[#111111] uppercase tracking-tighter">Salida de Orujo</h3>
                  </div>

                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Orujera / Cliente</label>
                        <div className="relative">
                           <select 
                              required
                              value={pomaceForm.customerId}
                              onChange={e => setPomaceForm({...pomaceForm, customerId: e.target.value})}
                              className={lightSelectClass}
                           >
                              <option value="">Seleccionar Orujera...</option>
                              {pomaceCustomers.map(c => (
                                 <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                           </select>
                           <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kilos Brutos</label>
                           <input 
                              type="number" 
                              required
                              placeholder="0"
                              value={pomaceForm.kg}
                              onChange={e => setPomaceForm({...pomaceForm, kg: e.target.value})}
                              className="w-full bg-white border border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-lg font-black text-[#111111] outline-none"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº Vale Salida</label>
                           <input 
                              type="text" 
                              required
                              placeholder="V-000"
                              value={pomaceForm.valeNumber}
                              onChange={e => setPomaceForm({...pomaceForm, valeNumber: e.target.value})}
                              className="w-full bg-white border border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-lg font-black text-[#111111] outline-none"
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notas / Matrícula</label>
                        <div className="relative">
                           <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                           <input 
                              type="text" 
                              placeholder="Ej: 1234-BBB Conductor Juan"
                              value={pomaceForm.notes}
                              onChange={e => setPomaceForm({...pomaceForm, notes: e.target.value})}
                              className="w-full bg-white border border-gray-200 focus:border-orange-400 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-[#111111] outline-none"
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Salida</label>
                        <input 
                           type="date" 
                           required
                           value={pomaceForm.date}
                           onChange={e => setPomaceForm({...pomaceForm, date: e.target.value})}
                           className="w-full bg-white border border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none"
                        />
                     </div>
                  </div>

                  <button 
                     type="submit"
                     className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                     <CheckCircle2 size={16} /> Registrar Salida
                  </button>
               </form>
            </div>

            <div className="lg:col-span-7 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
               <div className="p-6 border-b border-gray-100 bg-[#F9FAF9]">
                  <h3 className="text-sm font-black uppercase text-[#111111]">Historial Salidas Orujo</h3>
               </div>
               <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[500px]">
                  <table className="w-full text-left">
                     <thead className="bg-white sticky top-0 z-10">
                        <tr>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Documento</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Fecha</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Orujera</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Kilos</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {pomaceExits.slice().reverse().map(exit => (
                           <tr key={exit.id} onClick={() => setSelectedPomaceExit(exit)} className="hover:bg-gray-50 cursor-pointer group">
                              <td className="px-6 py-4">
                                <span className="text-xs font-black text-[#111111] group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                    {exit.id} <Search size={12} className="opacity-0 group-hover:opacity-100 text-orange-400" />
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(exit.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-xs font-black uppercase text-[#111111]">
                                 {customers.find(c => c.id === exit.customerId)?.name || 'Desconocido'}
                              </td>
                              <td className="px-6 py-4 text-sm font-black text-[#111111] text-right">{exit.kg.toLocaleString()}</td>
                           </tr>
                        ))}
                        {pomaceExits.length === 0 && (
                           <tr><td colSpan={4} className="p-8 text-center text-xs font-bold text-gray-400 uppercase">Sin salidas registradas</td></tr>
                       )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {/* --- TAB 3: SALIDA GRANEL (CISTERNAS) --- */}
      {activeTab === 'bulk' && (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* FORMULARIO */}
            <div className="lg:col-span-5">
                <form onSubmit={handleBulkSubmit} className="bg-[#111111] p-8 rounded-[32px] shadow-2xl space-y-6 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#D9FF66] rounded-lg text-black"><Droplets size={20} /></div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Salida Granel</h3>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/10">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nº ALBARÁN</p>
                            <p className="text-sm font-black text-[#D9FF66] text-right">{bulkForm.deliveryNote}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* CLIENTE */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cliente Destino</label>
                            <div className="relative">
                                <select 
                                    required
                                    value={bulkForm.customerId}
                                    onChange={e => setBulkForm({...bulkForm, customerId: e.target.value})}
                                    className={darkSelectClass}
                                >
                                    <option value="" className="text-gray-500">Seleccionar Cliente...</option>
                                    {bulkCustomers.map(c => (
                                        <option key={c.id} value={c.id} className="text-white bg-[#111]">{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* DATOS TRANSPORTE */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Conductor</label>
                                <input 
                                    type="text" 
                                    placeholder="Nombre"
                                    value={bulkForm.driver}
                                    onChange={e => setBulkForm({...bulkForm, driver: e.target.value})}
                                    className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Matrícula</label>
                                <input 
                                    type="text" 
                                    placeholder="0000-XXX"
                                    value={bulkForm.plate}
                                    onChange={e => setBulkForm({...bulkForm, plate: e.target.value})}
                                    className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precintos</label>
                            <input 
                                type="text" 
                                placeholder="Ej: 123456, 789012"
                                value={bulkForm.seals}
                                onChange={e => setBulkForm({...bulkForm, seals: e.target.value})}
                                className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
                            />
                        </div>

                        {/* FECHA */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha Salida</label>
                            <input 
                                type="date" 
                                required
                                value={bulkForm.date}
                                onChange={e => setBulkForm({...bulkForm, date: e.target.value})}
                                className="w-full bg-[#000] border-2 border-gray-800 focus:border-[#D9FF66] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
                            />
                        </div>

                        {/* ORIGEN MULTI-DEPÓSITO */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Depósitos de Origen (Carga)</label>
                                <button type="button" onClick={handleBulkAddSource} className="text-[#D9FF66] hover:text-white transition-colors">
                                    <Plus size={18} />
                                </button>
                            </div>
                            
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {bulkForm.sources.map((source, index) => {
                                    return (
                                        <div key={index} className="flex gap-2 items-center">
                                            <div className="flex-1 relative">
                                                <select
                                                    value={source.tankId}
                                                    onChange={e => handleBulkSourceChange(index, 'tankId', parseInt(e.target.value))}
                                                    className={darkSelectClass}
                                                >
                                                    <option value={0}>Seleccionar...</option>
                                                    {tanks.filter(t => t.currentKg > 0).map(t => (
                                                        <option key={t.id} value={t.id} className="text-white bg-[#111]">{t.name} ({t.variety_id}) - {t.currentKg.toLocaleString()}kg</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                                            </div>
                                            <div className="w-24 relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Kg" 
                                                    value={source.kg}
                                                    onChange={e => handleBulkSourceChange(index, 'kg', e.target.value)}
                                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#D9FF66]"
                                                />
                                            </div>
                                            {bulkForm.sources.length > 1 && (
                                                <button type="button" onClick={() => handleBulkRemoveSource(index)} className="text-gray-500 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Carga</span>
                                <span className="text-lg font-black text-[#D9FF66]">{totalBulkKg.toLocaleString()} KG</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-4 bg-[#D9FF66] hover:bg-[#cbf550] text-black rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Salida Granel
                    </button>
                </form>
            </div>

            {/* TABLA HISTÓRICA */}
            <div className="lg:col-span-7 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-gray-100 bg-[#F9FAF9] flex justify-between items-center">
                   <h3 className="text-lg font-black uppercase text-[#111111] flex items-center gap-2">
                      <Truck size={20} /> Historial de Cisternas
                   </h3>
                   <p className="text-[10px] text-gray-400 font-medium bg-white px-3 py-1 rounded-full border border-gray-200">
                      Agrupado por Albarán
                   </p>
                </div>
                <div className="overflow-x-auto custom-scrollbar flex-1">
                   <table className="w-full text-left">
                      <thead className="bg-[#F9FAF9] border-b border-gray-100 sticky top-0 z-10">
                         <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Albarán</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Fecha</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Cliente</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Total Kilos</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {groupedBulkExits.map((group, idx) => (
                            <tr 
                                key={idx} 
                                onClick={() => setSelectedBulkExit({ note: group.note, exits: group.items })}
                                className="hover:bg-gray-50 cursor-pointer group transition-all"
                            >
                               <td className="px-6 py-4">
                                   <span className="text-xs font-black text-[#111111] group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                       {group.note}
                                       <Search size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                   </span>
                               </td>
                               <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(group.date).toLocaleDateString()}</td>
                               <td className="px-6 py-4 text-xs font-black uppercase text-[#111111]">
                                  {customers.find(c => c.id === group.customer)?.name || 'Desconocido'}
                               </td>
                               <td className="px-6 py-4 text-sm font-black text-[#111111] text-right">{group.totalKg.toLocaleString()} kg</td>
                            </tr>
                         ))}
                         {groupedBulkExits.length === 0 && (
                            <tr><td colSpan={4} className="p-12 text-center text-xs font-bold text-gray-400 uppercase">No hay ventas a granel registradas</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
            </div>
         </div>
      )}

      {/* MODAL DETALLE CISTERNA (PASAPORTE) */}
      {selectedBulkExit && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PASAPORTE DE SALIDA</p>
                          <h3 className="text-3xl font-black text-[#111111] uppercase tracking-tighter">Albarán {selectedBulkExit.note}</h3>
                      </div>
                      <button onClick={() => setSelectedBulkExit(null)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                      {/* DATOS PRINCIPALES */}
                      <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Cliente Destino</p>
                              <p className="text-lg font-black text-[#111111] uppercase leading-tight">
                                  {customers.find(c => c.id === selectedBulkExit.exits[0].customer_id)?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 font-bold">{customers.find(c => c.id === selectedBulkExit.exits[0].customer_id)?.cif}</p>
                          </div>
                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Datos Transporte</p>
                              <div className="space-y-1">
                                  <p className="text-sm font-bold text-[#111111] flex justify-between"><span>Matrícula:</span> <span>{selectedBulkExit.exits[0].license_plate}</span></p>
                                  <p className="text-sm font-bold text-[#111111] flex justify-between"><span>Conductor:</span> <span>{selectedBulkExit.exits[0].driver_name}</span></p>
                                  <p className="text-xs text-gray-500 mt-2 truncate">Precintos: {selectedBulkExit.exits[0].seals}</p>
                              </div>
                          </div>
                      </div>

                      {/* TRAZABILIDAD ORIGEN */}
                      <div>
                          <h4 className="text-xs font-black text-[#111111] uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Factory size={16} /> Composición de la Carga (Trazabilidad)
                          </h4>
                          <div className="space-y-3">
                              {selectedBulkExit.exits.map((exit, idx) => {
                                  const tank = tanks.find(t => t.id === exit.tank_id);
                                  return (
                                      <div key={idx} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:border-black transition-all">
                                          <div className="flex items-center gap-4">
                                              <div className="w-10 h-10 bg-[#111111] text-[#D9FF66] rounded-xl flex items-center justify-center font-black text-xs">
                                                  D.{exit.tank_id}
                                              </div>
                                              <div>
                                                  <p className="text-sm font-black text-[#111111] uppercase">{tank?.variety_id || 'Variedad Desconocida'}</p>
                                                  <p className="text-[10px] text-gray-400 font-bold uppercase">Lote Origen: {tank?.currentBatchId || 'N/A'}</p>
                                              </div>
                                          </div>
                                          <span className="text-lg font-black text-[#111111]">{exit.kg.toLocaleString()} kg</span>
                                      </div>
                                  );
                              })}
                          </div>
                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                              <span className="text-xs font-bold text-gray-500 uppercase">Total Carga Neta</span>
                              <span className="text-2xl font-black text-[#111111]">
                                  {selectedBulkExit.exits.reduce((acc, e) => acc + e.kg, 0).toLocaleString()} KG
                              </span>
                          </div>
                      </div>

                      <button 
                          onClick={() => handleDownloadPDF('ALBARÁN DE SALIDA (GRANEL)', selectedBulkExit.note, selectedBulkExit.exits[0].date, customers.find(c => c.id === selectedBulkExit.exits[0].customer_id)?.name || '', selectedBulkExit.exits.map(e => ({ concept: `Depósito ${e.tank_id}`, detail: tanks.find(t => t.id === e.tank_id)?.variety_id, qty: e.kg + ' kg' })))}
                          className="w-full py-5 bg-[#111111] text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                          <Download size={18} /> Descargar Albarán Oficial (PDF)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DETALLE VENTA ENVASADO */}
      {selectedSaleOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ALBARÁN DE VENTA</p>
                          <h3 className="text-3xl font-black text-[#111111] uppercase tracking-tighter">{selectedSaleOrder.id}</h3>
                      </div>
                      <button onClick={() => setSelectedSaleOrder(null)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Cliente</p>
                              <p className="text-lg font-black text-[#111111] uppercase leading-tight">
                                  {customers.find(c => c.id === selectedSaleOrder.customerId)?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 font-bold">{customers.find(c => c.id === selectedSaleOrder.customerId)?.cif}</p>
                          </div>
                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Total Operación</p>
                              <p className="text-3xl font-black text-[#111111]">{selectedSaleOrder.totalAmount.toLocaleString()}€</p>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-xs font-black text-[#111111] uppercase tracking-widest mb-4 flex items-center gap-2">
                              <ShoppingCart size={16} /> Artículos
                          </h4>
                          <div className="space-y-3">
                              {selectedSaleOrder.products.map((prod, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl">
                                      <div>
                                          <p className="text-sm font-black text-[#111111]">{prod.format}</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase cursor-pointer hover:text-blue-500" onClick={() => { setSelectedSaleOrder(null); onViewLot && onViewLot(prod.lotId); }}>
                                              Lote: {prod.lotId}
                                          </p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-bold text-[#111111]">{prod.units} uds</p>
                                          <p className="text-[10px] text-gray-500">{prod.pricePerUnit.toFixed(2)}€/ud</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <button 
                          onClick={() => handleDownloadPDF('ALBARÁN DE VENTA (ENVASADO)', selectedSaleOrder.id, selectedSaleOrder.date, customers.find(c => c.id === selectedSaleOrder.customerId)?.name || '', selectedSaleOrder.products.map(p => ({ concept: p.format, detail: `Lote: ${p.lotId}`, qty: `${p.units} uds` })))}
                          className="w-full py-5 bg-[#111111] text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                          <Download size={18} /> Descargar Albarán Oficial (PDF)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DETALLE SALIDA ORUJO */}
      {selectedPomaceExit && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SALIDA DE SUBPRODUCTO</p>
                          <h3 className="text-3xl font-black text-[#111111] uppercase tracking-tighter">Documento {selectedPomaceExit.id}</h3>
                      </div>
                      <button onClick={() => setSelectedPomaceExit(null)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Destino / Orujera</p>
                              <p className="text-lg font-black text-[#111111] uppercase leading-tight">
                                  {customers.find(c => c.id === selectedPomaceExit.customerId)?.name || 'N/A'}
                              </p>
                          </div>
                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Peso Neto</p>
                              <p className="text-3xl font-black text-[#111111]">{selectedPomaceExit.kg.toLocaleString()} KG</p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between p-4 border border-gray-100 rounded-2xl bg-white">
                              <span className="text-xs font-bold text-gray-500 uppercase">Referencia Vale</span>
                              <span className="text-sm font-black text-[#111111]">{selectedPomaceExit.valeNumber}</span>
                          </div>
                          <div className="flex justify-between p-4 border border-gray-100 rounded-2xl bg-white">
                              <span className="text-xs font-bold text-gray-500 uppercase">Notas / Transporte</span>
                              <span className="text-sm font-black text-[#111111]">{selectedPomaceExit.notes}</span>
                          </div>
                      </div>

                      <button 
                          onClick={() => handleDownloadPDF('RETIRADA DE ORUJO', selectedPomaceExit.id, selectedPomaceExit.date, customers.find(c => c.id === selectedPomaceExit.customerId)?.name || '', [{ concept: 'Orujo Graso Húmedo', detail: selectedPomaceExit.notes, qty: `${selectedPomaceExit.kg} kg` }])}
                          className="w-full py-5 bg-[#111111] text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                          <Download size={18} /> Descargar Documento (PDF)
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
