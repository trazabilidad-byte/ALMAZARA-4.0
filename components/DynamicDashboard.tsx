
import React, { useState, useMemo } from 'react';
import { Tank, Hopper, Vale, MillingLot, AppConfig, AuxStock, SalesOrder, ValeType, Producer, OilMovement, OilExit, ExitType, ProductionLot } from '../types';

import { KPICard } from './KPICard';
import { TankGrid } from './TankGrid';
import { Layers, Factory, Droplets, TrendingUp, Receipt, Scale, AlertTriangle, ShoppingCart, UserCheck, Package, CheckCircle2, X, History, User, ArrowRight, Truck, MapPin, BarChart3, TrendingDown, CalendarRange, Plus, Archive } from 'lucide-react';
import { TankPassport } from './TankPassport';


interface DynamicDashboardProps {
    config: AppConfig;
    tanks: Tank[];
    hoppers: Hopper[];
    vales: Vale[];
    millingLots: MillingLot[];
    auxStock: AuxStock[];
    salesOrders: SalesOrder[];
    producers: Producer[];
    oilMovements: OilMovement[];
    oilExits: OilExit[];
    productionLots: ProductionLot[];

    onExit: (tank: Tank) => void;
    onStartLot: (tank: Tank) => void;
    onViewTankDetails: (tank: Tank) => void;
    onViewValeDetails: (vale: Vale) => void;
    onViewLot?: (lotId: string) => void;
    onViewProducer?: (producerId: string) => void;
    onViewExit?: (exit: OilExit) => void;
    setActiveTab: (tab: string) => void;
}

type TimeFilter = 'all' | 'today' | 'week';

