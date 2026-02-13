
import React, { useState, useMemo, useEffect } from 'react';
import { Hopper, Vale, Tank, MillingLot, AppConfig, ProductionLot, ValeType } from '../types';
import { Factory, CheckCircle2, X, Activity, ExternalLink, Layers, FileText, User, Calculator, ChevronDown, ChevronUp, AlertTriangle, Download, Play, ArrowRight, Database, Clock } from 'lucide-react';
import { MillingDayClose } from './MillingDayClose';

interface MillingControlProps {
    hoppers: Hopper[];
    pendingVales: Vale[];
    allVales?: Vale[];
    tanks: Tank[];
    millingLots: MillingLot[];
    productionLots?: ProductionLot[];
    appConfig?: AppConfig;
    initialViewProductionLotId?: string | null;
    onProcessLot: (data: { hopperId: number, uso: number, realOil: number, targetTankId: number, date: string }) => void;
    onViewLotDetail?: (lotId: string) => void;
    onViewValeDetails: (vale: Vale) => void;
    onDayClose?: (data: { selectedLotIds: string[], totalRealOil: number, targetTankId: number, notes: string, productionDate: string, mergeWithLpId?: string }) => void;
}

export const MillingControl: React.FC<MillingControlProps> = ({
    hoppers,
    pendingVales,
    allVales = [],
    tanks,
    millingLots,
    productionLots = [],
    appConfig,
    initialViewProductionLotId,
    onProcessLot,
    onViewLotDetail,
    onViewValeDetails,
    onDayClose
}) => {
    const [viewingProductionLot, setViewingProductionLot] = useState<ProductionLot | null>(null);
    const [showDayCloseModal, setShowDayCloseModal] = useState(false);

    useEffect(() => {
        if (initialViewProductionLotId) {
            const lp = productionLots.find(p => p.id === initialViewProductionLotId);
            if (lp) setViewingProductionLot(lp);
        }
    }, [initialViewProductionLotId, productionLots]);

    // --- LÓGICA DE COLAS DE TOLVA ---
    const activeHoppersData = useMemo(() => {
        return hoppers.map(h => {
            // CRÍTICO: Filtrar vales que YA han sido asignados a un lote de molturación (tienen ID)
            // Esto vacía la tolva visualmente inmediatamente después de pulsar "MOLTURAR"
            // aunque el vale siga en estado PENDIENTE hasta el cierre del día.
            const hopperVales = pendingVales.filter(v =>
                Number(v.ubicacion_id) === Number(h.id) &&
                v.tipo_vale === ValeType.MOLTURACION &&
                !v.milling_lot_id // <--- FIX: Si ya tiene lote asignado, no está en la tolva física
            );

            if (hopperVales.length === 0) return { ...h, status: 'empty', activeBatch: null, queuedBatches: [] };

            // Agrupar por 'uso_contador' (Lote de entrada)
            const usages = Array.from(new Set(hopperVales.map(v => v.uso_contador))).sort((a, b) => Number(a) - Number(b));

            const batches = usages.map(uso => {
                const batchVales = hopperVales.filter(v => v.uso_contador === uso);
                const totalKg = batchVales.reduce((acc, v) => acc + v.kilos_netos, 0);

                // Teórico (Prioridad: Lab > Config > Default 18%)
                const theoreticalOil = batchVales.reduce((acc, v) => {
                    let yieldPercent = v.analitica.rendimiento_graso;
                    if (!yieldPercent || yieldPercent === 0) {
                        yieldPercent = appConfig?.varietySettings?.[v.variedad]?.defaultYield || 18;
                    }
                    return acc + (v.kilos_netos * yieldPercent / 100);
                }, 0);

                const avgYield = totalKg > 0 ? (theoreticalOil / totalKg) * 100 : 0;

                return {
                    uso,
                    vales: batchVales,
                    totalKg,
                    theoreticalOil,
                    avgYield,
                    variety: batchVales[0].variedad
                };
            });

            // El primer lote es el ACTIVO, el resto están en COLA
            const activeBatch = batches[0];
            const queuedBatches = batches.slice(1);

            return { ...h, status: 'active', activeBatch, queuedBatches };
        });
    }, [hoppers, pendingVales, appConfig]);

    // --- LÓGICA LOTES EN PROCESO (MT) ---
    const openMillingLots = useMemo(() => {
        // Lotes que tienen aceite real a 0 (están procesándose y no se han cerrado en una tanda)
        return millingLots.filter(mt => mt.kilos_aceite_real === 0).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [millingLots]);

    const handleQuickCreate = (batch: any, hopperId: number) => {
        if (!batch || !batch.uso) return;
        onProcessLot({
            hopperId: hopperId,
            uso: batch.uso,
            realOil: 0,
            targetTankId: 0,
            date: new Date().toISOString()
        });
    };

    // --- PDF GENERATION ---
    const generateProductionLotPDF = (lp: ProductionLot, containedLots: MillingLot[]) => {
        if (!window.jspdf) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(17, 17, 17);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(217, 255, 102);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("INFORME DE TANDA (HISTÓRICO)", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(appConfig?.companyName.toUpperCase() || "ALMAZARA", 14, 28);
        doc.text(`ID Tanda: ${lp.id}`, 150, 20);
        doc.text(`Fecha: ${new Date(lp.fecha).toLocaleDateString()}`, 150, 28);

        // Resumen
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RESUMEN DE PRODUCCIÓN", 14, 55);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const tankName = tanks.find(t => t.id === lp.targetTankId)?.name || 'Desconocido';
        doc.text(`Aceituna Procesada: ${lp.totalOliveKg.toLocaleString()} kg`, 14, 65);
        doc.text(`Aceite Obtenido (Real): ${lp.totalRealOilKg.toLocaleString()} kg`, 14, 71);
        doc.text(`Depósito Destino: ${tankName}`, 14, 77);
        const yieldVal = lp.totalOliveKg > 0 ? (lp.totalRealOilKg / lp.totalOliveKg) * 100 : 0;
        doc.text(`Rendimiento Industrial: ${yieldVal.toFixed(2)}%`, 110, 65);

        // Notas (si existen)
        if (lp.notes) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("NOTAS / OBSERVACIONES:", 14, 85);
            doc.setFont("helvetica", "normal");
            const splitNotes = doc.splitTextToSize(lp.notes, 180);
            doc.text(splitNotes, 14, 91);
        }

        const tableStartY = lp.notes ? 105 : 95;

        // Tabla
        doc.setFont("helvetica", "bold");
        doc.text("DETALLE DE LOTES MOLTURADOS", 14, tableStartY);
        const tableColumn = ["ID Lote MT", "Variedad", "Aceituna (kg)", "Aceite Asignado (kg)", "Nº Vales"];
        const tableRows = containedLots.map(mt => [
            mt.id,
            mt.variedad,
            mt.kilos_aceituna.toLocaleString(),
            Math.round(mt.kilos_aceite_real).toLocaleString(),
            mt.vales_ids.length
        ]);

        // @ts-ignore
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY + 5,
            theme: 'grid',
            headStyles: { fillColor: [17, 17, 17], textColor: [217, 255, 102] },
        });

        doc.save(`Tanda_${lp.id}.pdf`);
    };

    const renderProductionLotDetail = () => {
        if (!viewingProductionLot) return null;
        const containedLots = millingLots.filter(ml => viewingProductionLot.millingLotsIds.includes(ml.id));
        const tankName = tanks.find(t => t.id === viewingProductionLot.targetTankId)?.name || 'Desconocido';

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                <div className="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in flex flex-col max-h-[90vh]">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#111111] text-white">
                        <div>
                            <p className="text-[10px] font-black text-[#D9FF66] uppercase tracking-widest mb-1">TRAZABILIDAD DE PRODUCCIÓN</p>
                            <h3 className="text-3xl font-black uppercase tracking-tighter">Tanda {viewingProductionLot.id}</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => generateProductionLotPDF(viewingProductionLot, containedLots)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[#D9FF66] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                                <Download size={18} /> Generar PDF
                            </button>
                            <button onClick={() => setViewingProductionLot(null)} className="p-3 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all"><X size={24} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* RESUMEN KPI */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Aceituna Total</p>
                                <p className="text-2xl font-black text-[#111111]">{viewingProductionLot.totalOliveKg.toLocaleString()} kg</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Aceite Real</p>
                                <p className="text-2xl font-black text-[#111111]">{viewingProductionLot.totalRealOilKg.toLocaleString()} kg</p>
                            </div>
                            <div className="bg-[#111111] p-5 rounded-2xl border border-gray-100 text-center text-white">
                                <p className="text-[10px] font-black text-[#D9FF66] uppercase mb-1">Destino</p>
                                <p className="text-xl font-black">{tankName}</p>
                            </div>
                        </div>

                        {/* NOTAS / OBSERVACIONES */}
                        {viewingProductionLot.notes && (
                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex gap-4">
                                <div className="bg-white p-2 h-fit rounded-lg border border-orange-200 text-orange-500 shadow-sm"><FileText size={20} /></div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1">Observaciones de Producción</p>
                                    <p className="text-sm font-bold text-[#111111] italic leading-relaxed">
                                        "{viewingProductionLot.notes}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* DESGLOSE ARBOL */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-[#111111] uppercase border-b border-gray-100 pb-2">Composición Detallada</h4>
                            {containedLots.map(mt => (
                                <div key={mt.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-4 bg-gray-50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-lg border border-gray-200"><Factory size={16} className="text-gray-500" /></div>
                                            <div>
                                                <p className="text-sm font-black text-[#111111] uppercase">{mt.id}</p>
                                                <p className="text-[10px] text-gray-500 font-bold">{mt.kilos_aceituna.toLocaleString()} kg Aceituna</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-gray-200 uppercase text-gray-500">{mt.variedad}</span>
                                    </div>

                                    {/* Vales internos */}
                                    <div className="p-4 bg-white border-t border-gray-100">
                                        <table className="w-full text-left">
                                            <thead className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                <tr><th className="pb-2">Vale</th><th className="pb-2">Productor</th><th className="pb-2 text-right">Kilos</th><th className="pb-2 text-right">Aceite Adjudicado</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 text-xs">
                                                {mt.vales_ids.map(vid => {
                                                    const vale = allVales.find(v => v.id_vale === vid);
                                                    if (!vale) return null;
                                                    const yieldFactor = mt.kilos_aceituna > 0 ? mt.kilos_aceite_real / mt.kilos_aceituna : 0;
                                                    return (
                                                        <tr key={vid} className="hover:bg-gray-50">
                                                            <td className="py-2"><button onClick={() => { setViewingProductionLot(null); onViewValeDetails(vale); }} className="font-black text-[#111111] hover:text-[#D9FF66] hover:bg-black px-2 py-1 rounded transition-colors">#{vid}</button></td>
                                                            <td className="py-2 text-gray-600 uppercase font-bold">{vale.productor_name}</td>
                                                            <td className="py-2 text-right font-bold text-[#111111]">{vale.kilos_netos.toLocaleString()}</td>
                                                            <td className="py-2 text-right font-black text-[#111111]">{Math.round(vale.kilos_netos * yieldFactor).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* SECCIÓN 1: GESTIÓN DE TOLVAS */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#111111] text-white rounded-lg"><Factory size={20} /></div>
                        <h2 className="text-xl font-black uppercase text-[#111111]">Tolvas de Recepción</h2>
                    </div>
                    {openMillingLots.length > 0 && (
                        <button
                            onClick={() => setShowDayCloseModal(true)}
                            className="bg-[#D9FF66] text-black px-6 py-3 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2 border-2 border-black"
                        >
                            <Calculator size={18} /> Tanda de Producción (Cierre)
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeHoppersData.map(hopper => (
                        <div key={hopper.id} className={`relative rounded-[32px] overflow-hidden border-2 transition-all flex flex-col justify-between ${hopper.status === 'active' ? 'bg-white border-[#D9FF66] shadow-xl' : 'bg-white border-gray-100 opacity-80'}`}>
                            <div className="p-6">
                                {/* HEADER TOLVA */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">TOLVA T{hopper.id}</span>
                                    {hopper.status === 'active' ? (
                                        <span className="bg-[#111111] text-[#D9FF66] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-black">
                                            Activa
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                            Vacía
                                        </span>
                                    )}
                                </div>

                                {/* CONTENIDO ACTIVO */}
                                {hopper.activeBatch ? (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">{hopper.activeBatch.variety}</h3>
                                                <span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">
                                                    Lote {hopper.id}/{hopper.activeBatch.uso}
                                                </span>
                                            </div>

                                            {/* VALES CHIPS */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {hopper.activeBatch.vales.map(v => (
                                                    <button
                                                        key={v.id_vale}
                                                        onClick={() => onViewValeDetails(v)}
                                                        className="px-2 py-1 bg-white border border-gray-300 rounded text-[10px] font-bold text-[#111111] hover:bg-black hover:text-[#D9FF66] hover:border-black transition-colors"
                                                    >
                                                        #{v.id_vale}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* DATOS DEL LOTE ACTIVO */}
                                        <div className="grid grid-cols-2 gap-4 bg-[#F9FAF9] p-4 rounded-2xl border border-gray-100">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Aceituna Neta</p>
                                                <p className="text-2xl font-black text-[#111111]">{hopper.activeBatch.totalKg.toLocaleString()} <span className="text-xs text-gray-400">kg</span></p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Rend. Medio</p>
                                                <p className="text-2xl font-black text-[#111111]">{hopper.activeBatch.avgYield.toFixed(2)}%</p>
                                            </div>
                                        </div>

                                        {/* BOTÓN ACCIÓN PRINCIPAL */}
                                        <button
                                            onClick={() => handleQuickCreate(hopper.activeBatch, hopper.id)}
                                            className="w-full py-4 bg-[#D9FF66] text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 border-2 border-transparent hover:border-black"
                                        >
                                            <CheckCircle2 size={18} /> MOLTURAR (INICIAR)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-300">
                                        <Layers size={40} className="mb-2 opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest">Esperando aceituna</p>
                                    </div>
                                )}
                            </div>

                            {/* COLA DE ESPERA (PRÓXIMOS USOS) */}
                            {hopper.queuedBatches.length > 0 && (
                                <div className="bg-gray-50 p-4 border-t border-gray-100">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Clock size={10} /> En Cola de Espera
                                    </p>
                                    <div className="space-y-2">
                                        {hopper.queuedBatches.map(batch => (
                                            <div key={batch.uso} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                        #{batch.uso}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#111111] uppercase">{batch.variety}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-[#111111]">{batch.totalKg.toLocaleString()} kg</span>
                                                    <p className="text-[8px] text-gray-400 font-bold">{batch.vales.length} vales</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* SECCIÓN 2: LOTES EN PROCESO */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-[#F9FAF9]">
                    <h3 className="text-lg font-black uppercase text-[#111111] flex items-center gap-2">
                        <Activity size={20} /> Lotes Generados (En Proceso)
                    </h3>
                    <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full text-gray-500 border border-gray-200 uppercase">
                        Pendientes de Cierre
                    </span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">ID Lote MT</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-center">Variedad</th>
                                <th className="px-6 py-4 text-right">Aceituna (Kg)</th>
                                <th className="px-6 py-4 text-right">Teórico (Kg)</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {openMillingLots.map(mt => (
                                <tr key={mt.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div
                                            onClick={() => onViewLotDetail && onViewLotDetail(mt.id)}
                                            className="text-sm font-black text-[#111111] hover:text-[#D9FF66] hover:bg-black px-2 py-1 rounded transition-colors cursor-pointer inline-block"
                                        >
                                            {mt.id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(mt.fecha).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">{mt.variedad}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-[#111111]">{mt.kilos_aceituna.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-500">{Math.round(mt.kilos_aceite_esperado).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-orange-500 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                            <Activity size={10} /> Procesando
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {openMillingLots.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-xs font-bold text-gray-400 uppercase">No hay lotes en proceso</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECCIÓN 3: HISTORIAL DE PRODUCCIÓN / TANDAS */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase text-[#111111] flex items-center gap-2">
                        <Database size={20} /> Historial de Producción / Tandas
                    </h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-[#F9FAF9] text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">ID Tanda (LP)</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-right">Aceituna Total</th>
                                <th className="px-6 py-4 text-right">Aceite Real</th>
                                <th className="px-6 py-4 text-center">Rend. Ind.</th>
                                <th className="px-6 py-4">Depósito Destino</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {productionLots.slice().reverse().map(lp => (
                                <tr key={lp.id} onClick={() => setViewingProductionLot(lp)} className="hover:bg-gray-50 cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-[#111111] group-hover:text-blue-600 transition-colors underline-offset-4 group-hover:underline">
                                            {lp.id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(lp.fecha).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-[#111111]">{lp.totalOliveKg.toLocaleString()} kg</td>
                                    <td className="px-6 py-4 text-right font-black text-[#111111]">{lp.totalRealOilKg.toLocaleString()} kg</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-[#111111]">
                                            {(lp.totalOliveKg > 0 ? (lp.totalRealOilKg / lp.totalOliveKg * 100) : 0).toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-black uppercase text-gray-600">
                                        {tanks.find(t => t.id === lp.targetTankId)?.name || `D.${lp.targetTankId}`}
                                    </td>
                                </tr>
                            ))}
                            {productionLots.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-xs font-bold text-gray-400 uppercase">Sin historial de tandas</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL CIERRE TANDA */}
            <MillingDayClose
                isOpen={showDayCloseModal}
                onClose={() => setShowDayCloseModal(false)}
                millingLots={openMillingLots}
                vales={allVales}
                tanks={tanks}
                productionLots={productionLots} // Pasamos lotes para detección de duplicados
                appConfig={appConfig || {} as any}
                onConfirm={(data) => {
                    if (onDayClose) onDayClose(data);
                    setShowDayCloseModal(false);
                }}
            />

            {/* MODAL DETALLE TANDA */}
            {renderProductionLotDetail()}

        </div>
    );
};
