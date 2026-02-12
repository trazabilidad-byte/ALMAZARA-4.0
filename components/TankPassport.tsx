import React, { useMemo } from 'react';
import { Tank, MillingLot, Vale, Producer, OilMovement, OilExit, ExitType, ProductionLot, AppConfig } from '../types';
import {
    X, History, Factory, User, Truck, Package, Download, Lock, RefreshCw, Calculator, ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface TankPassportProps {
    selectedTank: Tank;
    tanks: Tank[];
    millingLots: MillingLot[];
    vales: Vale[];
    producers: Producer[];
    oilMovements: OilMovement[];
    oilExits: OilExit[];
    productionLots: ProductionLot[];
    config: AppConfig; // Nuevo: para obtener currentCampaign
    onClose: () => void;
    // onDownloadPDF is removed as it's now internal

    onCloseTankLot?: (id: number) => void;
    onResetTank?: (id: number) => void;
    onViewLot?: (id: string) => void;
    onViewProductionLot?: (id: string) => void;
    onViewVale?: (v: Vale) => void;
    onViewProducer?: (id: string) => void;
    onViewExit?: (exit: OilExit) => void;
}

export const TankPassport: React.FC<TankPassportProps> = ({
    selectedTank,
    tanks,
    millingLots,
    vales,
    producers,
    oilMovements,
    oilExits,
    productionLots,
    config,
    onClose,

    onCloseTankLot,
    onResetTank,
    onViewLot,
    onViewProductionLot,
    onViewVale,
    onViewProducer,
    onViewExit
}) => {
    // --- LÓGICA DE TRAZABILIDAD ---
    const tankProductionLots = useMemo(() => {
        return productionLots
            .filter(lp => lp.targetTankId === selectedTank.id)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [selectedTank, productionLots]);

    const tankDates = useMemo(() => {
        const dates: number[] = [];

        // 1. Agregar fechas de production lots que van a este tanque
        tankProductionLots.forEach(lp => dates.push(new Date(lp.fecha).getTime()));

        // 2. Agregar fechas de TODAS las entradas de aceite al tanque (oilMovements donde target es este tanque)
        const entries = oilMovements.filter(m => m.target_tank_id === selectedTank.id);
        entries.forEach(e => dates.push(new Date(e.date).getTime()));

        // Si no hay ningún movimiento, usar null en lugar de "hoy"
        if (dates.length === 0) {
            return { start: null, last: null, end: null };
        }

        let startDate = new Date(Math.min(...dates));
        const lastEntryDate = new Date(Math.max(...dates));

        let endDate = null;
        if (selectedTank.status === 'FULL') {
            const closeEvent = oilMovements.find(m => m.id.startsWith(`CLOSURE-${selectedTank.id}`));
            endDate = closeEvent ? new Date(closeEvent.date) : lastEntryDate;
        }

        return { start: startDate, last: lastEntryDate, end: endDate };
    }, [tankProductionLots, selectedTank, oilMovements]);

    const unifiedHistory = useMemo(() => {
        const internal = oilMovements
            .filter(m => m.source_tank_id === selectedTank.id || m.target_tank_id === selectedTank.id)
            .filter(m => m.variety !== 'Venta Granel')
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

        return [...internal, ...exits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

    const getDestinationLabel = (targetId: number | null) => {
        if (targetId === 999) return "Nodriza (Aceite Filtrado)";
        if (targetId === 998) return "Envasadora Directa (Sin Filtrar)";
        if (targetId === 0) return "Venta a Granel / Exterior";
        return `Depósito ${targetId}`;
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const campaign = config.currentCampaign; // Usar campaña actual de la configuración

        doc.setFontSize(18);
        doc.setTextColor(17, 17, 17);
        doc.text(`PASAPORTE DE DEPÓSITO: ${selectedTank.name}`, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Campaña: ${campaign}`, 14, 33);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Resumen de Depósito", 14, 45);
        autoTable(doc, {
            startY: 48,
            head: [['Propiedad', 'Valor']],
            body: [
                ['Variedad', selectedTank.variety_id],
                ['Kilos Actuales', `${selectedTank.currentKg.toLocaleString()} kg`],
                ['Estado', selectedTank.status === 'FULL' ? 'COMPLETO' : 'ABIERT0'],
                ['Última Operación', unifiedHistory.length > 0 ? new Date(unifiedHistory[0].date).toLocaleDateString() : '---']
            ],
            theme: 'striped',
            headStyles: { fillColor: [217, 255, 102], textColor: [0, 0, 0] }
        });

        doc.text("Historial de Movimientos", 14, (doc as any).lastAutoTable.finalY + 15);
        const historyData = unifiedHistory.map(h => [
            new Date(h.date).toLocaleDateString(),
            h.type === 'EXIT_BULK' ? 'Venta Cisterna' : (h.isEntry ? 'Entrada' : 'Salida'),
            h.type === 'EXIT_BULK' ? '---' : getDestinationLabel(h.isEntry ? h.sourceId : h.targetId),
            `${h.isEntry ? '+' : '-'}${h.kg.toLocaleString()} kg`
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 18,
            head: [['Fecha', 'Tipo', 'Origen/Destino', 'Cantidad']],
            body: historyData,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] }
        });

        doc.save(`PASAPORTE_${selectedTank.name}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };


    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-all"><X size={24} /></button>

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
                                <button onClick={handleDownloadPDF} className="bg-gray-100 hover:bg-black hover:text-[#D9FF66] text-gray-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2">
                                    <Download size={14} /> Descargar PDF
                                </button>

                                {onCloseTankLot && selectedTank.status === 'FILLING' && selectedTank.currentKg > 0 && (
                                    <button onClick={() => onCloseTankLot(selectedTank.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2">
                                        <Lock size={14} /> Cerrar Depósito
                                    </button>
                                )}
                                {onResetTank && (selectedTank.status === 'FULL' || selectedTank.currentKg === 0) && (
                                    <button onClick={() => onResetTank(selectedTank.id)} className="bg-[#111111] hover:bg-black text-[#D9FF66] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2">
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
                                            <div
                                                className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors group active:scale-[0.98] md:active:scale-100 touch-manipulation"
                                                onClick={() => onViewProductionLot && onViewProductionLot(lp.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-[#111111] text-white p-1.5 rounded-md"><Calculator size={14} /></div>
                                                    <div>
                                                        <p className="text-xs font-black text-[#111111] uppercase group-hover:text-blue-600 transition-colors underline underline-offset-2 decoration-2 decoration-transparent group-hover:decoration-blue-400">{lp.id}</p>
                                                        <p className="text-[9px] text-gray-500 font-bold">{new Date(lp.fecha).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-[#111111]">{lp.totalRealOilKg.toLocaleString()} kg</span>
                                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 space-y-3">
                                                {containedMTs.map(mt => (
                                                    <div key={mt.id} className="pl-4 border-l-2 border-gray-100">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); if (onViewLot) onViewLot(mt.id); }}
                                                                className="text-[10px] font-black text-gray-600 uppercase flex items-center gap-1 hover:text-blue-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                                                            >
                                                                Lote MT: <span className="text-[#111111] underline underline-offset-2 decoration-gray-300 hover:decoration-blue-400">{mt.id}</span>
                                                            </button>
                                                            <span className="text-[10px] font-bold text-[#111111]">{Math.round(mt.kilos_aceite_real).toLocaleString()} kg</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {mt.vales_ids.map(vid => (
                                                                <button key={vid} onClick={(e) => { e.stopPropagation(); const v = vales.find(x => x.id_vale === vid); if (v && onViewVale) onViewVale(v); }} className="text-[9px] font-bold bg-white text-[#111111] border border-gray-300 px-2 py-1 rounded hover:bg-black hover:text-[#D9FF66] transition-colors active:scale-90">#{vid}</button>
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

                        {tankDates.start && (
                            <div className={`ml-4 p-4 rounded-2xl border relative shadow-sm mb-4 ${selectedTank.status === 'FULL' ? 'bg-red-100 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white ${selectedTank.status === 'FULL' ? 'bg-red-500 ring-4 ring-red-100' : 'bg-green-500 ring-4 ring-green-100'}`}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <p className={`text-xs font-black uppercase flex items-center gap-1 ${selectedTank.status === 'FULL' ? 'text-black' : 'text-green-700'}`}>
                                        {selectedTank.status === 'FULL' ? <><Lock size={14} /> DEPÓSITO CERRADO / COMPLETO</> : <><CheckCircle2 size={14} /> DEPÓSITO ABIERTO - RECEPCIONANDO</>}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div><p className="text-[9px] font-black text-gray-400 uppercase">Fecha Inicio</p><p className={`text-sm font-black ${selectedTank.status === 'FULL' ? 'text-black' : 'text-[#111111]'}`}>{tankDates.start ? tankDates.start.toLocaleDateString() : '---'}</p></div>
                                    <div><p className="text-[9px] font-black text-gray-400 uppercase">Fecha Cierre</p><p className={`text-sm font-black ${selectedTank.status === 'FULL' ? 'text-black' : 'text-[#111111]'}`}>{selectedTank.status === 'FULL' && tankDates.end ? tankDates.end.toLocaleDateString() : '---'}</p></div>
                                </div>
                            </div>
                        )}

                        {unifiedHistory.length > 0 ? (
                            <div className="relative border-l-2 border-gray-100 ml-2 space-y-4 py-2">
                                {unifiedHistory.map((mov, idx) => {
                                    if (mov.isClosure && selectedTank.currentKg === 0) return null;
                                    if (mov.isClosure && mov.closureDetails) {
                                        return (
                                            <div key={`closure-${idx}`} className="ml-4 bg-gray-50 border border-gray-200 p-4 rounded-2xl relative shadow-sm opacity-70">
                                                <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white bg-gray-400"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-xs font-black uppercase text-gray-600 flex items-center gap-1"><Lock size={14} /> Cierre Lote Anterior</p>
                                                    <span className="text-[9px] font-bold text-gray-500">{new Date(mov.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500">Volumen Consolidado: <span className="font-black text-[#111111]">{mov.closureDetails.totalKgConsolidated.toLocaleString()} KG</span></p>
                                            </div>
                                        )
                                    }

                                    const isEntry = mov.isEntry;
                                    const isBulkExit = mov.type === 'EXIT_BULK';
                                    const isInternalSpecial = mov.targetId === 999 || mov.targetId === 998;

                                    return (
                                        <div key={`${mov.type}-${mov.id}-${idx}`} className="ml-4 relative group">
                                            <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${isEntry ? 'bg-green-500' : isBulkExit ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                                            <div onClick={() => { if (isBulkExit && onViewExit) onViewExit(mov.detail); else if (mov.type === 'INTERNAL' && mov.batchId && onViewLot) onViewLot(mov.batchId); }} className={`p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all ${isBulkExit ? 'bg-blue-50 border-blue-100' : (isInternalSpecial || (!isEntry && mov.type === 'INTERNAL')) ? 'bg-orange-50 border-orange-100' : 'bg-[#F9FAF9] border-gray-100'}`}>
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-[10px] font-black uppercase mb-1 ${isEntry ? 'text-green-600' : isBulkExit ? 'text-blue-700' : 'text-orange-600'}`}>
                                                        {isEntry ? 'Entrada Aceite' : isBulkExit ? 'Venta por Cisterna' : (mov.targetId === 999 ? 'Salida a Nodriza' : mov.targetId === 998 ? 'Envasado Sin Filtrar' : 'Salida por Trasiego')}
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
    );
};
