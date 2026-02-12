
import React, { useState, useMemo, useEffect } from 'react';
import { Tank, NurseTank, PackagingLot, FinishedProduct, AuxEntry, AuxMaterialType, PackagingFormatDefinition, OilMovement } from '../types';
import { Package, ArrowRight, Droplets, Scale, AlertTriangle, Calendar, CheckCircle2, Factory, Box, Info, X, Plus, Trash2, List, FileText, Milk, Sticker, Search, Tag, ChevronDown } from 'lucide-react';

const OIL_DENSITY = 0.916;

interface PackagingDashboardProps {
    tanks: Tank[]; // Depósitos de bodega para origen
    nurseTank: NurseTank;
    finishedProducts: FinishedProduct[];
    packagingLots: PackagingLot[];
    availableAuxLots: any[]; // Entradas de auxiliares (Initial Quantity)
    packagingFormats: PackagingFormatDefinition[]; // Formatos configurados
    oilMovements?: OilMovement[]; // Histórico de entradas a nodriza
    onFillNurseTank: (amountKg: number, sourceTankId: number, date: string) => void;
    onPackagingRun: (lot: PackagingLot, isFiltered: boolean, wastePercent: number) => void;
    onViewBatch?: (batchId: string) => void; // Para ver trazabilidad de entradas
}

interface PackagingLineItem {
    id: string;
    format: string; // Dynamic string
    units: number;
    bottleBatch: string;
    capBatch: string;
    labelBatch: string;
}

