
import React, { useState, useMemo, useEffect } from 'react';
import { Tank, MillingLot, Vale, Producer, OliveVariety, OilMovement, OilExit, ExitType, ProductionLot } from '../types';
import { 
  ArrowRightLeft, AlertTriangle, Info, Droplets, ArrowRight, 
  X, History, Scale, FileText, CheckCircle2, Factory, User, Search, Truck, Package, RotateCcw, Lock, ChevronDown, RefreshCw, Calculator
} from 'lucide-react';

interface CellarDashboardProps {
  tanks: Tank[];
  millingLots: MillingLot[];
  vales: Vale[];
  producers: Producer[];
  oilMovements: OilMovement[];
  oilExits?: OilExit[];
  productionLots?: ProductionLot[]; 
  initialSelectedTankId?: number | null;
  onTransfer: (data: { sourceTankId: number, targetTankId: number, kg: number, date: string }) => void;
  onResetTank: (tankId: number) => void; 
  onCloseTankLot?: (tankId: number) => void; 
  onViewLot?: (lotId: string) => void;
  onViewProductionLot?: (lpId: string) => void; // Nuevo callback para navegar a Tanda
  onViewVale?: (vale: Vale) => void;
  onViewProducer?: (producerId: string) => void;
  onViewExit?: (exit: OilExit) => void;
}

