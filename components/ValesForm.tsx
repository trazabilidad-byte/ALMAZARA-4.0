
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Producer, OliveVariety, ValeType, Vale, ValeStatus, Hopper, Customer, CustomerType, MillingLot, Tank, PackagingLot, OilExit, ExitType, ProductionLot, OilMovement } from '../types';
import { Search, MapPin, Info, CheckCircle2, X, Factory, Percent, ChevronDown, Check, Calendar, UserCheck, RefreshCw, ShoppingCart, FlaskConical, Lock, AlertTriangle, ArrowRight, Building2, Map, Layers, FileText, Warehouse, Truck, Package, Activity, Calculator } from 'lucide-react';
import { ALMAZARA_ID } from '../src/lib/supabaseSync';

interface ValesFormProps {
    producers: Producer[];
    hoppers: Hopper[];
    vales: Vale[];
    lastValeId: number;
    customers: Customer[];
    // Nuevas props para trazabilidad
    millingLots?: MillingLot[];
    productionLots?: ProductionLot[]; // Recibimos Lotes de Producción
    tanks?: Tank[];
    packagingLots?: PackagingLot[];
    oilExits?: OilExit[];
    oilMovements?: OilMovement[];
    onSave: (vale: Vale) => void;
    onCancel: () => void;
    editVale?: Vale | null;
    readOnly?: boolean;
    onViewLot?: (lotId: string) => void;
    onViewProductionLot?: (lpId: string) => void; // Callback para ver Tanda
    onViewTank?: (tankId: number) => void;
}

