
import React, { useState, useMemo, useEffect } from 'react';
import { MillingLot, Tank, AppConfig, Vale, ProductionLot } from '../types';
import { X, CheckCircle2, Calculator, AlertTriangle, FileText, ArrowRight, Droplets, Info, ChevronDown, ChevronUp, User, Download, Calendar, Merge, PlusCircle } from 'lucide-react';

interface MillingDayCloseProps {
    isOpen: boolean;
    onClose: () => void;
    millingLots: MillingLot[];
    vales: Vale[]; // Necesario para el desglose detallado
    tanks: Tank[];
    productionLots?: ProductionLot[]; // Necesario para verificar duplicados de fecha
    appConfig: AppConfig;
    onConfirm: (data: {
        selectedLotIds: string[],
        totalRealOil: number,
        targetTankId: number,
        notes: string,
        productionDate: string, // Nueva fecha elegida
        mergeWithLpId?: string // ID si se decide fusionar
    }) => void;
}

export const MillingDayClose: React.FC<MillingDayCloseProps> = ({
    isOpen,
    onClose,
    millingLots,
    vales,
    tanks,
    productionLots = [],
    appConfig,
    onConfirm
}) => {
    const [step, setStep] = useState(1);
    const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
    const [expandedLotIds, setExpandedLotIds] = useState<string[]>([]);

    // Estados para Fecha y Gestión de Conflictos
    const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
    const [existingLP, setExistingLP] = useState<ProductionLot | null>(null);
    const [conflictMode, setConflictMode] = useState<'none' | 'merge' | 'new_series'>('none');

    const [formData, setFormData] = useState({
        totalRealOil: '',
        targetTankId: '',
        notes: ''
    });

    // Reset al abrir
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setProductionDate(new Date().toISOString().split('T')[0]);
            setFormData({ totalRealOil: '', targetTankId: '', notes: '' });
            setSelectedLotIds([]);
        }
    }, [isOpen]);

    // Detectar colisión de fecha (Tanda ya existente)
    useEffect(() => {
        const dateObj = new Date(productionDate);
        const dateId = `LP-${dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}`;

        // Buscar coincidencia exacta de ID base (ignorando sufijos -B, -C si queremos ser estrictos, pero aquí buscamos la principal)
        const found = productionLots.find(lp => lp.id === dateId);

        if (found) {
            setExistingLP(found);
            setConflictMode('merge'); // Por defecto sugerir fusionar
            // Pre-cargar datos de la tanda existente para facilitar la fusión
            setFormData(prev => ({
                ...prev,
                targetTankId: found.targetTankId.toString()
            }));
        } else {
            setExistingLP(null);
            setConflictMode('none');
        }
    }, [productionDate, productionLots]);

    const generatedId = useMemo(() => {
        const dateObj = new Date(productionDate);
        const baseId = `LP-${dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}`;

        if (conflictMode === 'new_series') {
            // Buscar sufijo disponible
            let suffixChar = 'B';
            while (productionLots.some(lp => lp.id === `${baseId}-${suffixChar}`)) {
                suffixChar = String.fromCharCode(suffixChar.charCodeAt(0) + 1);
            }
            return `${baseId}-${suffixChar}`;
        }
        return baseId;
    }, [productionDate, conflictMode, productionLots]);

    const availableLots = useMemo(() => {
        return millingLots.filter(l => l.kilos_aceite_real === 0);
    }, [millingLots]);

    const handleToggleLot = (id: string) => {
        setSelectedLotIds(prev =>
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    const toggleAccordion = (lotId: string) => {
        setExpandedLotIds(prev =>
            prev.includes(lotId) ? prev.filter(id => id !== lotId) : [...prev, lotId]
        );
    };

    // --- CÁLCULOS MATEMÁTICOS AVANZADOS (CON JERARQUÍA CORREGIDA) ---
    const calculationSummary = useMemo(() => {
        const selectedLots = availableLots.filter(l => selectedLotIds.includes(l.id));

        let totalOliveKg = 0;
        let totalTheoreticalOil = 0;
        let usesLabData = false;

        // Calcular Aceituna y Teórico RECALCULADO (Jerarquía: Lab > Config > Default)
        const lotDetails = selectedLots.map(l => {
            // Obtener vales asociados
            const lotVales = vales.filter(v => l.vales_ids.includes(v.id_vale));

            let lotOliveKg = 0;
            let lotTheoreticalOil = 0;

            const valesBreakdown = lotVales.map(v => {
                // Lógica Jerárquica por Vale
                let yieldPercent = 0;
                let source = 'MEDIA';

                if (v.analitica.rendimiento_graso && v.analitica.rendimiento_graso > 0) {
                    yieldPercent = v.analitica.rendimiento_graso;
                    source = 'LAB';
                    usesLabData = true;
                } else {
                    // Fallback a Configuración por Variedad o Default 21.5%
                    yieldPercent = appConfig.varietySettings?.[v.variedad]?.defaultYield || 21.5;
                }

                const theoreticalOil = (v.kilos_netos * yieldPercent) / 100;

                lotOliveKg += v.kilos_netos;
                lotTheoreticalOil += theoreticalOil;

                return {
                    ...v,
                    calculatedTheoretical: theoreticalOil,
                    usedYield: yieldPercent,
                    yieldSource: source
                };
            });

            // Si el lote tiene kilos aceituna guardados (ej: ajuste manual previo), usamos esos, sino la suma de vales
            const finalLotOlive = l.kilos_aceituna > 0 ? l.kilos_aceituna : lotOliveKg;

            totalOliveKg += finalLotOlive;
            totalTheoreticalOil += lotTheoreticalOil;

            return { ...l, kilos_aceituna: finalLotOlive, theoreticalOil: lotTheoreticalOil, valesBreakdown };
        });

        // Gestión de Fusión: Si fusionamos, los totales son (Existente + Nuevo Input)
        const previousRealOil = conflictMode === 'merge' && existingLP ? existingLP.totalRealOilKg : 0;
        const previousOliveKg = conflictMode === 'merge' && existingLP ? existingLP.totalOliveKg : 0;

        const inputRealOil = parseFloat(formData.totalRealOil) || 0;

        // Totales Combinados (para cálculo de rendimiento)
        const finalTotalOlive = previousOliveKg + totalOliveKg;
        const finalTotalOil = previousRealOil + inputRealOil;

        // Rendimiento Industrial Resultante
        const yieldFactor = finalTotalOlive > 0 ? finalTotalOil / finalTotalOlive : 0;
        const realIndustrialYield = yieldFactor * 100;

        const difference = inputRealOil - totalTheoreticalOil; // Diferencia de ESTE lote vs su teórico recalculado

        // Reparto proporcional
        const distribution = lotDetails.map(l => {
            const lotAllocatedOil = l.kilos_aceituna * yieldFactor;

            const updatedVales = l.valesBreakdown.map(v => {
                const valeAllocatedOil = v.kilos_netos * yieldFactor;
                // Usamos el teórico recalculado para mostrar la desviación correcta
                const deviation = valeAllocatedOil - v.calculatedTheoretical;
                return { ...v, valeAllocatedOil, deviation };
            });

            return { ...l, allocatedOil: lotAllocatedOil, valesBreakdown: updatedVales };
        });

        return {
            currentBatchOliveKg: totalOliveKg,
            currentBatchTheoreticalOil: totalTheoreticalOil,
            theoreticalSource: usesLabData ? 'LAB' : 'MEDIA', // Indicador Global
            inputRealOil,
            finalTotalOil,
            yieldFactor,
            realIndustrialYield,
            difference,
            distribution,
            hoppersUsed: Array.from(new Set(selectedLots.map(l => l.tolva_id))).join(', ')
        };
    }, [selectedLotIds, availableLots, formData.totalRealOil, vales, conflictMode, existingLP, appConfig]);

    const handleConfirm = () => {
        const tankId = parseInt(formData.targetTankId);
        if (!tankId) return alert("Selecciona un depósito de destino");

        const tank = tanks.find(t => t.id === tankId);
        if (!tank) return alert("Depósito no válido");

        const availableSpace = tank.maxCapacityKg - tank.currentKg;
        const incomingOil = parseFloat(formData.totalRealOil) || 0;

        if (incomingOil > availableSpace) {
            const proceed = window.confirm(
                `¡ATENCIÓN! El aceite real (${Math.round(incomingOil)} kg) supera el espacio disponible en el depósito ${tank.name} (${Math.round(availableSpace)} kg).\n\n` +
                `Si continúas, el depósito quedará con sobrecarga. ¿Deseas forzar el cierre?`
            );
            if (!proceed) return;
        }

        onConfirm({
            selectedLotIds,
            totalRealOil: calculationSummary.inputRealOil,
            targetTankId: tankId,
            notes: formData.notes,
            productionDate: productionDate,
            mergeWithLpId: conflictMode === 'merge' && existingLP ? existingLP.id : undefined
        });
        setStep(3);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[40px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#111111] text-[#D9FF66] rounded-xl"><Calculator size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PROCESO DE BODEGA</p>
                            <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Cierre de Producción</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* STEP 1: SELECCIÓN DE LOTES */}
                    {step === 1 && (
                        <div className="space-y-8">
                            {/* ... (Selección de fecha y lotes igual que antes) ... */}
                            {/* CONFIGURACIÓN FECHA */}
                            <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-[#111111] uppercase tracking-widest ml-1">Fecha de Producción</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="date"
                                            value={productionDate}
                                            onChange={(e) => setProductionDate(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 text-[#111111] font-bold text-lg rounded-xl pl-12 pr-4 py-3 outline-none focus:border-[#D9FF66] transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium ml-1">Fecha contable asignada a la tanda.</p>
                                </div>

                                {/* GESTIÓN DE CONFLICTOS DE FECHA */}
                                <div className="flex-1 w-full">
                                    <label className="text-[10px] font-black text-[#111111] uppercase tracking-widest ml-1 block mb-2">ID de Tanda Resultante</label>
                                    {existingLP ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-800">
                                                <AlertTriangle size={18} className="shrink-0" />
                                                <div className="text-xs">
                                                    <p className="font-bold">¡Atención! Ya existe una tanda para esta fecha.</p>
                                                    <p>ID: {existingLP.id} ({existingLP.totalOliveKg.toLocaleString()} kg)</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setConflictMode('merge')}
                                                    className={`p-3 rounded-xl border-2 text-xs font-black uppercase flex flex-col items-center gap-2 transition-all ${conflictMode === 'merge' ? 'bg-[#111111] text-[#D9FF66] border-[#111111]' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                                                >
                                                    <Merge size={20} />
                                                    Fusionar / Añadir
                                                </button>
                                                <button
                                                    onClick={() => setConflictMode('new_series')}
                                                    className={`p-3 rounded-xl border-2 text-xs font-black uppercase flex flex-col items-center gap-2 transition-all ${conflictMode === 'new_series' ? 'bg-[#111111] text-[#D9FF66] border-[#111111]' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                                                >
                                                    <PlusCircle size={20} />
                                                    Nueva Serie (B)
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                                            <span className="text-lg font-black text-[#111111]">{generatedId}</span>
                                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Disponible</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* TABLA SELECCIÓN */}
                            <div>
                                <div className="flex justify-between items-end mb-4">
                                    <p className="text-sm font-bold text-[#111111]">Selecciona lotes procesados:</p>
                                    <span className="bg-[#111111] text-[#D9FF66] px-3 py-1 rounded-lg text-xs font-black uppercase">{selectedLotIds.length} Lotes</span>
                                </div>

                                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4 w-16">Select</th>
                                                <th className="px-6 py-4">ID Lote MT</th>
                                                <th className="px-6 py-4">Variedad</th>
                                                <th className="px-6 py-4 text-right">Aceituna (Kg)</th>
                                                <th className="px-6 py-4 text-right">Estimado (Media)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {availableLots.map(lot => {
                                                const calculatedOliveKg = lot.kilos_aceituna > 0
                                                    ? lot.kilos_aceituna
                                                    : vales.filter(v => lot.vales_ids.includes(v.id_vale)).reduce((acc, v) => acc + v.kilos_netos, 0);

                                                return (
                                                    <tr key={lot.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedLotIds.includes(lot.id) ? 'bg-[#f0fdf4]' : ''}`} onClick={() => handleToggleLot(lot.id)}>
                                                        <td className="px-6 py-4">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedLotIds.includes(lot.id) ? 'bg-[#111111] border-[#111111] text-[#D9FF66]' : 'border-gray-300 bg-white'}`}>
                                                                {selectedLotIds.includes(lot.id) && <CheckCircle2 size={14} />}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-[#111111]">{lot.id}</td>
                                                        <td className="px-6 py-4 text-gray-600 uppercase text-xs font-bold">{lot.variedad}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-[#111111]">{calculatedOliveKg.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right text-gray-500">{Math.round(lot.kilos_aceite_esperado).toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                            {availableLots.length === 0 && (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold uppercase text-xs">No hay lotes pendientes de cierre.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={selectedLotIds.length === 0}
                                className="w-full py-4 bg-[#111111] text-[#D9FF66] rounded-[24px] font-black uppercase text-xs tracking-widest hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl"
                            >
                                Siguiente Paso <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: DATOS REALES Y CONFIRMACIÓN */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">

                            {conflictMode === 'merge' && existingLP && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
                                    <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-900">
                                        <p className="font-black uppercase mb-1">Modo Fusión Activo</p>
                                        <p className="text-xs leading-relaxed">
                                            Estás añadiendo lotes a la tanda <strong>{existingLP.id}</strong>.
                                            Introduce abajo el aceite <strong>generado por estos NUEVOS lotes</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                {/* COLUMNA IZQUIERDA: INPUTS */}
                                <div className="lg:col-span-5 space-y-6">
                                    <h4 className="text-sm font-black text-[#111111] uppercase border-b border-gray-100 pb-2">1. Datos Reales de Producción</h4>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#111111] uppercase tracking-widest ml-1">
                                            {conflictMode === 'merge' ? 'Aceite Nuevo Obtenido (Solo estos lotes)' : 'Aceite Real Obtenido (KG)'}
                                        </label>
                                        <div className="relative">
                                            <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                autoFocus
                                                value={formData.totalRealOil}
                                                onChange={e => setFormData({ ...formData, totalRealOil: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-200 focus:border-[#D9FF66] rounded-2xl pl-12 pr-4 py-4 text-xl font-black text-[#111111] outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between px-2 items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Teórico Lotes Nuevos:</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-black text-[#111111]">{Math.round(calculationSummary.currentBatchTheoreticalOil).toLocaleString()} kg</span>
                                                {/* INDICADOR DE FUENTE (LAB / MEDIA) */}
                                                <span className="text-[9px] font-black text-[#000000]">({calculationSummary.theoreticalSource})</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#F9FAF9] p-5 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-gray-500 font-bold">Rendimiento Real {conflictMode === 'merge' ? '(Recalculado)' : '(Global)'}</span>
                                            <span className="text-2xl font-black text-[#111111] bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                                                {calculationSummary.realIndustrialYield.toFixed(2)}%
                                            </span>
                                        </div>
                                        {calculationSummary.difference !== 0 && (
                                            <div className={`p-2 rounded-lg text-center text-[10px] font-black uppercase ${calculationSummary.difference > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                Desviación Lotes: {calculationSummary.difference > 0 ? '+' : ''}{Math.round(calculationSummary.difference)} kg
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#111111] uppercase tracking-widest ml-1">Depósito Destino</label>
                                        <select
                                            value={formData.targetTankId}
                                            onChange={e => setFormData({ ...formData, targetTankId: e.target.value })}
                                            className="w-full bg-white text-[#111111] border-2 border-gray-200 focus:border-[#D9FF66] rounded-2xl px-4 py-4 text-sm font-bold outline-none cursor-pointer"
                                        >
                                            <option value="">Seleccionar Depósito...</option>
                                            {tanks.map(t => {
                                                const availableSpace = t.maxCapacityKg - t.currentKg;
                                                // Permitir seleccionar el mismo tanque si estamos fusionando
                                                const isSameTank = existingLP && existingLP.targetTankId === t.id;
                                                const isClosed = t.status === 'FULL';

                                                const isDisabled = (isClosed || availableSpace <= 0) && !isSameTank;

                                                return (
                                                    <option key={t.id} value={t.id} disabled={isDisabled}>
                                                        {t.name} ({t.variety_id || 'Vacío'}) - Disp: {availableSpace.toLocaleString()} kg {isClosed ? '(CERRADO)' : (availableSpace <= 0 ? '(LLENO)' : '')}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#111111] uppercase tracking-widest ml-1">Notas</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full bg-white border border-gray-200 focus:border-[#D9FF66] rounded-2xl px-4 py-3 text-sm font-medium text-[#111111] outline-none h-20 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA: REPARTO DETALLADO */}
                                <div className="lg:col-span-7 flex flex-col h-full">
                                    <h4 className="text-sm font-black text-[#111111] uppercase border-b border-gray-100 pb-2 mb-4">2. Simulación de Reparto (Lotes Nuevos)</h4>

                                    <div className="flex-1 bg-gray-50 rounded-[24px] border border-gray-100 p-4 overflow-y-auto max-h-[500px] custom-scrollbar space-y-3">
                                        {calculationSummary.distribution.map(item => {
                                            const isExpanded = expandedLotIds.includes(item.id);
                                            return (
                                                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                                                    {/* Cabecera Lote */}
                                                    <div
                                                        onClick={() => toggleAccordion(item.id)}
                                                        className="p-4 flex items-center justify-between cursor-pointer bg-white hover:bg-gray-50"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-1.5 rounded-lg transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                                <ChevronDown size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-[#111111] uppercase">{item.id}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold">{item.valesBreakdown.length} Vales asociados</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-[#111111]">{Math.round(item.allocatedOil).toLocaleString()} kg</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Aceite Asignado</p>
                                                        </div>
                                                    </div>

                                                    {/* Desglose Vales (Acordeón) */}
                                                    {isExpanded && (
                                                        <div className="border-t border-gray-100 bg-[#F9FAF9]">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-gray-100 text-[9px] font-black text-gray-500 uppercase tracking-wider">
                                                                    <tr>
                                                                        <th className="px-4 py-2">Vale</th>
                                                                        <th className="px-4 py-2">Productor</th>
                                                                        <th className="px-4 py-2 text-right">Aceituna</th>
                                                                        <th className="px-4 py-2 text-right">Teórico</th>
                                                                        <th className="px-4 py-2 text-right">Adjudicado</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 text-xs">
                                                                    {item.valesBreakdown.map(v => (
                                                                        <tr key={v.id_vale}>
                                                                            <td className="px-4 py-3 font-black text-[#111111]">#{v.id_vale}</td>
                                                                            <td className="px-4 py-3 text-gray-600 truncate max-w-[100px]" title={v.productor_name}>{v.productor_name}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-[#111111]">{v.kilos_netos.toLocaleString()}</td>
                                                                            <td className="px-4 py-3 text-right text-gray-500">
                                                                                {Math.round(v.calculatedTheoretical).toLocaleString()}
                                                                                <span className="text-[8px] ml-1 opacity-60">({v.yieldSource})</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="font-black text-[#111111]">{Math.round(v.valeAllocatedOil).toLocaleString()}</span>
                                                                                    <span className={`text-[9px] font-bold ${v.deviation >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                        {v.deviation > 0 ? '+' : ''}{Math.round(v.deviation)}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 flex items-start gap-2 bg-orange-50 p-3 rounded-xl text-orange-800 text-[10px] leading-tight border border-orange-100">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        <p><strong>Nota:</strong> El aceite se adjudica proporcionalmente según el rendimiento industrial real. Al confirmar, este reparto será definitivo.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-4 bg-gray-100 text-[#111111] rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Atrás
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!formData.totalRealOil || !formData.targetTankId}
                                    className="flex-[2] py-4 bg-[#D9FF66] text-black rounded-[24px] font-black uppercase text-xs tracking-widest hover:scale-[1.01] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    {conflictMode === 'merge' ? 'Fusionar y Recalcular' : 'Confirmar Tanda y Cerrar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: ÉXITO */}
                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in zoom-in">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-lg">
                                <CheckCircle2 size={48} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">¡Proceso Completado!</h3>
                                <p className="text-gray-500 max-w-md">
                                    Se han actualizado los stocks, generado la trazabilidad y adjudicado el aceite a los vales correspondientes.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3 bg-[#111111] text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg"
                                >
                                    Volver al Dashboard
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