export const DynamicDashboard: React.FC<DynamicDashboardProps> = ({
    config,
    tanks,
    hoppers,
    vales,
    millingLots,
    auxStock,
    salesOrders,
    producers,
    oilMovements,
    oilExits,
    productionLots,

    onExit,
    onStartLot,
    onViewTankDetails,
    onViewValeDetails,
    onViewLot,
    onViewProducer,
    onViewExit,
    setActiveTab
}) => {
    const [selectedTank, setSelectedTank] = useState<Tank | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [showParcelAnalysis, setShowParcelAnalysis] = useState(false);
    const [showYieldAnalysis, setShowYieldAnalysis] = useState(false);

    // --- HELPERS FILTRO TEMPORAL ---
    const filterDate = (dateStr: string) => {
        if (timeFilter === 'all') return true;
        const date = new Date(dateStr);
        const now = new Date();

        if (timeFilter === 'today') {
            return date.toDateString() === now.toDateString();
        }
        if (timeFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return date >= weekAgo && date <= now;
        }
        return true;
    };

    // --- CALCULO DE DATOS (KPIs) ---
    const kpis = useMemo(() => {
        // Aplicar filtros
        const filteredVales = vales.filter(v => filterDate(v.fecha_entrada));
        const filteredLots = millingLots.filter(l => filterDate(l.fecha));

        const valesMolturacion = filteredVales.filter(v => v.tipo_vale === ValeType.MOLTURACION);
        const totalRecolectada = filteredVales.reduce((acc, v) => acc + v.kilos_netos, 0);
        const totalMolturada = filteredLots.reduce((acc, l) => acc + l.kilos_aceituna, 0);
        const totalAceiteProducido = filteredLots.reduce((acc, l) => acc + l.kilos_aceite_real, 0);

        // Rendimiento: Si hay filtro, calculamos sobre los lotes filtrados
        const rendimientoMedio = totalMolturada > 0 ? (totalAceiteProducido / totalMolturada * 100).toFixed(2) : "0.00";

        const valesRegistrados = filteredVales.length;
        const aceiteEnBodega = tanks.reduce((acc, t) => acc + t.currentKg, 0);
        const capacidadTotalTanks = tanks.reduce((acc, t) => acc + t.maxCapacityKg, 0);
        const porcentajeOcupacion = capacidadTotalTanks > 0 ? Math.round((aceiteEnBodega / capacidadTotalTanks) * 100) : 0;

        return { totalRecolectada, totalMolturada, totalAceiteProducido, rendimientoMedio, valesRegistrados, aceiteEnBodega, porcentajeOcupacion };
    }, [vales, millingLots, tanks, timeFilter]);

    // --- CÁLCULO DE ANÁLISIS DE PARCELA ---
    const parcelAnalysis = useMemo(() => {
        const breakdown: Record<string, number> = {};
        const filteredVales = vales.filter(v => filterDate(v.fecha_entrada));

        filteredVales.forEach(v => {
            const key = v.parcela || 'Sin Finca';
            breakdown[key] = (breakdown[key] || 0) + v.kilos_netos;
        });

        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
        return Object.entries(breakdown)
            .map(([name, kg]) => ({ name, kg, percent: total > 0 ? (kg / total) * 100 : 0 }))
            .sort((a, b) => b.kg - a.kg)
            .slice(0, 10); // Top 10
    }, [vales, timeFilter]);

    // --- CÁLCULO DE DESVIACIÓN RENDIMIENTO ---
    const yieldAnalysis = useMemo(() => {
        const filteredLots = millingLots.filter(l => filterDate(l.fecha));
        let totalTeorico = 0;
        let totalReal = 0;

        filteredLots.forEach(l => {
            totalTeorico += l.kilos_aceite_esperado;
            totalReal += l.kilos_aceite_real;
        });

        const diff = totalReal - totalTeorico;
        const deviationPercent = totalTeorico > 0 ? (diff / totalTeorico) * 100 : 0;

        return { totalTeorico, totalReal, diff, deviationPercent };
    }, [millingLots, timeFilter]);

    const pendingVales = useMemo(() => vales.filter(v => v.estado === 'Pendiente'), [vales]);

    const activeHoppersData = useMemo(() => {
        return hoppers.map(h => {
            const hopperVales = vales.filter(v =>
                v.estado === 'Pendiente' &&
                Number(v.ubicacion_id) === Number(h.id) &&
                v.tipo_vale === ValeType.MOLTURACION &&
                !v.milling_lot_id
            );

            if (hopperVales.length === 0) return { ...h, status: 'empty', activeBatch: null, queuedBatches: [] };

            const usages = Array.from(new Set(hopperVales.map(v => v.uso_contador))).sort((a, b) => Number(a) - Number(b));

            const batches = usages.map(uso => {
                const batchVales = hopperVales.filter(v => v.uso_contador === uso);
                const totalKg = batchVales.reduce((acc, v) => acc + v.kilos_netos, 0);

                const theoreticalOil = batchVales.reduce((acc, v) => {
                    let yieldPercent = v.analitica.rendimiento_graso;
                    if (!yieldPercent || yieldPercent === 0) {
                        yieldPercent = config.varietySettings?.[v.variedad]?.defaultYield || 18;
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

            const activeBatch = batches[0];
            const queuedBatches = batches.slice(1);

            return { ...h, status: 'active', activeBatch, queuedBatches };
        });
    }, [hoppers, pendingVales, config]);

    const tankLots = useMemo(() => {
        if (!selectedTank) return [];
        return millingLots.filter(lot => lot.deposito_id === selectedTank.id);
    }, [selectedTank, millingLots]);


    const lowStockItems = useMemo(() => auxStock.filter(s => s.currentStock < config.lowStockThreshold), [auxStock, config.lowStockThreshold]);

    const todaysVales = useMemo(() => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local
        return vales.filter(v => {
            const isDateToday = v.fecha_entrada.startsWith(todayStr);
            const isCreatedToday = v.created_at && new Date(v.created_at).toDateString() === now.toDateString();
            return isDateToday || isCreatedToday;
        });
    }, [vales]);

    const latestDirectSales = useMemo(() => {
        return vales.filter(v => v.tipo_vale === ValeType.VENTA_DIRECTA).sort((a, b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime()).slice(0, 5);
    }, [vales]);

    // --- RENDERIZADORES DE WIDGETS ---

    const renderKPIs = () => {
        const timeActions = [
            { label: 'Ver Hoy', action: () => setTimeFilter('today') },
            { label: 'Últimos 7 Días', action: () => setTimeFilter('week') },
            { label: 'Ver Todo (Histórico)', action: () => setTimeFilter('all') }
        ];

        const getTimeSubtitle = () => {
            if (timeFilter === 'today') return 'Filtrado: Hoy';
            if (timeFilter === 'week') return 'Filtrado: 7 Días';
            return 'Entrada';
        };

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

                {/* RECOLECTADA */}
                <KPICard
                    title="Recolectada"
                    value={kpis.totalRecolectada.toLocaleString()}
                    subtitle={timeFilter === 'all' ? 'Total Campaña' : `KG ${getTimeSubtitle()}`}
                    icon={<Layers size={16} />}
                    onClick={() => setActiveTab('vales')}
                    menuActions={[
                        ...timeActions,
                        { label: 'Analizar por Parcela/Finca', action: () => setShowParcelAnalysis(true) }
                    ]}
                />

                {/* MOLTURADA */}
                <KPICard
                    title="Molturada"
                    value={kpis.totalMolturada.toLocaleString()}
                    subtitle={timeFilter === 'all' ? 'KG Aceituna' : `KG ${getTimeSubtitle()}`}
                    icon={<Factory size={16} />}
                    onClick={() => setActiveTab('milling')}
                    menuActions={timeActions}
                />

                {/* PRODUCCIÓN */}
                <KPICard
                    title="Producción"
                    value={kpis.totalAceiteProducido.toLocaleString()}
                    subtitle={timeFilter === 'all' ? 'KG Aceite' : `KG ${getTimeSubtitle()}`}
                    icon={<Droplets size={16} />}
                    onClick={() => setActiveTab('milling')}
                    menuActions={timeActions}
                />

                {/* RENDIMIENTO */}
                <KPICard
                    title="Rendimiento"
                    value={kpis.rendimientoMedio + "%"}
                    subtitle="Industrial"
                    icon={<TrendingUp size={16} />}
                    trend="up"
                    onClick={() => setActiveTab('analytics')}
                    menuActions={[
                        { label: 'Comparar con Teórico', action: () => setShowYieldAnalysis(true) },
                        ...timeActions
                    ]}
                />

                <KPICard title="Vales" value={kpis.valesRegistrados} subtitle="Total" icon={<Receipt size={16} />} onClick={() => setActiveTab('vales')} />
                <KPICard title="En Bodega" value={kpis.aceiteEnBodega.toLocaleString()} subtitle="Disponibles" percentage={kpis.porcentajeOcupacion} icon={<Scale size={16} />} onClick={() => setActiveTab('cellar')} />
            </div>
        );
    };

    const renderBodega = () => (
        <section className="bg-white p-6 rounded-[32px] custom-shadow border border-gray-50">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 rounded-full bg-black"></div>
                <h2 className="text-xl font-black uppercase text-[#111111]">Monitor de Bodega</h2>
            </div>
            <TankGrid tanks={tanks} onViewDetails={(tank) => setSelectedTank(tank)} />
        </section>
    );

    const renderMolturacion = () => (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#111111] text-white rounded-lg"><Factory size={20} /></div>
                <h2 className="text-xl font-black uppercase text-[#111111]">Tolvas de Recepción</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {activeHoppersData.map(hopper => (
                    <div key={hopper.id} className={`relative rounded-[32px] overflow-hidden border transition-all ${hopper.status === 'active' ? 'bg-white border-[#D9FF66] shadow-xl' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOLVA {hopper.id}</span>
                                    {hopper.status === 'active' && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            <span className="text-xs font-bold text-green-600 uppercase">En Proceso</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`${hopper.status === 'active' ? 'bg-[#111111] text-white' : 'bg-gray-200 text-gray-400'} px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest`}>
                                    {hopper.status === 'active' ? `Lote MT ${hopper.id}/${hopper.activeBatch?.uso}` : 'Inactiva'}
                                </span>
                            </div>

                            {hopper.status === 'active' && hopper.activeBatch ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-1">{hopper.activeBatch.variety}</h3>
                                            <p className="text-xs font-bold text-gray-400">{hopper.activeBatch.vales.length} Entradas</p>
                                        </div>
                                        {hopper.queuedBatches.length > 0 && (
                                            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                                                <Layers size={14} className="text-amber-600" />
                                                <span className="text-[10px] font-black text-amber-700 uppercase">+{hopper.queuedBatches.length} En Cola</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-[#F9FAF9] p-4 rounded-2xl border border-gray-100">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Aceituna Neta</p>
                                            <p className="text-lg font-black text-[#111111]">{hopper.activeBatch.totalKg?.toLocaleString()} kg</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Rend. Medio</p>
                                            <p className="text-lg font-black text-[#111111]">{hopper.activeBatch.avgYield?.toFixed(2)}%</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Aceite Estimado</span>
                                        <span className="text-xl font-black text-[#D9FF66] bg-black px-3 py-1 rounded-lg">
                                            {Math.round(hopper.activeBatch.theoreticalOil || 0).toLocaleString()} kg
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                                        {hopper.activeBatch.vales.map(v => (
                                            <button
                                                key={v.id_vale}
                                                onClick={(e) => { e.stopPropagation(); onViewValeDetails(v); }}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[9px] font-black hover:border-black transition-all text-[#111111] shadow-sm flex items-center gap-1"
                                            >
                                                #{v.id_vale.toString().padStart(3, '0')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-gray-300">
                                    <Factory size={40} className="mb-2 opacity-20" />
                                    <p className="text-xs font-black uppercase tracking-widest">Esperando Carga</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStockAlerts = () => (
        <div className="bg-red-50 p-6 rounded-[32px] border border-red-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
                <h3 className="text-lg font-black uppercase text-red-800">Alertas Stock Auxiliar</h3>
            </div>
            {lowStockItems.length > 0 ? (
                <div className="space-y-3">
                    {lowStockItems.map(item => (
                        <div key={item.type} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                            <span className="text-xs font-bold text-gray-700">{item.type}</span>
                            <span className="text-sm font-black text-red-600">{item.currentStock.toLocaleString()} uds</span>
                        </div>
                    ))}
                    <button
                        onClick={() => setActiveTab('auxiliary')}
                        className="w-full mt-4 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                    >
                        Gestionar Pedidos
                    </button>
                </div>
            ) : (
                <div className="text-center py-4 text-green-700 text-sm font-bold">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                    Todo el stock en niveles óptimos
                </div>
            )}
        </div>
    );

    const renderProducersToday = () => (
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#111111] text-[#D9FF66] rounded-lg"><UserCheck size={20} /></div>
                <h3 className="text-lg font-black uppercase text-[#111111]">Entradas Hoy</h3>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <p className="text-4xl font-black text-[#111111]">{todaysVales.length}</p>
                    <p className="text-xs font-bold text-gray-400 mb-1 uppercase">Vales registrados</p>
                </div>
                <div className="space-y-2">
                    {todaysVales.sort((a, b) => b.id_vale - a.id_vale).slice(0, 3).map(v => (
                        <div key={v.id_vale} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                            <div>
                                <p className="text-xs font-black text-[#111111] truncate max-w-[150px]">{v.productor_name}</p>
                                <p className="text-[10px] text-gray-500">{v.created_at || v.fecha_entrada ? new Date(v.created_at || v.fecha_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</p>
                            </div>
                            <span className="text-xs font-bold text-[#111111]">{v.kilos_netos} kg</span>
                        </div>
                    ))}
                </div>
                {todaysVales.length > 0 && (
                    <button
                        onClick={() => setActiveTab('vales')}
                        className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                        Ver Todos
                    </button>
                )}
            </div>
        </div>
    );

    const renderDirectSales = () => (
        <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart size={20} /></div>
                <h3 className="text-lg font-black uppercase text-blue-900">Ventas Directas (Recientes)</h3>
            </div>
            {latestDirectSales.length > 0 ? (
                <div className="space-y-2">
                    {latestDirectSales.map(v => (
                        <div key={v.id_vale} onClick={() => onViewValeDetails(v)} className="bg-white p-3 rounded-xl border border-blue-100 cursor-pointer hover:shadow-md transition-all">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-blue-900">Vale #{v.id_vale}</span>
                                <span className="text-xs font-bold text-gray-500">{new Date(v.fecha_entrada).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{v.variedad}</span>
                                <span className="text-sm font-black text-[#111111]">{v.kilos_netos} kg</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-xs text-blue-400 font-bold py-4">No hay ventas directas recientes</p>
            )}
        </div>
    );

    const widgetRenderers: Record<string, () => React.ReactNode> = {
        'kpi_summary': renderKPIs,
        'bodega_main': renderBodega,
        'milling_active': renderMolturacion,
        'stock_alerts': renderStockAlerts,
        'producers_today': renderProducersToday,
        'direct_sales_recent': renderDirectSales
    };

    const activeWidgets = config.dashboardWidgets
        .filter(w => w.visible)
        .sort((a, b) => a.order - b.order);

    if (!config.currentCampaign) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-[#D9FF66] blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center text-[#111111] shadow-2xl border border-gray-100">
                        <History size={64} className="opacity-50" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-50 transform rotate-12">
                        <AlertTriangle size={24} className="text-amber-500" />
                    </div>
                </div>

                <div className="max-w-md space-y-3">
                    <h2 className="text-3xl font-black text-[#111111] uppercase tracking-tighter leading-none">Sistema en Pausa</h2>
                    <p className="text-gray-400 font-bold text-sm tracking-tight leading-relaxed">
                        No hay ninguna campaña activa actualmente. Abre una nueva campaña en los ajustes para comenzar a registrar entradas, molturación y ventas.
                    </p>
                </div>

                <button
                    onClick={() => setActiveTab('config')}
                    className="group relative px-10 py-5 bg-[#111111] text-white rounded-[28px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden flex items-center gap-3"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <Plus size={18} className="text-[#D9FF66]" />
                    <span>Empezar Nueva Campaña</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {activeWidgets.map(widget => {
                const RenderWidget = widgetRenderers[widget.id];
                return (
                    <div key={widget.id} className="w-full">
                        {RenderWidget ? RenderWidget() : null}
                    </div>
                );
            })}
            {activeWidgets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Package size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-widest">Dashboard Vacío</p>
                    <button onClick={() => setActiveTab('config')} className="mt-4 text-xs font-bold underline">Configurar Widgets</button>
                </div>
            )}

            {/* MODAL ANALISIS POR PARCELA */}
            {showParcelAnalysis && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ORIGEN DE ACEITUNA</p>
                                <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Análisis por Finca</h3>
                            </div>
                            <button onClick={() => setShowParcelAnalysis(false)} className="p-2 hover:bg-white rounded-2xl transition-all"><X size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {parcelAnalysis.map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-black uppercase text-[#111111] flex items-center gap-2">
                                            <MapPin size={12} className="text-gray-400" />
                                            {item.name}
                                        </p>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-[#111111]">{item.kg.toLocaleString()} kg</span>
                                            <span className="text-[10px] text-gray-400 font-bold ml-2">{item.percent.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#111111]" style={{ width: `${item.percent}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {parcelAnalysis.length === 0 && <p className="text-center text-gray-400 text-xs font-bold uppercase">Sin datos para mostrar</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL COMPARATIVA RENDIMIENTO */}
            {showYieldAnalysis && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CALIDAD DE PROCESO</p>
                                <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Desviación Industrial</h3>
                            </div>
                            <button onClick={() => setShowYieldAnalysis(false)} className="p-2 hover:bg-white rounded-2xl transition-all"><X size={24} className="text-gray-400" /></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Teórico (Lab)</p>
                                    <p className="text-xl font-black text-[#111111]">{Math.round(yieldAnalysis.totalTeorico).toLocaleString()} kg</p>
                                </div>
                                <div className="bg-[#111111] p-4 rounded-2xl border border-gray-100 text-white">
                                    <p className="text-[9px] font-black text-[#D9FF66] uppercase mb-1">Real (Pesado)</p>
                                    <p className="text-xl font-black">{Math.round(yieldAnalysis.totalReal).toLocaleString()} kg</p>
                                </div>
                            </div>

                            <div className={`p-6 rounded-[24px] border-2 text-center ${yieldAnalysis.diff >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <div className="flex justify-center mb-2">
                                    {yieldAnalysis.diff >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                                </div>
                                <p className="text-3xl font-black tracking-tighter">
                                    {yieldAnalysis.diff > 0 ? '+' : ''}{Math.round(yieldAnalysis.diff).toLocaleString()} kg
                                </p>
                                <p className="text-xs font-bold uppercase mt-1">
                                    Desviación: {yieldAnalysis.deviationPercent.toFixed(2)}%
                                </p>
                            </div>

                            <p className="text-center text-[10px] text-gray-400 leading-tight px-4">
                                Calculado sobre los lotes cerrados en el periodo seleccionado. Una desviación negativa indica que se ha obtenido menos aceite del esperado según la analítica de los vales.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PANEL LATERAL */}
            {selectedTank && (
                <TankPassport
                    selectedTank={selectedTank}
                    tanks={tanks}
                    millingLots={millingLots}
                    vales={vales}
                    producers={producers}
                    oilMovements={oilMovements}
                    oilExits={oilExits}
                    productionLots={productionLots}
                    config={config}
                    onClose={() => setSelectedTank(null)}
                    onViewLot={onViewLot}
                    onViewVale={onViewValeDetails}
                    onViewProducer={onViewProducer}
                    onViewExit={onViewExit}
                />
            )}
        </div>
    );
};