export const ValesForm: React.FC<ValesFormProps> = ({
    producers, hoppers, vales, lastValeId, customers,
    millingLots = [], productionLots = [], tanks = [], packagingLots = [], oilExits = [], oilMovements = [],
    onSave, onCancel, editVale, readOnly = false,
    onViewLot, onViewProductionLot, onViewTank
}) => {

    // LÓGICA DE AGRUPACIÓN CORREGIDA
    const getInitialUsage = (hopperId: number) => {
        const relevantVales = vales.filter(v =>
            v.ubicacion_id === hopperId &&
            v.tipo_vale === ValeType.MOLTURACION
        );

        const activeBatch = relevantVales.find(v => v.estado === ValeStatus.PENDIENTE);
        if (activeBatch) {
            return activeBatch.uso_contador;
        }

        if (relevantVales.length > 0) {
            const maxUse = Math.max(...relevantVales.map(v => v.uso_contador));
            return maxUse + 1;
        }

        return 1;
    };

    const [formData, setFormData] = useState({
        tipo_vale: editVale?.tipo_vale || ValeType.MOLTURACION,
        productor_id: editVale?.productor_id || '',
        parcela: editVale?.parcela || '',
        comprador: editVale?.comprador || '',
        fecha: editVale?.fecha_entrada ? new Date(editVale.fecha_entrada).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        kilos_brutos: editVale?.kilos_brutos || 0,
        impurezas_kg: editVale?.impurezas_kg || 0,
        variedad: editVale?.variedad || OliveVariety.PICUAL,
        ubicacion_id: editVale?.ubicacion_id || (hoppers.length > 0 ? hoppers[0].id : 1),
        uso_contador: editVale?.uso_contador || getInitialUsage(editVale?.ubicacion_id || (hoppers.length > 0 ? hoppers[0].id : 1)),
        rendimiento_graso: editVale?.analitica?.rendimiento_graso || 0,
        acidez: editVale?.analitica?.acidez || 0
    });

    const [originalIds, setOriginalIds] = useState({
        id: editVale ? editVale.id : crypto.randomUUID(),
        id_vale: editVale ? editVale.id_vale : lastValeId + 1,
        almazaraId: editVale ? editVale.almazaraId : (ALMAZARA_ID || ''),
        estado: editVale ? editVale.estado : ValeStatus.PENDIENTE,
        milling_lot_id: editVale?.milling_lot_id,
        campaign: editVale?.campaign
    });

    useEffect(() => {
        if (editVale) {
            setFormData({
                tipo_vale: editVale.tipo_vale,
                productor_id: editVale.productor_id,
                parcela: editVale.parcela || '',
                comprador: editVale.comprador || '',
                fecha: new Date(editVale.fecha_entrada).toISOString().split('T')[0],
                kilos_brutos: editVale.kilos_brutos,
                impurezas_kg: editVale.impurezas_kg,
                variedad: editVale.variedad,
                ubicacion_id: editVale.ubicacion_id,
                uso_contador: editVale.uso_contador,
                rendimiento_graso: editVale.analitica?.rendimiento_graso || 0,
                acidez: editVale.analitica?.acidez || 0
            });
            setOriginalIds({
                id: editVale.id,
                id_vale: editVale.id_vale,
                almazaraId: editVale.almazaraId,
                estado: editVale.estado,
                milling_lot_id: editVale.milling_lot_id,
                campaign: editVale.campaign
            });
            setSearchTerm(editVale.productor_name);

            // BUSCAR NOMBRE DE COMPRADOR
            const buyer = customers.find(c => c.id === editVale.comprador);
            setCustomerSearchTerm(buyer?.name || editVale.comprador_name || '');
        }
    }, [editVale, customers]);

    const [searchTerm, setSearchTerm] = useState(editVale?.productor_name || '');
    const [customerSearchTerm, setCustomerSearchTerm] = useState(() => {
        if (editVale?.comprador) {
            const buyer = customers.find(c => c.id === editVale.comprador);
            if (buyer) return buyer.name;
        }
        return editVale?.comprador_name || '';
    });
    const [showVarietyWarning, setShowVarietyWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVarietyOpen, setIsVarietyOpen] = useState(false);
    const [showParcelSuggestions, setShowParcelSuggestions] = useState(false);

    const varietyRef = useRef<HTMLDivElement>(null);
    const parcelRef = useRef<HTMLDivElement>(null);

    const isDirectSale = formData.tipo_vale === ValeType.VENTA_DIRECTA;
    const displayId = originalIds.id_vale;

    // --- CÁLCULOS DE TRAZABILIDAD COMPLETA ---
    const traceInfo = useMemo(() => {
        if (!editVale) return null;

        // 1. SI ES VENTA DIRECTA, BYPASS TODO LO DEMÁS
        if (editVale.tipo_vale === ValeType.VENTA_DIRECTA) {
            const buyer = customers.find(c => c.id === editVale.comprador);
            return {
                isDirectSale: true,
                buyerName: buyer?.name || editVale.comprador_name || editVale.comprador || 'Comprador Externo',
                millingBatch: null,
                productionBatch: null,
                tank: null,
                allocatedOilKg: 0,
                contributionPercent: 0,
                exits: [],
                hasNurseTransfer: false
            };
        }

        // 2. MOLTURACIÓN (MT)
        const millingBatch = millingLots.find(m => m.vales_ids.includes(editVale.id_vale));
        if (!millingBatch) return { isDirectSale: false, millingBatch: null, productionBatch: null, tank: null, exits: [], hasNurseTransfer: false };

        // 3. PRODUCCIÓN (LP) / BODEGA
        const productionBatch = productionLots.find(p => p.millingLotsIds.includes(millingBatch.id));
        const tank = productionBatch ? tanks.find(t => t.id === productionBatch.targetTankId) : null;

        // Calcular ACEITE ADJUDICADO REAL (KG)
        let allocatedOilKg = 0;
        let contributionPercent = 0;

        if (millingBatch && millingBatch.kilos_aceite_real > 0 && millingBatch.kilos_aceituna > 0) {
            // Factor de Rendimiento Industrial Real del Lote
            const yieldFactor = millingBatch.kilos_aceite_real / millingBatch.kilos_aceituna;
            allocatedOilKg = editVale.kilos_netos * yieldFactor;

            if (millingBatch.kilos_aceite_real > 0) {
                contributionPercent = (allocatedOilKg / millingBatch.kilos_aceite_real) * 100;
            }
        }

        // 4. SALIDA / VENTA (MEJORADO: RASTREO COMPLETO)
        const exits: any[] = [];

        if (tank) {
            const batchDate = productionBatch ? new Date(productionBatch.fecha) : (millingBatch ? new Date(millingBatch.fecha) : new Date(editVale.fecha_entrada));

            // A. Buscar Salidas Directas (Sin Filtrar) del Depósito a Packaging
            const directPackLots = packagingLots.filter(p => {
                const pDate = new Date(p.date);
                return pDate >= batchDate && p.sourceInfo.includes(`Bodega D${tank.id}`);
            });
            directPackLots.forEach(p => exits.push({ type: 'PACKAGING', info: p, label: 'Envasado S/F' }));

            // B. Buscar Trasiegos a Nodriza desde este Depósito
            const nurseTransfers = oilMovements.filter(m =>
                m.source_tank_id === tank.id &&
                m.target_tank_id === 999 &&
                new Date(m.date) >= batchDate
            );

            // C. Buscar Lotes de Envasado (Filtrado) que vienen de esos Trasiegos
            nurseTransfers.forEach(transfer => {
                const relatedPacks = packagingLots.filter(p =>
                    p.sourceInfo.includes(`Nodriza (Lote ${transfer.batch_id})`)
                );
                relatedPacks.forEach(p => exits.push({ type: 'PACKAGING', info: p, label: 'Envasado Filtrado' }));
            });

            // D. Buscar Salidas a Granel (Cisternas) del Depósito
            const bulkExits = oilExits.filter(e => {
                const eDate = new Date(e.date);
                return eDate >= batchDate && e.tank_id === tank.id && e.type === ExitType.CISTERNA;
            });
            bulkExits.forEach(e => exits.push({ type: 'BULK', info: e, label: 'Venta Cisterna' }));
        }

        return {
            isDirectSale: false,
            millingBatch,
            productionBatch,
            tank,
            allocatedOilKg,
            contributionPercent,
            exits,
            hasNurseTransfer: oilMovements.some(m => tank && m.source_tank_id === tank.id && m.target_tank_id === 999 && new Date(m.date) >= (productionBatch ? new Date(productionBatch.fecha) : new Date()))
        };
    }, [editVale, millingLots, productionLots, tanks, packagingLots, oilExits, oilMovements]);


    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (varietyRef.current && !varietyRef.current.contains(e.target as Node)) setIsVarietyOpen(false);
            if (parcelRef.current && !parcelRef.current.contains(e.target as Node)) setShowParcelSuggestions(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const hopperCurrentVariety = useMemo(() => {
        if (isDirectSale) return null;
        const activeBatch = vales.filter(v =>
            v.ubicacion_id === formData.ubicacion_id &&
            v.estado === ValeStatus.PENDIENTE &&
            v.uso_contador === formData.uso_contador &&
            v.tipo_vale === ValeType.MOLTURACION
        );
        return activeBatch.length > 0 ? activeBatch[0].variedad : null;
    }, [formData.ubicacion_id, formData.uso_contador, vales, isDirectSale]);

    const handleHopperChange = (id: number) => {
        if (readOnly) return;
        const suggestedUsage = getInitialUsage(id);
        setFormData(prev => ({
            ...prev,
            ubicacion_id: id,
            uso_contador: suggestedUsage
        }));
    };

    const kilosNetos = useMemo(() => {
        const net = formData.kilos_brutos - formData.impurezas_kg;
        return net > 0 ? net : 0;
    }, [formData.kilos_brutos, formData.impurezas_kg]);

    const isValidWeight = kilosNetos > 0;

    const filteredProducers = useMemo(() => {
        if (!searchTerm || formData.productor_id) return [];
        return producers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.nif.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, producers, formData.productor_id]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm || formData.comprador) return [];
        return customers.filter(c =>
            (c.type === CustomerType.COMPRADOR_ACEITUNA || c.type === CustomerType.MAYORISTA) &&
            (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.cif.toLowerCase().includes(customerSearchTerm.toLowerCase()))
        );
    }, [customerSearchTerm, customers, formData.comprador]);

    const parcelSuggestions = useMemo(() => {
        if (!formData.parcela || formData.parcela.length < 2) return [];
        const allParcels: string[] = Array.from(new Set(vales.map(v => v.parcela).filter((p: string) => !!p)));
        return allParcels.filter((p: string) => p.toLowerCase().includes(formData.parcela.toLowerCase())).slice(0, 5);
    }, [formData.parcela, vales]);

    useEffect(() => {
        if (editVale?.comprador) {
            const cust = customers.find(c => c.id === editVale.comprador);
            if (cust) setCustomerSearchTerm(cust.name);
        }
    }, [editVale, customers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly || !formData.productor_id) return;
        if (isDirectSale && !formData.comprador) return;
        if (!isValidWeight) return; // Bloqueo adicional por seguridad

        if (!isDirectSale && hopperCurrentVariety && hopperCurrentVariety !== formData.variedad) {
            setShowVarietyWarning(true);
            return;
        }

        processSave();
    };

    const processSave = () => {
        setIsSubmitting(true);
        const producer = producers.find(p => p.id === formData.productor_id);
        const newVale: Vale = {
            id: originalIds.id,
            id_vale: originalIds.id_vale,
            almazaraId: originalIds.almazaraId || ALMAZARA_ID,
            tipo_vale: formData.tipo_vale,
            productor_id: formData.productor_id,
            productor_name: producer?.name || searchTerm || 'Desconocido',
            parcela: formData.parcela,
            comprador: formData.comprador,
            comprador_name: customerSearchTerm,
            fecha_entrada: new Date(formData.fecha).toISOString(),
            kilos_brutos: formData.kilos_brutos,
            impurezas_kg: formData.impurezas_kg,
            kilos_netos: kilosNetos,
            variedad: formData.variedad,
            ubicacion_id: formData.ubicacion_id,
            uso_contador: formData.uso_contador,
            estado: originalIds.estado,
            analitica: {
                rendimiento_graso: Number(formData.rendimiento_graso),
                acidez: Number(formData.acidez)
            },
            campaign: originalIds.campaign
        };
        setTimeout(() => { onSave(newVale); setIsSubmitting(false); }, 600);
    };

    const inputClasses = `w-full bg-[#111111] border-2 border-transparent focus:border-[#D9FF66] rounded-[24px] px-6 py-4 text-sm font-black text-white transition-all outline-none placeholder:text-gray-600 ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className="bg-white rounded-[32px] md:rounded-[40px] custom-shadow p-5 md:p-8 max-w-5xl mx-auto border border-gray-100 animate-in zoom-in duration-300 w-full relative min-h-[500px]">

            {showVarietyWarning && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl text-center">
                        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-4">¡Conflicto de Variedad!</h3>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            La tolva <strong>T{formData.ubicacion_id}</strong> (Uso {formData.uso_contador}) ya contiene aceituna de variedad <span className="font-black text-black">{hopperCurrentVariety}</span>.
                            Estás intentando registrar <span className="font-black text-black">{formData.variedad}</span> en el mismo lote.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={processSave} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-orange-600 transition-all">Mezclar Variedades</button>
                            <button onClick={() => setShowVarietyWarning(false)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar y Corregir</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start md:items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-gray-50 gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-[#111111] uppercase tracking-tighter">
                        {readOnly ? `Detalle de Vale #${displayId}` : (editVale ? `Editar Vale #${displayId}` : `Registro de Entrada #${displayId}`)}
                    </h2>
                    <p className="text-gray-400 font-medium mt-1">Campaña Activa 2025/2026</p>
                </div>
                <button onClick={onCancel} className="p-2.5 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                {/* ... FORMULARIO (Se mantiene igual, oculto por brevedad) ... */}
                {/* Aquí iría el mismo código del formulario de entrada que no ha cambiado */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-[#F4F7F4] p-4 rounded-[24px] border border-gray-100">
                            <button type="button" disabled={readOnly} onClick={() => setFormData(p => ({ ...p, tipo_vale: isDirectSale ? ValeType.MOLTURACION : ValeType.VENTA_DIRECTA, comprador: '' }))} className={`w-full flex items-center justify-between px-5 py-4 rounded-[18px] transition-all border-2 ${isDirectSale ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-transparent text-gray-600'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isDirectSale ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>{isDirectSale ? <ShoppingCart size={18} /> : <Factory size={18} />}</div>
                                    <div className="text-left"><p className="text-xs font-black uppercase">{isDirectSale ? 'Venta Directa Activa' : 'Para Molturación'}</p></div>
                                </div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-all ${isDirectSale ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isDirectSale ? 'translate-x-5' : 'translate-x-0'}`} /></div>
                            </button>
                        </div>

                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label><input type="date" disabled={readOnly} value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className={inputClasses} required /></div>

                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Productor (Vendedor)</label>
                            <div className="relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="text" disabled={readOnly} placeholder="Buscar socio..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (formData.productor_id) setFormData({ ...formData, productor_id: '' }); }} className={`${inputClasses} pl-14`} required />
                                {formData.productor_id && <CheckCircle2 className="absolute right-5 top-1/2 -translate-y-1/2 text-[#D9FF66]" size={20} />}
                            </div>
                            {!readOnly && filteredProducers.length > 0 && (
                                <div className="absolute z-30 w-full mt-2 bg-[#111111] rounded-[24px] shadow-2xl border border-white/10 p-2 max-h-56 overflow-y-auto">
                                    {filteredProducers.map(p => (
                                        <button key={p.id} type="button" onClick={() => { setFormData({ ...formData, productor_id: p.id }); setSearchTerm(p.name); }} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors mb-1 last:mb-0"><p className="font-black text-sm text-white">{p.name}</p><p className="text-[10px] text-gray-500 uppercase font-black">{p.nif}</p></button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isDirectSale && (
                            <div className="space-y-2 relative animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Comprador (Cliente Final)</label>
                                <div className="relative">
                                    <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" disabled={readOnly} placeholder="Buscar cliente o mayorista..." value={customerSearchTerm} onChange={(e) => { setCustomerSearchTerm(e.target.value); if (formData.comprador) setFormData({ ...formData, comprador: '' }); }} className={`${inputClasses} pl-14 border-blue-900/30`} required={isDirectSale} />
                                    {formData.comprador && <CheckCircle2 className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-400" size={20} />}
                                </div>
                                {!readOnly && filteredCustomers.length > 0 && (
                                    <div className="absolute z-30 w-full mt-2 bg-[#111111] rounded-[24px] shadow-2xl border border-blue-900/50 p-2 max-h-56 overflow-y-auto">
                                        {filteredCustomers.map(c => (
                                            <button key={c.id} type="button" onClick={() => { setFormData({ ...formData, comprador: c.id }); setCustomerSearchTerm(c.name); }} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors mb-1 last:mb-0"><p className="font-black text-sm text-white">{c.name}</p><p className="text-[10px] text-blue-500 uppercase font-black">{c.cif}</p></button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {!isDirectSale && (
                            <div className="bg-[#111111] p-5 rounded-[32px] shadow-2xl border border-white/5 w-full">
                                <div className="flex flex-wrap justify-between items-end gap-x-4 gap-y-4">
                                    <div className="flex flex-col gap-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            ASIGNACIÓN DE TOLVA T{formData.ubicacion_id}
                                        </p>
                                        <div className="flex gap-2 flex-wrap">
                                            {hoppers.map(hopper => (
                                                <button
                                                    key={hopper.id}
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => handleHopperChange(hopper.id)}
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-all border-2 ${formData.ubicacion_id === hopper.id
                                                        ? 'bg-[#D9FF66] text-black border-[#D9FF66] shadow-[0_0_15px_rgba(217,255,102,0.5)] scale-110 z-10'
                                                        : 'bg-[#222] border-transparent text-gray-600 hover:bg-[#333] hover:text-gray-400'
                                                        }`}
                                                >
                                                    T{hopper.id}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 ml-auto">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                            IDENTIFICADOR USO
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-5xl font-black text-[#D9FF66] tracking-tighter leading-none">
                                                {formData.ubicacion_id.toString().padStart(2, '0')}/
                                            </span>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    disabled={readOnly}
                                                    value={formData.uso_contador}
                                                    onChange={(e) => setFormData({ ...formData, uso_contador: parseInt(e.target.value) || 1 })}
                                                    className="w-16 h-14 bg-[#222] rounded-xl text-center text-3xl font-black text-white outline-none focus:bg-[#333] transition-all border-2 border-transparent focus:border-[#D9FF66]/30"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-7 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-[#111111] p-7 rounded-[32px] border border-white/5 shadow-2xl">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 block">Pesaje (KG)</label>
                                <div className="space-y-4">
                                    <div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-500">BRUTO</span><input type="number" disabled={readOnly} value={formData.kilos_brutos || ''} onChange={(e) => setFormData({ ...formData, kilos_brutos: parseFloat(e.target.value) || 0 })} className="w-full bg-white/5 border-2 border-transparent focus:border-[#D9FF66] rounded-2xl pl-20 pr-5 py-4 text-xl font-black text-white outline-none" /></div>
                                    <div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-500">IMPUREZAS</span><input type="number" disabled={readOnly} value={formData.impurezas_kg || ''} onChange={(e) => setFormData({ ...formData, impurezas_kg: parseFloat(e.target.value) || 0 })} className="w-full bg-white/5 border-2 border-transparent focus:border-red-900/50 rounded-2xl pl-24 pr-5 py-4 text-xl font-black text-white outline-none" /></div>
                                    <div className="pt-6 border-t border-white/10 flex justify-between items-center"><p className="text-[10px] font-black text-gray-400 uppercase">Kilos Netos</p><p className="text-3xl font-black text-[#D9FF66]">{kilosNetos.toLocaleString()} <span className="text-[10px] text-gray-500">KG</span></p></div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 relative" ref={varietyRef}>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Variedad</label>
                                    <button
                                        type="button"
                                        onClick={() => !readOnly && setIsVarietyOpen(!isVarietyOpen)}
                                        className={`${inputClasses} flex items-center justify-between hover:border-[#D9FF66]/30 text-left`}
                                    >
                                        <span className="font-black uppercase">{formData.variedad}</span>
                                        <ChevronDown size={20} className={`text-gray-500 transition-transform ${isVarietyOpen ? 'rotate-180 text-[#D9FF66]' : ''}`} />
                                    </button>

                                    {isVarietyOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-[#111111] rounded-[24px] border border-white/10 shadow-2xl p-2 animate-in fade-in slide-in-from-top-2">
                                            {Object.values(OliveVariety).map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => { setFormData({ ...formData, variedad: v }); setIsVarietyOpen(false); }}
                                                    className={`w-full text-left px-5 py-3 rounded-xl transition-all flex justify-between items-center ${formData.variedad === v ? 'bg-[#D9FF66] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <span className="font-black uppercase text-xs">{v}</span>
                                                    {formData.variedad === v && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 relative" ref={parcelRef}>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Finca / Parcela</label>
                                    <div className="relative">
                                        <Map className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            disabled={readOnly}
                                            placeholder="Ej: Los Olivos - Parcela 22"
                                            value={formData.parcela}
                                            onFocus={() => !readOnly && setShowParcelSuggestions(true)}
                                            onChange={e => setFormData({ ...formData, parcela: e.target.value })}
                                            className={`${inputClasses} pl-14`}
                                        />
                                    </div>
                                    {showParcelSuggestions && parcelSuggestions.length > 0 && (
                                        <div className="absolute z-40 w-full mt-2 bg-[#111111] rounded-[24px] border border-white/10 shadow-2xl p-2 animate-in fade-in">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Registros Anteriores</p>
                                            {parcelSuggestions.map(sug => (
                                                <button
                                                    key={sug}
                                                    type="button"
                                                    onClick={() => { setFormData({ ...formData, parcela: sug }); setShowParcelSuggestions(false); }}
                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                                                >
                                                    <MapPin size={12} className="text-gray-600" />
                                                    {sug}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {!isDirectSale && (
                                    <div className="bg-[#111111] p-6 rounded-[32px] border border-white/5 space-y-4 shadow-2xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><FlaskConical size={14} /> Laboratorio</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[8px] font-black text-gray-500 uppercase ml-1">Rend. %</label><input type="number" step="0.01" disabled={readOnly} value={formData.rendimiento_graso || ''} onChange={(e) => setFormData({ ...formData, rendimiento_graso: parseFloat(e.target.value) || 0 })} className="w-full bg-white/5 rounded-xl px-4 py-3 text-white font-black outline-none border border-transparent focus:border-[#D9FF66]" /></div>
                                            <div><label className="text-[8px] font-black text-gray-500 uppercase ml-1">Acid. º</label><input type="number" step="0.01" disabled={readOnly} value={formData.acidez || ''} onChange={(e) => setFormData({ ...formData, acidez: parseFloat(e.target.value) || 0 })} className="w-full bg-white/5 rounded-xl px-4 py-3 text-white font-black outline-none border border-transparent focus:border-[#D9FF66]" /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!readOnly ? (
                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.productor_id || (isDirectSale && !formData.comprador) || !isValidWeight}
                                    className={`w-full py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${isValidWeight ? 'bg-[#D9FF66] text-black hover:scale-[1.02] active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                >
                                    {isSubmitting ? 'Guardando...' : <>{editVale ? 'Actualizar Vale' : 'Registrar Entrada'} <ArrowRight size={18} /></>}
                                </button>
                                {!isValidWeight && (
                                    <p className="text-center text-[10px] font-bold text-red-500 animate-pulse bg-red-50 py-2 rounded-xl border border-red-100">
                                        Debes introducir los kilos para continuar
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex justify-center pt-4">
                                <p className="text-gray-400 text-xs font-bold flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                                    <Info size={16} /> Modo Lectura: Edita desde el Histórico
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </form>

            {/* --- SECCIÓN NUEVA: PASAPORTE DE TRAZABILIDAD (ACTUALIZADO) --- */}
            {editVale && traceInfo && (
                <div className="mt-8 border-t border-gray-100 pt-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#111111] text-[#D9FF66] rounded-xl"><Activity size={20} /></div>
                        <h3 className="text-xl font-black text-[#111111] uppercase tracking-tighter">Historial de Vida (Trazabilidad)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {traceInfo.isDirectSale ? (
                            <div className="col-span-full bg-[#111111] p-10 rounded-[40px] text-white border-2 border-[#D9FF66] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <ShoppingCart size={120} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-[#D9FF66] text-black rounded-xl">
                                            <ShoppingCart size={24} />
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-widest text-[#D9FF66]">Venta Directa de Aceituna</span>
                                    </div>
                                    <h3 className="text-4xl font-black tracking-tighter mb-4 uppercase">Aceituna Vendida en Origen</h3>
                                    <p className="text-gray-400 font-bold max-w-2xl mb-8">
                                        Este vale no registra trazabilidad de extracción de aceite en esta almazara porque la aceituna fue vendida directamente a un tercero externo antes de entrar en producción.
                                    </p>
                                    <div className="flex flex-wrap gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Comprador / Destino</p>
                                            <p className="text-xl font-black text-white uppercase">{traceInfo.buyerName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Fecha Operación</p>
                                            <p className="text-xl font-black text-white">{new Date(editVale.fecha_entrada).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Estado Operación</p>
                                            <span className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-black uppercase">Venta Finalizada</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* FASE 1: RECEPCIÓN / MOLTURACIÓN */}
                                <div className={`p-6 rounded-[32px] border transition-all ${traceInfo.millingBatch ? 'bg-white border-[#D9FF66] shadow-lg' : 'bg-gray-50 border-dashed border-gray-200 opacity-60'}`}>
                                    <div className="flex items-center gap-2 mb-4 text-orange-600">
                                        <Factory size={18} />
                                        <span className="text-xs font-black uppercase">Seguimiento Molienda</span>
                                    </div>
                                    {traceInfo.millingBatch ? (
                                        <div>
                                            <button
                                                onClick={() => onViewLot && onViewLot(traceInfo.millingBatch!.id)}
                                                className="text-2xl font-black text-[#111111] uppercase hover:underline decoration-[#D9FF66] decoration-4 underline-offset-4 mb-1 block"
                                            >
                                                {traceInfo.millingBatch!.id}
                                            </button>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(traceInfo.millingBatch!.fecha).toLocaleDateString()}</p>

                                            <div className="mt-4 p-2 bg-gray-50 rounded-xl border border-gray-100">
                                                <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Aceituna Neta</p>
                                                <p className="text-sm font-black text-[#111111]">{editVale.kilos_netos.toLocaleString()} kg</p>
                                            </div>

                                            <div className="mt-2 flex gap-2">
                                                <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-[9px] font-black uppercase border border-orange-100">Procesado</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-sm font-bold text-gray-400">Pendiente de molturación</p>
                                        </div>
                                    )}
                                </div>

                                {/* FASE 2.5: PRODUCCIÓN (LP) - NUEVA TARJETA */}
                                <div className={`p-6 rounded-[32px] border transition-all ${traceInfo.productionBatch ? 'bg-white border-purple-200 shadow-lg' : 'bg-gray-50 border-dashed border-gray-200 opacity-60'}`}>
                                    <div className="flex items-center gap-2 mb-4 text-purple-600">
                                        <Calculator size={18} />
                                        <span className="text-xs font-black uppercase">Producción (Tanda)</span>
                                    </div>
                                    {traceInfo.productionBatch ? (
                                        <div>
                                            <button
                                                onClick={() => onViewProductionLot && onViewProductionLot(traceInfo.productionBatch!.id)}
                                                className="text-2xl font-black text-[#111111] uppercase hover:text-purple-600 transition-colors mb-1 block"
                                            >
                                                {traceInfo.productionBatch!.id}
                                            </button>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(traceInfo.productionBatch!.fecha).toLocaleDateString()}</p>

                                            <div className="mt-4 p-2 bg-purple-50 rounded-xl border border-purple-100">
                                                <p className="text-[9px] text-purple-800 font-black uppercase mb-1">Total Tanda</p>
                                                <p className="text-sm font-black text-[#111111]">{traceInfo.productionBatch!.totalRealOilKg.toLocaleString()} kg Aceite</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-sm font-bold text-gray-400">Pendiente de cierre tanda</p>
                                        </div>
                                    )}
                                </div>

                                {/* FASE 3: BODEGA (Depósito) */}
                                <div className={`p-6 rounded-[32px] border transition-all ${traceInfo.tank ? 'bg-white border-blue-200 shadow-lg' : 'bg-gray-50 border-dashed border-gray-200 opacity-60'}`}>
                                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                                        <Warehouse size={18} />
                                        <span className="text-xs font-black uppercase">Ubicación Bodega</span>
                                    </div>
                                    {traceInfo.tank ? (
                                        <div>
                                            <button
                                                onClick={() => onViewTank && onViewTank(traceInfo.tank!.id)}
                                                className="text-2xl font-black text-[#111111] uppercase hover:text-blue-600 transition-colors mb-1 block"
                                            >
                                                {traceInfo.tank.name}
                                            </button>

                                            <div className="mt-4">
                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Aceite Adjudicado (kg)</p>
                                                <p className="text-xl font-black text-[#111111]">{Math.round(traceInfo.allocatedOilKg).toLocaleString()} kg</p>

                                                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-blue-500 h-full" style={{ width: `${Math.min(traceInfo.contributionPercent, 100)}%` }}></div>
                                                </div>
                                                <p className="text-[9px] text-blue-600 font-bold mt-1 text-right">{traceInfo.contributionPercent.toFixed(2)}% del lote total</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-sm font-bold text-gray-400">Aceite no ubicado</p>
                                        </div>
                                    )}
                                </div>

                                {/* FASE 4: SALIDA / VENTA (MEJORADO) */}
                                <div className={`p-6 rounded-[32px] border transition-all ${traceInfo.exits.length > 0 ? 'bg-[#111111] text-white shadow-xl' : 'bg-white border-gray-100'}`}>
                                    <div className="flex items-center gap-2 mb-4 text-[#D9FF66]">
                                        <Truck size={18} />
                                        <span className="text-xs font-black uppercase">Salida / Venta</span>
                                    </div>

                                    <div className="space-y-4">
                                        {traceInfo.hasNurseTransfer && (
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                                                <div className="p-1.5 bg-[#D9FF66] text-black rounded-lg"><RefreshCw size={12} className="animate-spin-slow" /></div>
                                                <div>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase">Proceso Int.</p>
                                                    <p className="text-[10px] font-bold text-white uppercase">Enviado a Envasadora</p>
                                                </div>
                                            </div>
                                        )}

                                        {traceInfo.exits.length > 0 ? (
                                            <div className="space-y-3">
                                                {traceInfo.exits.map((exit: any, idx: number) => (
                                                    <div key={idx} className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-black text-[#D9FF66] uppercase tracking-tighter">
                                                                {exit.info.id || exit.info.deliveryNote || 'S/N'}
                                                            </p>
                                                            <span className="text-[8px] font-black px-2 py-0.5 bg-white/10 rounded uppercase text-gray-300">
                                                                {exit.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <p className="text-[10px] text-gray-400 font-bold">{new Date(exit.info.date).toLocaleDateString()}</p>
                                                            <p className="text-[10px] text-white font-black">{exit.type === 'PACKAGING' ? `${exit.info.units} uds` : `${exit.info.kg} kg`}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-sm font-black text-green-900 uppercase bg-green-50 px-3 py-1 rounded-lg inline-block border border-green-200">En stock (Bodega)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