export const CellarDashboard: React.FC<CellarDashboardProps> = ({ 
  tanks, 
  millingLots, 
  vales, 
  producers,
  oilMovements,
  oilExits = [],
  productionLots = [],
  initialSelectedTankId,
  onTransfer,
  onResetTank,
  onCloseTankLot,
  onViewLot,
  onViewProductionLot,
  onViewVale,
  onViewProducer,
  onViewExit
}) => {
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    sourceId: '',
    targetId: '',
    kg: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
      if (initialSelectedTankId) {
          const t = tanks.find(x => x.id === initialSelectedTankId);
          if (t) setSelectedTank(t);
      }
  }, [initialSelectedTankId, tanks]);

  // Actualizar el selectedTank cuando cambian los props (para reflejar reset/cierre)
  useEffect(() => {
      if (selectedTank) {
          const updated = tanks.find(t => t.id === selectedTank.id);
          if (updated) setSelectedTank(updated);
      }
  }, [tanks]);

  // --- LÓGICA DE TRAZABILIDAD ---
  const tankProductionLots = useMemo(() => {
    if (!selectedTank) return [];
    return productionLots
        .filter(lp => lp.targetTankId === selectedTank.id)
        .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [selectedTank, productionLots]);

  // 2. Calcular Fechas Clave
  const tankDates = useMemo(() => {
      if (!selectedTank) return { start: null, end: null, last: null };
      
      // Intentar obtener fechas de movimientos o lotes
      const dates = tankProductionLots.map(lp => new Date(lp.fecha).getTime());
      
      // Si no hay lotes de producción, buscar en movimientos de entrada
      if (dates.length === 0) {
          const entries = oilMovements.filter(m => m.target_tank_id === selectedTank.id);
          entries.forEach(e => dates.push(new Date(e.date).getTime()));
      }

      let startDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const lastEntryDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      
      // Fecha fin: Si está FULL, es la fecha de cierre (último movimiento o hoy si acaba de cerrar)
      let endDate = null;
      if (selectedTank.status === 'FULL') {
          // Buscar si hay un evento de cierre explícito, si no usar el último movimiento
          const closeEvent = oilMovements.find(m => m.id.startsWith(`CLOSURE-${selectedTank.id}`));
          endDate = closeEvent ? new Date(closeEvent.date) : lastEntryDate; 
          // Fallback a hoy si no encuentra nada y está FULL (caso borde recién cerrado)
          if (!closeEvent && dates.length === 0) endDate = new Date();
      }

      return { start: startDate, last: lastEntryDate, end: endDate };
  }, [tankProductionLots, selectedTank, oilMovements]);

  // HISTORIAL UNIFICADO
  const unifiedHistory = useMemo(() => {
    if (!selectedTank) return [];

    const internal = oilMovements
        .filter(m => m.source_tank_id === selectedTank.id || m.target_tank_id === selectedTank.id)
        .map(m => ({
            id: m.id,
            date: m.date,
            kg: m.kg,
            type: 'INTERNAL',
            isEntry: m.target_tank_id === selectedTank.id,
            isClosure: m.source_tank_id === m.target_tank_id && m.closureDetails,
            sourceId: m.source_tank_id,
            targetId: m.target_tank_id,
            batchId: m.batch_id,
            closureDetails: m.closureDetails,
            detail: null as any
        }));

    const exits = oilExits
        .filter(e => e.tank_id === selectedTank.id && e.type === ExitType.CISTERNA)
        .map(e => ({
            id: e.id,
            date: e.date,
            kg: e.kg,
            type: 'EXIT_BULK',
            isEntry: false,
            isClosure: false,
            sourceId: selectedTank.id,
            targetId: null,
            batchId: undefined,
            closureDetails: undefined,
            detail: e
        }));

    return [...internal, ...exits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedTank, oilMovements, oilExits]);

  const uniqueProducers = useMemo(() => {
    const producerIds = new Set<string>();
    tankProductionLots.forEach(lp => {
        const mts = millingLots.filter(m => lp.millingLotsIds.includes(m.id));
        mts.forEach(mt => {
            mt.vales_ids.forEach(vid => {
                const v = vales.find(x => x.id_vale === vid);
                if (v) producerIds.add(v.productor_id);
            });
        });
    });
    return producers.filter(p => producerIds.has(p.id));
  }, [tankProductionLots, millingLots, vales, producers]);

  // --- HANDLERS ---

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.sourceId || !transferData.targetId || !transferData.kg) return;
    
    const kg = parseFloat(transferData.kg);
    const source = tanks.find(t => t.id === parseInt(transferData.sourceId));
    const target = tanks.find(t => t.id === parseInt(transferData.targetId));

    if (!source || !target) return;
    if (kg > source.currentKg) return alert("No hay suficiente aceite en el origen.");
    if ((target.currentKg + kg) > target.maxCapacityKg) return alert("El destino se desbordaría.");
    
    if (target.currentKg > 0 && target.variety_id !== source.variety_id) {
        if (!confirm(`ADVERTENCIA: Vas a mezclar ${source.variety_id} con ${target.variety_id}. ¿Continuar?`)) return;
    }

    onTransfer({
        sourceTankId: parseInt(transferData.sourceId),
        targetTankId: parseInt(transferData.targetId),
        kg,
        date: transferData.date
    });
    setShowTransferModal(false);
    setTransferData({ sourceId: '', targetId: '', kg: '', date: new Date().toISOString().split('T')[0] });
  };

  const getDestinationLabel = (targetId: number | null) => {
      if (targetId === 999) return "Envasadora / Nodriza";
      return `Depósito ${targetId}`;
  };

  const handleCloseLot = () => {
      if (selectedTank && onCloseTankLot) {
          if (confirm(`¿CERRAR LOTE EN DEPÓSITO ${selectedTank.name}?\n\nAl cerrar el depósito:\n1. El estado pasará a 'CERRADO' (Rojo).\n2. Se bloqueará la entrada de nuevas tandas.\n3. Se registrará la fecha de fin de lote (HOY).\n\n¿Confirmar cierre?`)) {
              onCloseTankLot(selectedTank.id);
          }
      }
  };

  const handleResetTank = () => {
      if (selectedTank && onResetTank) {
          if (confirm(`¿REINICIAR DEPÓSITO ${selectedTank.name}?\n\nEsta acción:\n1. Pondrá el contador de Kilos a 0.\n2. Abrirá el depósito (Estado Verde) para recibir nueva producción.\n3. Archivará el ciclo anterior.\n\n¿Estás seguro de que el depósito está vacío y listo?`)) {
              onResetTank(selectedTank.id);
          }
      }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 relative">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
           <h2 className="text-3xl font-black uppercase text-[#111111]">Bodega</h2>
           <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><div className="w-3 h-3 rounded-full bg-[#D9FF66]"></div><span>Ocupado</span></div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><div className="w-3 h-3 rounded-full bg-white border border-gray-200"></div><span>Libre</span></div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div><span>Alerta &gt;95%</span></div>
           </div>
        </div>
        <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-3 bg-[#111111] text-[#D9FF66] px-8 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10">
           <ArrowRightLeft size={18} /> Nuevo Trasiego
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6">
         {tanks.map(tank => {
            const percentage = (tank.currentKg / tank.maxCapacityKg) * 100;
            const isCritical = percentage >= 95;
            const isEmpty = tank.currentKg === 0;
            const isFullStatus = tank.status === 'FULL';

            return (
               <div 
                 key={tank.id} 
                 onClick={() => setSelectedTank(tank)}
                 className={`group relative bg-white rounded-[32px] overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${isCritical ? 'border-red-500' : isFullStatus ? 'border-red-200' : 'border-transparent hover:border-[#D9FF66]'}`}
               >
                  <div className="absolute inset-0 bg-[#F9FAF9] z-0">
                     <div className={`absolute bottom-0 w-full transition-all duration-1000 ease-in-out ${isCritical ? 'bg-red-500' : isFullStatus ? 'bg-red-100' : 'bg-[#D9FF66]'}`} style={{ height: `${percentage}%`, opacity: isEmpty ? 0 : 1 }}>
                        <div className="absolute top-0 w-full h-2 bg-white/20"></div>
                     </div>
                  </div>
                  <div className="relative z-10 p-6 h-full flex flex-col justify-between min-h-[280px]">
                     <div className="flex justify-between items-start">
                        <span className={`text-xl font-black uppercase tracking-tighter ${isCritical ? 'text-white' : 'text-[#111111]'}`}>{tank.name}</span>
                        {isCritical && <AlertTriangle className="text-white animate-bounce" size={20} />}
                        {isFullStatus && !isCritical && <Lock className="text-[#111111]" size={18} />}
                     </div>
                     <div className="space-y-1">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80 ${isCritical ? 'text-white' : 'text-gray-500'}`}>{isEmpty ? 'DISPONIBLE' : tank.variety_id}</p>
                        <p className={`text-3xl font-black tracking-tighter ${isCritical ? 'text-white' : 'text-[#111111]'}`}>{Math.round(percentage)}%</p>
                        <p className={`text-xs font-bold ${isCritical ? 'text-white/90' : 'text-gray-600'}`}>{tank.currentKg.toLocaleString()} KG</p>
                        {isFullStatus && <p className="text-[9px] font-black text-white bg-black px-2 py-1 rounded inline-block uppercase">CERRADO</p>}
                     </div>
                     <div className={`pt-4 border-t ${isCritical ? 'border-white/20' : 'border-gray-200/50'}`}>
                        <div className={`flex justify-between items-center ${isCritical ? 'text-white' : 'text-[#111111]'}`}>
                           <span className="text-[9px] font-black uppercase opacity-70">Capacidad</span>
                           <span className="text-[9px] font-black">{tank.maxCapacityKg.toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>

      {/* PANEL LATERAL */}
      {selectedTank && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTank(null)}></div>
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
               <button onClick={() => setSelectedTank(null)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-all"><X size={24} /></button>

               <div className="mt-8 space-y-8">
                  {/* HEADER DEPÓSITO */}
                  <div>
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PASAPORTE DEL DEPÓSITO</span>
                     <h2 className="text-5xl font-black text-[#111111] uppercase tracking-tighter mb-2">{selectedTank.name}</h2>
                     <div className="flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[#111111] text-[#D9FF66] text-xs font-black uppercase rounded-lg">
                            {selectedTank.currentKg > 0 ? selectedTank.variety_id : 'VACÍO'}
                            </span>
                            <span className="text-xl font-black text-[#111111]">
                            {selectedTank.currentKg.toLocaleString()} <span className="text-sm text-gray-400">KG</span>
                            </span>
                        </div>
                        
                        <div className="flex gap-2">
                            {/* BOTÓN CERRAR: Solo si está ABIERTO y TIENE ACEITE */}
                            {selectedTank.status === 'FILLING' && selectedTank.currentKg > 0 && (
                                <button 
                                    onClick={handleCloseLot}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                                >
                                    <Lock size={14} /> Cerrar Depósito
                                </button>
                            )}

                            {/* BOTÓN REINICIAR: Solo si está CERRADO o VACÍO */}
                            {(selectedTank.status === 'FULL' || selectedTank.currentKg === 0) && (
                                <button 
                                    onClick={handleResetTank}
                                    className="bg-[#111111] hover:bg-black text-[#D9FF66] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                                >
                                    <RefreshCw size={14} /> Reiniciar / Nuevo Llenado
                                </button>
                            )}
                        </div>
                     </div>
                  </div>

                  {/* JERARQUÍA TRAZABILIDAD */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Factory size={18} className="text-[#111111]" />
                        <h3 className="text-sm font-black uppercase text-[#111111]">Trazabilidad de Entrada</h3>
                     </div>
                     {tankProductionLots.length > 0 ? (
                        <div className="space-y-4">
                           {tankProductionLots.map(lp => {
                               const containedMTs = millingLots.filter(m => lp.millingLotsIds.includes(m.id));
                               return (
                                  <div key={lp.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                     {/* HEADER LOTE PRODUCCIÓN CLICABLE (CORREGIDO) */}
                                     <div 
                                        className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors group" 
                                        onClick={() => onViewProductionLot && onViewProductionLot(lp.id)}
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className="bg-[#111111] text-white p-1.5 rounded-md"><Calculator size={14} /></div>
                                             <div>
                                                 <p className="text-xs font-black text-[#111111] uppercase group-hover:text-blue-600 transition-colors underline-offset-2 group-hover:underline">
                                                     {lp.id}
                                                 </p>
                                                 <p className="text-[9px] text-gray-500 font-bold">{new Date(lp.fecha).toLocaleDateString()}</p>
                                             </div>
                                         </div>
                                         <span className="text-sm font-black text-[#111111]">{lp.totalRealOilKg.toLocaleString()} kg</span>
                                     </div>
                                     
                                     {/* LOTES MT INTERNOS */}
                                     <div className="bg-white p-3 space-y-3">
                                         {containedMTs.map(mt => (
                                             <div key={mt.id} className="pl-4 border-l-2 border-gray-100">
                                                 <div className="flex justify-between items-center mb-1">
                                                     <p className="text-[10px] font-black text-gray-600 uppercase flex items-center gap-1">Lote MT: <span className="text-[#111111]">{mt.id}</span></p>
                                                     <span className="text-[10px] font-bold text-[#111111]">{Math.round(mt.kilos_aceite_real).toLocaleString()} kg</span>
                                                 </div>
                                                 <div className="flex flex-wrap gap-1 mt-1">
                                                     {mt.vales_ids.map(vid => (
                                                         <button key={vid} onClick={(e) => { e.stopPropagation(); const v = vales.find(x => x.id_vale === vid); if(v && onViewVale) onViewVale(v); }} className="text-[9px] font-bold bg-white text-[#111111] border border-gray-300 px-1.5 py-0.5 rounded hover:bg-black hover:text-[#D9FF66] transition-colors">#{vid}</button>
                                                     ))}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                  </div>
                               );
                           })}
                        </div>
                     ) : (
                        <p className="text-xs text-gray-400 italic">No hay lotes de producción (tandas) registrados en este depósito.</p>
                     )}
                  </div>

                  {/* PRODUCTORES */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-b border-gray-100 pb-2"><User size={18} className="text-[#111111]" /><h3 className="text-sm font-black uppercase text-[#111111]">Productores Origen</h3></div>
                     <div className="flex flex-wrap gap-2">
                        {uniqueProducers.map(p => (
                           <div key={p.id} onClick={() => onViewProducer && onViewProducer(p.id)} className="flex items-center gap-2 bg-[#111111] border border-black px-3 py-2 rounded-xl shadow-md cursor-pointer hover:scale-105 transition-transform active:scale-95">
                              <div className="w-6 h-6 rounded-full bg-[#D9FF66] text-black flex items-center justify-center text-[10px] font-black shrink-0">{p.name.charAt(0)}</div>
                              <div className="overflow-hidden"><p className="text-[10px] font-black uppercase leading-none text-white truncate max-w-[120px]">{p.name}</p><p className="text-[8px] text-gray-400 truncate">{p.municipality}</p></div>
                           </div>
                        ))}
                        {uniqueProducers.length === 0 && <p className="text-xs text-gray-400 italic">Sin información de productores.</p>}
                     </div>
                  </div>

                  {/* HISTORIAL MOVIMIENTOS + ESTADO */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 border-b border-gray-100 pb-2"><History size={18} className="text-[#111111]" /><h3 className="text-sm font-black uppercase text-[#111111]">Historial de Movimientos</h3></div>
                     
                     {/* TARJETA DE ESTADO DINÁMICO */}
                     {tankDates.start && (
                         <div className={`ml-4 p-4 rounded-2xl border relative shadow-sm mb-4 ${selectedTank.status === 'FULL' ? 'bg-red-100 border-red-200' : 'bg-green-50 border-green-200'}`}>
                             <div className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white ${selectedTank.status === 'FULL' ? 'bg-red-500 ring-4 ring-red-100' : 'bg-green-500 ring-4 ring-green-100'}`}></div>
                             <div className="flex justify-between items-start mb-2">
                                 <p className={`text-xs font-black uppercase flex items-center gap-1 ${selectedTank.status === 'FULL' ? 'text-black' : 'text-green-700'}`}>
                                     {selectedTank.status === 'FULL' ? <><Lock size={14} /> DEPÓSITO CERRADO / COMPLETO</> : <><CheckCircle2 size={14} /> DEPÓSITO ABIERTO - RECEPCIONANDO</>}
                                 </p>
                             </div>
                             <div className="grid grid-cols-2 gap-4 mt-2">
                                 <div>
                                     <p className="text-[9px] font-black text-gray-400 uppercase">Fecha Inicio</p>
                                     <p className={`text-sm font-black ${selectedTank.status === 'FULL' ? 'text-black' : 'text-[#111111]'}`}>{tankDates.start.toLocaleDateString()}</p>
                                 </div>
                                 <div>
                                     <p className="text-[9px] font-black text-gray-400 uppercase">Fecha Cierre</p>
                                     <p className={`text-sm font-black ${selectedTank.status === 'FULL' ? 'text-black' : 'text-[#111111]'}`}>
                                         {selectedTank.status === 'FULL' && tankDates.end ? tankDates.end.toLocaleDateString() : '---'}
                                     </p>
                                 </div>
                             </div>
                         </div>
                     )}

                     {unifiedHistory.length > 0 ? (
                        <div className="relative border-l-2 border-gray-100 ml-2 space-y-4 py-2">
                           {unifiedHistory.map((mov, idx) => {
                              // Ocultar Cierres Anteriores si el tanque está vacío o recién reiniciado (es decir, mostrar solo si es relevante para el ciclo actual)
                              if (mov.isClosure && selectedTank.currentKg === 0) return null;

                              if (mov.isClosure && mov.closureDetails) {
                                  return (
                                      <div key={`closure-${idx}`} className="ml-4 bg-gray-50 border border-gray-200 p-4 rounded-2xl relative shadow-sm opacity-70">
                                          <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white bg-gray-400"></div>
                                          <div className="flex justify-between items-start mb-2">
                                              <p className="text-xs font-black uppercase text-gray-600 flex items-center gap-1"><Lock size={14} /> Cierre Lote Anterior</p>
                                              <span className="text-[9px] font-bold text-gray-500">{new Date(mov.date).toLocaleDateString()}</p>
                                          </div>
                                          <p className="text-[10px] text-gray-500">Volumen Consolidado: <span className="font-black text-[#111111]">{mov.closureDetails.totalKgConsolidated.toLocaleString()} KG</span></p>
                                      </div>
                                  )
                              }

                              const isEntry = mov.isEntry;
                              const isBulkExit = mov.type === 'EXIT_BULK';
                              return (
                                 <div key={`${mov.type}-${mov.id}-${idx}`} className="ml-4 relative group">
                                    <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${isEntry ? 'bg-green-500' : isBulkExit ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                                    <div 
                                        onClick={() => {
                                            if (isBulkExit && onViewExit) onViewExit(mov.detail);
                                            else if (mov.type === 'INTERNAL' && mov.batchId && onViewLot) onViewLot(mov.batchId);
                                        }}
                                        className={`p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all ${isBulkExit ? 'bg-blue-50 border-blue-100' : 'bg-[#F9FAF9] border-gray-100'}`}
                                    >
                                       <div className="flex justify-between items-start">
                                          <p className={`text-[10px] font-black uppercase mb-1 ${isEntry ? 'text-green-600' : isBulkExit ? 'text-blue-700' : 'text-orange-600'}`}>
                                             {isEntry ? 'Entrada por Trasiego' : isBulkExit ? 'Venta por Cisterna' : 'Salida por Trasiego'}
                                          </p>
                                          <span className="text-[9px] font-bold text-gray-400">{new Date(mov.date).toLocaleDateString()}</span>
                                       </div>
                                       <p className="text-sm font-black text-[#111111] group-hover:underline">{isEntry ? '+' : '-'}{mov.kg.toLocaleString()} KG</p>
                                       {isBulkExit ? (
                                           <div className="mt-1 space-y-0.5">
                                               <p className="text-[10px] text-gray-600 font-bold flex items-center gap-1"><Truck size={10} /> Matrícula: {mov.detail.license_plate}</p>
                                               <p className="text-[9px] text-gray-500">Destino: Cliente Externo</p>
                                           </div>
                                       ) : (
                                           <div className="mt-1">
                                              <p className="text-[10px] text-gray-500 font-bold group-hover:text-[#111111] transition-colors flex items-center gap-1">
                                                  {isEntry ? <><ArrowRight size={10} className="rotate-180" /> Origen: {getDestinationLabel(mov.sourceId)}</> : <><ArrowRight size={10} /> Destino: {getDestinationLabel(mov.targetId)}</>}
                                              </p>
                                              {mov.batchId && <div className="mt-2 pt-2 border-t border-gray-200"><span className="inline-flex items-center gap-1 bg-[#111111] text-[#D9FF66] px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider"><Package size={10} /> Lote Generado: {mov.batchId}</span></div>}
                                           </div>
                                       )}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <p className="text-xs text-gray-400 italic">Sin movimientos registrados.</p>
                     )}
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* MODAL TRASIEGO */}
      {showTransferModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MOVIMIENTO INTERNO</p><h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Nuevo Trasiego</h3></div>
                  <button onClick={() => setShowTransferModal(false)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
               </div>
               <form onSubmit={handleTransferSubmit} className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Origen</label>
                        <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-bold text-[#111111] outline-none focus:border-[#D9FF66] transition-all" value={transferData.sourceId} onChange={(e) => setTransferData({...transferData, sourceId: e.target.value})} required>
                           <option value="">Seleccionar...</option>
                           {tanks.filter(t => t.currentKg > 0).map(t => <option key={t.id} value={t.id}>{t.name} ({t.variety_id})</option>)}
                        </select>
                     </div>
                     <div className="pt-6 text-gray-300"><ArrowRight size={20} /></div>
                     <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Destino</label>
                        <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-bold text-[#111111] outline-none focus:border-[#D9FF66] transition-all" value={transferData.targetId} onChange={(e) => setTransferData({...transferData, targetId: e.target.value})} required>
                           <option value="">Seleccionar...</option>
                           {tanks.filter(t => t.id.toString() !== transferData.sourceId).map(t => <option key={t.id} value={t.id}>{t.name} {t.currentKg > 0 ? `(${t.variety_id})` : '(Vacío)'}</option>)}
                        </select>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cantidad (KG)</label>
                     <div className="relative">
                        <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="number" value={transferData.kg} onChange={(e) => setTransferData({...transferData, kg: e.target.value})} className="w-full bg-[#111111] text-white border-2 border-transparent focus:border-[#D9FF66] rounded-2xl pl-12 pr-4 py-4 text-xl font-black outline-none transition-all" placeholder="0.00" required />
                     </div>
                     {transferData.sourceId && <p className="text-[10px] text-gray-500 text-right">Disponible: <span className="font-bold text-[#111111]">{tanks.find(t => t.id.toString() === transferData.sourceId)?.currentKg.toLocaleString()} kg</span></p>}
                  </div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha</label><input type="date" value={transferData.date} onChange={(e) => setTransferData({...transferData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none" required /></div>
                  <button type="submit" className="w-full bg-[#D9FF66] text-black py-5 rounded-[24px] font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl">Confirmar Movimiento</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};