export const PackagingDashboard: React.FC<PackagingDashboardProps> = ({
    tanks,
    nurseTank,
    finishedProducts,
    packagingLots,
    availableAuxLots,
    packagingFormats,
    oilMovements = [],
    onFillNurseTank,
    onPackagingRun,
    onViewBatch
}) => {
    const [activeTab, setActiveTab] = useState<'filtered' | 'unfiltered'>('filtered');
    const [showFillModal, setShowFillModal] = useState(false);
    const [viewingLot, setViewingLot] = useState<PackagingLot | null>(null);

    // --- ESTADOS DEL FORMULARIO DE ENVASADO ---

    // Datos Generales (Cabecera)
    const [packHeader, setPackHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        sourceTankId: '', // Solo para Sin Filtrar
        wastePercent: '0' // Merma por defecto a 0 para no confundir
    });

    // Datos de la línea actual que se está añadiendo
    const [currentLine, setCurrentLine] = useState({
        format: '', // Inicializar vacío o con el primero
        units: '',
        bottleBatch: '',
        capBatch: '',
        labelBatch: ''
    });

    // Inicializar formato por defecto
    useEffect(() => {
        if (packagingFormats.length > 0 && !currentLine.format) {
            setCurrentLine(prev => ({ ...prev, format: packagingFormats[0].name }));
        }
    }, [packagingFormats]);

    // Lista de líneas añadidas a la orden actual
    const [packagingLines, setPackagingLines] = useState<PackagingLineItem[]>([]);

    // Estado para Llenar Nodriza
    const [fillForm, setFillForm] = useState({ sourceTankId: '', kg: '', date: new Date().toISOString().split('T')[0] });

    // --- CÁLCULOS NODRIZA ---
    const nurseAvailableKg = nurseTank.maxCapacityKg - nurseTank.currentKg;
    const nurseFillPercent = (nurseTank.currentKg / nurseTank.maxCapacityKg) * 100;

    // Visualización principal ahora en LITROS
    const nurseCurrentLiters = nurseTank.currentKg / OIL_DENSITY;
    const nurseMaxLiters = nurseTank.maxCapacityKg / OIL_DENSITY;
    const nurseFreeLiters = nurseAvailableKg / OIL_DENSITY;

    // --- OBTENER ENTRADAS A NODRIZA (PARA HISTORIAL) ---
    const nurseEntries = useMemo(() => {
        return oilMovements
            .filter(m => m.target_tank_id === 999)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [oilMovements]);

    // --- LOTE ACTIVO DINÁMICO (HERENCIA) ---
    const currentPackagingBatchId = useMemo(() => {
        if (activeTab === 'filtered') {
            // PRIORIDAD 1: El lote asignado directamente a la nodriza (estado actual)
            if (nurseTank.currentBatchId && nurseTank.currentKg > 0) {
                return nurseTank.currentBatchId;
            }

            // PRIORIDAD 2: FALLBACK INTELIGENTE (Trazabilidad heredada)
            // Si hay carga pero no hay ID, lo buscamos en el historial (oilMovements)
            if (nurseTank.currentKg > 0 && nurseEntries.length > 0) {
                return nurseEntries[0].batch_id || null;
            }

            return null;
        } else {
            return packHeader.sourceTankId ? `SF-D${packHeader.sourceTankId}-${new Date().getFullYear()}` : 'SELECCIONA_ORIGEN';
        }
    }, [activeTab, nurseTank.currentBatchId, nurseTank.currentKg, nurseEntries, packHeader.sourceTankId]);

    // --- CÁLCULO DE STOCK EN TIEMPO REAL (HISTÓRICO + SESIÓN ACTUAL) ---
    const liveAuxLots = useMemo(() => {
        // 1. Clonar lotes iniciales
        const computedLots = availableAuxLots.map(l => ({ ...l, remaining: l.quantity }));

        // 2. Restar consumo histórico (PackagingLots ya guardados)
        packagingLots.forEach(plot => {
            const bLot = computedLots.find(l => l.manufacturerBatch === plot.bottleBatch);
            if (bLot) bLot.remaining -= plot.units;

            const cLot = computedLots.find(l => l.manufacturerBatch === plot.capBatch);
            if (cLot) cLot.remaining -= plot.units;

            const lLot = computedLots.find(l => l.manufacturerBatch === plot.labelBatch);
            if (lLot) lLot.remaining -= plot.units;
        });

        // 3. Restar consumo actual en sesión (Líneas añadidas pero no guardadas)
        packagingLines.forEach(line => {
            const bLot = computedLots.find(l => l.manufacturerBatch === line.bottleBatch);
            if (bLot) bLot.remaining -= line.units;

            const cLot = computedLots.find(l => l.manufacturerBatch === line.capBatch);
            if (cLot) cLot.remaining -= line.units;

            const lLot = computedLots.find(l => l.manufacturerBatch === line.labelBatch);
            if (lLot) lLot.remaining -= line.units;
        });

        return computedLots;
    }, [availableAuxLots, packagingLots, packagingLines]);

    // --- CÁLCULOS TOTALES DE LA ORDEN ---
    const orderTotals = useMemo(() => {
        let totalLiters = 0;

        packagingLines.forEach(line => {
            // Buscar capacidad del formato
            const fmt = packagingFormats.find(f => f.name === line.format);
            const volume = fmt ? fmt.capacityLiters : 0;
            totalLiters += line.units * volume;
        });

        const wasteMultiplier = 1 + (parseFloat(packHeader.wastePercent) / 100);
        const totalLitersRequired = totalLiters * wasteMultiplier;
        const totalKgRequired = totalLitersRequired * OIL_DENSITY;

        return {
            linesCount: packagingLines.length,
            nominalLiters: totalLiters,
            requiredLiters: totalLitersRequired,
            requiredKg: totalKgRequired
        };
    }, [packagingLines, packHeader.wastePercent, packagingFormats]);

    // Filtrar lotes disponibles con vinculación inteligente por CAPACIDAD
    const filteredAuxLots = useMemo(() => {
        const selectedFormatName = currentLine.format || '';

        // Detectar restricción de tamaño (ej: "5L", "500ml")
        let sizeTerm = '';
        if (selectedFormatName.includes('5L')) sizeTerm = '5L';
        else if (selectedFormatName.includes('1L')) sizeTerm = '1L';
        else if (selectedFormatName.includes('2L')) sizeTerm = '2L';
        else if (selectedFormatName.includes('500ml')) sizeTerm = '500ml';
        else if (selectedFormatName.includes('250ml')) sizeTerm = '250ml';

        // Helper para detectar tipos
        const isLike = (name: string, terms: string[]) => terms.some(t => name.toLowerCase().includes(t));

        return {
            bottles: liveAuxLots.filter(l => {
                const nameLower = String(l.materialType).toLowerCase();
                const isEnvase = l.category === 'Envase' || isLike(nameLower, ['botella', 'garrafa', 'lata', 'envase', 'bidon']);

                // APLICAR FILTRO DE TAMAÑO ESTRICTO SI SE DETECTA
                if (sizeTerm && isEnvase) {
                    return nameLower.includes(sizeTerm.toLowerCase());
                }
                return isEnvase;
            }),
            caps: liveAuxLots.filter(l => {
                const nameLower = String(l.materialType).toLowerCase();
                return l.category === 'Tapón' || isLike(nameLower, ['tapon', 'tapa', 'corcho', 'precinto', 'capsula']);
            }),
            labels: liveAuxLots.filter(l => {
                const nameLower = String(l.materialType).toLowerCase();
                return l.category === 'Etiqueta' || isLike(nameLower, ['etiqueta', 'pegatina', 'sticker']);
            })
        };
    }, [liveAuxLots, currentLine.format]);



    // --- HANDLERS ---

    const handleFillSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fillForm.sourceTankId || !fillForm.kg) return;

        const kg = parseFloat(fillForm.kg);
        const sourceTank = tanks.find(t => t.id === parseInt(fillForm.sourceTankId));

        if (!sourceTank) return;
        if (kg > sourceTank.currentKg) return alert("No hay suficiente aceite en el depósito de origen.");
        if (kg > nurseAvailableKg) return alert("No hay espacio suficiente en la envasadora (Nodriza).");

        onFillNurseTank(kg, parseInt(fillForm.sourceTankId), fillForm.date);
        setShowFillModal(false);
        setFillForm({ sourceTankId: '', kg: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleAddLine = () => {
        const units = parseInt(currentLine.units);
        if (!units || units <= 0) return alert("Introduce una cantidad válida de unidades.");
        if (!currentLine.bottleBatch) return alert("Selecciona el lote de botellas.");
        if (!currentLine.capBatch) return alert("Selecciona el lote de tapas.");
        if (!currentLine.labelBatch) return alert("Selecciona el lote de etiquetas.");

        // VALIDACIÓN DE STOCK ESTRICTA
        const bottleLot = liveAuxLots.find(l => l.manufacturerBatch === currentLine.bottleBatch);
        const capLot = liveAuxLots.find(l => l.manufacturerBatch === currentLine.capBatch);
        const labelLot = liveAuxLots.find(l => l.manufacturerBatch === currentLine.labelBatch);

        if (!bottleLot || bottleLot.remaining < units) {
            return alert(`Stock insuficiente de botellas (${currentLine.bottleBatch}). Solicitado: ${units}, Disponible: ${bottleLot?.remaining || 0}`);
        }
        if (!capLot || capLot.remaining < units) {
            return alert(`Stock insuficiente de tapones (${currentLine.capBatch}). Solicitado: ${units}, Disponible: ${capLot?.remaining || 0}`);
        }
        if (!labelLot || labelLot.remaining < units) {
            return alert(`Stock insuficiente de etiquetas (${currentLine.labelBatch}). Solicitado: ${units}, Disponible: ${labelLot?.remaining || 0}`);
        }

        const newItem: PackagingLineItem = {
            id: Date.now().toString(),
            format: currentLine.format,
            units: units,
            bottleBatch: currentLine.bottleBatch,
            capBatch: currentLine.capBatch,
            labelBatch: currentLine.labelBatch
        };

        setPackagingLines([...packagingLines, newItem]);
        setCurrentLine(prev => ({ ...prev, units: '' }));
    };

    const handleRemoveLine = (id: string) => {
        setPackagingLines(packagingLines.filter(line => line.id !== id));
    };

    const handleConfirmOrder = () => {
        if (packagingLines.length === 0) return alert("Añade al menos una línea de envasado.");

        if (activeTab === 'unfiltered') {
            if (!packHeader.sourceTankId) return alert("Selecciona depósito de origen");
            const sourceTank = tanks.find(t => t.id === parseInt(packHeader.sourceTankId));
            if (!sourceTank || sourceTank.currentKg < orderTotals.requiredKg) return alert("No hay suficiente aceite en el depósito de bodega seleccionado.");
        } else {
            if (nurseTank.currentKg < orderTotals.requiredKg) return alert("No hay suficiente aceite en el depósito nodriza.");
            if (!nurseTank.currentBatchId) return alert("Error crítico: La nodriza no tiene un Lote Activo asignado. Realiza una entrada primero.");
        }

        const currentYearShort = new Date(packHeader.date).getFullYear().toString().slice(-2);

        packagingLines.forEach((line, index) => {
            const fmt = packagingFormats.find(f => f.name === line.format);
            const volume = fmt ? fmt.capacityLiters : 0;
            const lineLiters = line.units * volume;
            const wasteMultiplier = 1 + (parseFloat(packHeader.wastePercent) / 100);
            const lineLitersUsed = lineLiters * wasteMultiplier;
            const lineKgUsed = lineLitersUsed * OIL_DENSITY;

            let lotCode = '';
            const previousLotsOfType = packagingLots.filter(l =>
                l.type === (activeTab === 'filtered' ? 'Filtrado' : 'Sin Filtrar')
            ).length;
            const bottlingCount = previousLotsOfType + 1 + index;

            if (activeTab === 'unfiltered') {
                lotCode = `SF${packHeader.sourceTankId}/${bottlingCount}/${currentYearShort}`;
            } else {
                // VINCULACIÓN ESTRICTA: El lote de envasado HEREDA el ID de la Nodriza
                lotCode = `${nurseTank.currentBatchId}-E${bottlingCount}`;
            }

            const newLot: PackagingLot = {
                id: lotCode,
                almazaraId: '',
                date: packHeader.date,
                type: activeTab === 'filtered' ? 'Filtrado' : 'Sin Filtrar',
                format: line.format as any,
                units: line.units,
                litersUsed: lineLitersUsed,
                kgUsed: lineKgUsed,
                bottleBatch: line.bottleBatch,
                capBatch: line.capBatch,
                labelBatch: line.labelBatch,
                sourceInfo: activeTab === 'unfiltered' ? `Bodega D${packHeader.sourceTankId}` : `Nodriza (Lote ${nurseTank.currentBatchId})`,
                sourceTankId: activeTab === 'unfiltered' ? parseInt(packHeader.sourceTankId) : undefined,
                campaign: `20${currentYearShort}/20${parseInt(currentYearShort) + 1}`
            };

            onPackagingRun(newLot, activeTab === 'filtered', parseFloat(packHeader.wastePercent));
        });

        setPackagingLines([]);
        setPackHeader(prev => ({ ...prev, sourceTankId: '' }));
        alert("Orden de envasado registrada correctamente. Stocks actualizados.");
    };

    const customSelectClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-black text-[#000000] outline-none focus:border-black shadow-sm appearance-none cursor-pointer hover:border-gray-400 transition-colors";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* TOP SECTION: DEPÓSITO NODRIZA + HISTORIAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {/* CARD PRINCIPAL NODRIZA */}
                <div className="md:col-span-1 lg:col-span-2 bg-[#111111] rounded-[32px] p-6 text-white relative overflow-hidden shadow-2xl flex flex-col gap-4 h-fit self-start">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-[#D9FF66] rounded-lg text-black"><Package size={16} /></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DEPÓSITO NODRIZA (ENVASADORA)</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-[#D9FF66] tracking-tighter mb-2">CAPACIDAD: {Math.round(nurseMaxLiters).toLocaleString()} L</h2>
                        </div>
                        {nurseTank.lastEntryDate && (
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-gray-500 uppercase">Última Entrada #{nurseTank.lastEntryId}</p>
                                <p className="text-sm font-bold text-white">{new Date(nurseTank.lastEntryDate).toLocaleDateString()}</p>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 bg-white p-4 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ACEITE EN NODRIZA (LOTE ACTIVO)</p>
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex-1">
                                <p className="text-xl md:text-2xl font-black text-black uppercase">{nurseTank.currentBatchId || 'VACÍO'}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">
                                    Origen: {nurseTank.lastSourceTankId ? `Depósito ${nurseTank.lastSourceTankId}` : '---'}
                                </p>

                                {nurseTank.currentBatchId && nurseTank.currentKg > 0 && (
                                    <div className="mt-2 flex items-center gap-2 bg-[#D9FF66] px-3 py-1.5 rounded-lg w-fit">
                                        <Tag size={12} className="text-black" />
                                        <p className="text-[10px] font-black text-[#000000] uppercase tracking-wide">
                                            Etiquetando con Lote: {nurseTank.currentBatchId}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xl md:text-2xl font-black text-black">{Math.round(nurseTank.currentKg).toLocaleString()} KG</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Disponibles</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-8">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Actual (Litros)</p>
                            <p className="text-xl md:text-2xl font-black text-[#D9FF66]">{Math.round(nurseCurrentLiters).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Espacio Libre (Litros)</p>
                            <p className="text-xl md:text-2xl font-black text-gray-400">{Math.round(nurseFreeLiters).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <button
                            onClick={() => setShowFillModal(true)}
                            className="w-full py-4 bg-[#D9FF66] text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-[#D9FF66]/20 flex items-center justify-center gap-2"
                        >
                            <ArrowRight size={16} /> Recepcionar Aceite desde Bodega
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 h-1.5 bg-gray-800 w-full">
                        <div className="h-full bg-[#D9FF66] transition-all duration-1000" style={{ width: `${nurseFillPercent}%` }} />
                    </div>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
                        <Factory size={150} />
                    </div>
                </div>

                {/* CARD LOTES ENTRADA NODRIZA (HISTORIAL) */}
                <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col max-h-[500px] h-fit overflow-hidden">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Box size={18} /></div>
                        <h3 className="text-sm font-black text-[#000000] uppercase tracking-wide">Historial de Lotes de Entrada</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {nurseEntries.length > 0 ? nurseEntries.map((mov, idx) => {
                            const sourceTankName = tanks.find(t => t.id === mov.source_tank_id)?.name || `D.${mov.source_tank_id}`;
                            const litersApprox = mov.kg / OIL_DENSITY;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => mov.batch_id && onViewBatch && onViewBatch(mov.batch_id)}
                                    className="w-full flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-200 hover:border-black transition-all group text-left shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <div className="flex justify-between items-start w-full mb-3">
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-black text-blue-600 underline decoration-2 underline-offset-4 decoration-blue-200 uppercase">
                                                {mov.batch_id || 'ID PENDIENTE'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold bg-gray-100 text-black px-2 py-1 rounded border border-gray-200">
                                            {new Date(mov.date).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 w-full gap-2 text-xs">
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Origen</p>
                                            <p className="font-black text-[#000000] flex items-center gap-1">
                                                <Factory size={12} className="text-gray-400" />
                                                {sourceTankName}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Volumen</p>
                                            <p className="font-black text-[#000000] text-sm">{Math.round(litersApprox).toLocaleString()} L</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        }) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-10">
                                <div className="p-4 bg-gray-50 rounded-full border border-gray-100">
                                    <Droplets size={32} opacity={0.3} className="text-gray-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black uppercase text-[#000000] mb-1">Lista Vacía</p>
                                    <p className="text-[10px] font-medium text-gray-500">Pendiente de recibir aceite de bodega</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MIDDLE SECTION: PACKAGING FORM (RESTAURADO) */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-1">Selección de Producto</h2>
                        <p className="text-gray-500 text-sm font-medium">Configura el formato y los materiales para la orden de envasado.</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('filtered')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'filtered' ? 'bg-black text-[#D9FF66] shadow-md' : 'text-gray-500 hover:text-black'}`}
                        >
                            Nodriza (Filtrado)
                        </button>
                        <button
                            onClick={() => setActiveTab('unfiltered')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'unfiltered' ? 'bg-black text-[#D9FF66] shadow-md' : 'text-gray-500 hover:text-black'}`}
                        >
                            Directo (Sin Filtrar)
                        </button>
                    </div>
                </div>

                {/* BATCH DISPLAY SHIELDED */}
                <div className="mb-8 p-6 bg-[#F9FAF9] rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Lote Asignado a Botellas (Automático)</label>
                        {currentPackagingBatchId ? (
                            <p className="text-4xl font-black text-[#111111] tracking-tighter uppercase">{currentPackagingBatchId}</p>
                        ) : (
                            <div className="flex items-center gap-2 text-orange-500">
                                <AlertTriangle size={24} />
                                <p className="text-xl font-black uppercase">⚠ Esperando Lote de Aceite</p>
                            </div>
                        )}
                    </div>
                    {activeTab === 'unfiltered' && (
                        <div className="w-full md:w-64">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Depósito Origen</label>
                            <div className="relative">
                                <select
                                    value={packHeader.sourceTankId}
                                    onChange={e => setPackHeader({ ...packHeader, sourceTankId: e.target.value })}
                                    className={customSelectClass}
                                >
                                    <option value="">Seleccionar Depósito...</option>
                                    {tanks.filter(t => t.currentKg > 0).map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.variety_id})</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                            </div>
                        </div>
                    )}
                </div>

                {/* INPUTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-6">
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Formato</label>
                        <div className="relative">
                            <select
                                value={currentLine.format}
                                onChange={e => setCurrentLine({ ...currentLine, format: e.target.value })}
                                className={customSelectClass}
                            >
                                {packagingFormats.map(fmt => (
                                    <option key={fmt.id} value={fmt.name}>{fmt.name} ({fmt.capacityLiters}L)</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Cantidad</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={currentLine.units}
                            onChange={e => setCurrentLine({ ...currentLine, units: parseInt(e.target.value) || '' })}
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg font-black text-[#000000] outline-none focus:border-black shadow-sm"
                        />
                    </div>

                    {/* AUXILIARY SELECTORS WITH LIVE STOCK */}
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Lote Botella</label>
                        <div className="relative">
                            <select
                                value={currentLine.bottleBatch}
                                onChange={e => setCurrentLine({ ...currentLine, bottleBatch: e.target.value })}
                                className={customSelectClass}
                            >
                                <option value="">Seleccionar...</option>
                                {filteredAuxLots.bottles.map(l => (
                                    <option
                                        key={l.id}
                                        value={l.manufacturerBatch}
                                        disabled={l.remaining <= 0}
                                        className={l.remaining <= 0 ? 'text-red-400' : 'text-black'}
                                    >
                                        {l.manufacturerBatch} (Disp: {l.remaining} uds)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Lote Tapón</label>
                        <div className="relative">
                            <select
                                value={currentLine.capBatch}
                                onChange={e => setCurrentLine({ ...currentLine, capBatch: e.target.value })}
                                className={customSelectClass}
                            >
                                <option value="">Seleccionar...</option>
                                {filteredAuxLots.caps.map(l => (
                                    <option
                                        key={l.id}
                                        value={l.manufacturerBatch}
                                        disabled={l.remaining <= 0}
                                        className={l.remaining <= 0 ? 'text-red-400' : 'text-black'}
                                    >
                                        {l.manufacturerBatch} (Disp: {l.remaining} uds)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <button
                            onClick={handleAddLine}
                            className="w-full py-3 bg-black text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                            <Plus size={16} /> Añadir Línea
                        </button>
                    </div>
                </div>

                {/* LOTE ETIQUETA EXTRA */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2 md:col-start-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Lote Etiqueta</label>
                        <div className="relative">
                            <select
                                value={currentLine.labelBatch}
                                onChange={e => setCurrentLine({ ...currentLine, labelBatch: e.target.value })}
                                className={customSelectClass}
                            >
                                <option value="">Seleccionar...</option>
                                {filteredAuxLots.labels.map(l => (
                                    <option
                                        key={l.id}
                                        value={l.manufacturerBatch}
                                        disabled={l.remaining <= 0}
                                        className={l.remaining <= 0 ? 'text-red-400' : 'text-black'}
                                    >
                                        {l.manufacturerBatch} (Disp: {l.remaining} uds)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                {/* LINES LIST */}
                {packagingLines.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-200">
                        <h4 className="text-xs font-black text-gray-500 uppercase mb-3">Líneas de Producción Añadidas</h4>
                        <div className="space-y-2">
                            {packagingLines.map(line => (
                                <div key={line.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-[#111111]">{line.format}</span>
                                        <span className="text-sm font-bold text-gray-600">{line.units} uds</span>
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded border border-gray-100">
                                            Bot: {line.bottleBatch} / Tap: {line.capBatch}
                                        </span>
                                    </div>
                                    <button onClick={() => handleRemoveLine(line.id)} className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                            <span className="text-xs font-black text-gray-500 uppercase">Total Envasado</span>
                            <div className="text-right">
                                <p className="text-2xl font-black text-[#111111]">{Math.round(orderTotals.nominalLiters).toLocaleString()} L</p>
                                {parseFloat(packHeader.wastePercent) > 0 && (
                                    <p className="text-[10px] font-bold text-gray-400">
                                        + {Math.round(orderTotals.requiredLiters - orderTotals.nominalLiters)} L Merma ({packHeader.wastePercent}%)
                                        = {Math.round(orderTotals.requiredLiters).toLocaleString()} L Total
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTION BUTTON */}
                <button
                    onClick={handleConfirmOrder}
                    disabled={packagingLines.length === 0 || (!currentPackagingBatchId && activeTab === 'filtered')}
                    className="w-full py-5 bg-[#D9FF66] text-black rounded-[24px] font-black uppercase text-sm tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={20} /> INICIAR ORDEN DE ENVASADO
                </button>
            </div>

            {/* ... (Resto de modales sin cambios) ... */}
            {showFillModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ENTRADA A NODRIZA</p>
                                <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Llenar Envasadora</h3>
                            </div>
                            <button onClick={() => setShowFillModal(false)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleFillSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={fillForm.date}
                                    onChange={e => setFillForm({ ...fillForm, date: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Depósito Origen (Bodega)</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={fillForm.sourceTankId}
                                        onChange={e => setFillForm({ ...fillForm, sourceTankId: e.target.value })}
                                        className={customSelectClass}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {tanks.filter(t => t.currentKg > 0).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} - {t.currentKg.toLocaleString()} kg</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad (KG)</label>
                                <div className="relative">
                                    <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        required
                                        placeholder="0.00"
                                        value={fillForm.kg}
                                        onChange={e => setFillForm({ ...fillForm, kg: e.target.value })}
                                        className="w-full bg-[#111111] text-white rounded-xl pl-12 pr-4 py-4 text-lg font-black outline-none focus:border-[#D9FF66] border-2 border-transparent"
                                    />
                                </div>
                                <div className="flex justify-between px-1">
                                    <p className="text-[9px] text-gray-400">Disponible Nodriza: <strong>{Math.round(nurseAvailableKg).toLocaleString()} kg</strong></p>
                                    {fillForm.kg && (
                                        <p className="text-[9px] font-bold text-[#111111]">
                                            ≈ {Math.round(parseFloat(fillForm.kg) / OIL_DENSITY).toLocaleString()} Litros
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 rounded-[24px] bg-[#D9FF66] text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                            >
                                Confirmar Entrada
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {viewingLot && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">INFORME DE TRAZABILIDAD</p>
                                <h3 className="text-3xl font-black text-[#111111] uppercase tracking-tighter">Lote {viewingLot.id}</h3>
                            </div>
                            <button onClick={() => setViewingLot(null)} className="p-3 hover:bg-white rounded-2xl text-gray-400 border border-gray-100 transition-all"><X size={24} /></button>
                        </div>

                        <div className="p-8">
                            {/* DIAGRAMA DE FLUJO */}
                            <div className="flex flex-col md:flex-row items-center gap-4 mb-8">

                                {/* PASO 1: ORIGEN */}
                                <div className="flex-1 w-full bg-gray-50 p-5 rounded-2xl border border-gray-100 relative group">
                                    <div className="absolute -top-3 left-4 bg-[#111111] text-white text-[9px] font-black uppercase px-2 py-1 rounded">Origen</div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600"><Factory size={20} /></div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fuente</p>
                                            <p className="text-sm font-black text-[#111111]">{viewingLot.sourceInfo}</p>
                                        </div>
                                    </div>
                                </div>

                                <ArrowRight size={20} className="text-gray-300 rotate-90 md:rotate-0" />

                                {/* PASO 2: PROCESO */}
                                <div className="flex-1 w-full bg-[#111111] p-5 rounded-2xl border border-gray-100 text-white relative shadow-xl">
                                    <div className="absolute -top-3 left-4 bg-[#D9FF66] text-black text-[9px] font-black uppercase px-2 py-1 rounded">Proceso</div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-white/10 rounded-xl text-[#D9FF66]"><Droplets size={20} /></div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tipo</p>
                                            <p className="text-sm font-black text-white">{viewingLot.type}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-between">
                                        <span className="text-[10px] text-gray-400">{Math.round(viewingLot.litersUsed).toLocaleString()} L</span>
                                        <span className="text-[10px] text-gray-400">{Math.round(viewingLot.kgUsed).toLocaleString()} KG</span>
                                    </div>
                                </div>

                                <ArrowRight size={20} className="text-gray-300 rotate-90 md:rotate-0" />

                                {/* PASO 3: PRODUCTO FINAL */}
                                <div className="flex-1 w-full bg-blue-50 p-5 rounded-2xl border border-blue-100 relative">
                                    <div className="absolute -top-3 left-4 bg-blue-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded">Producto</div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-sm text-blue-500"><Package size={20} /></div>
                                        <div>
                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Formato</p>
                                            <p className="text-sm font-black text-blue-900">{viewingLot.format}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-blue-800 mt-2 text-right">{viewingLot.units.toLocaleString()} Unidades</p>
                                </div>

                            </div>

                            {/* DETALLE MATERIALES */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                                <h4 className="text-xs font-black text-[#111111] uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <List size={14} /> Materiales Auxiliares Empleados
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                        <Milk size={16} className="text-gray-400" />
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Lote Botella</p>
                                            <p className="text-xs font-black text-[#111111]">{viewingLot.bottleBatch}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-400"></div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Lote Tapa</p>
                                            <p className="text-xs font-black text-[#111111]">{viewingLot.capBatch}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                        <Sticker size={16} className="text-gray-400" />
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Lote Etiqueta</p>
                                            <p className="text-xs font-black text-[#111111]">{viewingLot.labelBatch}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#111111] transition-colors">
                                    <FileText size={14} /> Descargar Certificado de Trazabilidad
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
