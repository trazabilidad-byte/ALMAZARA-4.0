
import React, { useState, useMemo } from 'react';
import { Tank, Hopper, Vale, MillingLot, AppConfig, AuxStock, SalesOrder, ValeType, Producer, OilMovement, OilExit, ExitType } from '../types';
import { KPICard } from './KPICard';
import { TankGrid } from './TankGrid';
import { Layers, Factory, Droplets, TrendingUp, Receipt, Scale, AlertTriangle, ShoppingCart, UserCheck, Package, CheckCircle2, X, History, User, ArrowRight, Truck, MapPin, BarChart3, TrendingDown, CalendarRange } from 'lucide-react';

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

  const activeHoppers = useMemo(() => {
    return hoppers.map(h => {
        const hopperVales = pendingVales.filter(v => v.ubicacion_id === h.id);
        if (hopperVales.length === 0) return { ...h, status: 'empty', vales: [], totalKg: 0, theoreticalOil: 0, avgYield: 0, variety: '' };
        
        const currentUse = hopperVales[0].uso_contador;
        const activeVales = hopperVales.filter(v => v.uso_contador === currentUse);
        const totalKg = activeVales.reduce((acc, v) => acc + v.kilos_netos, 0);
        const theoreticalOil = activeVales.reduce((acc, v) => acc + (v.kilos_netos * (v.analitica.rendimiento_graso || 0) / 100), 0);
        const avgYield = activeVales.length > 0 ? activeVales.reduce((acc, v) => acc + v.analitica.rendimiento_graso, 0) / activeVales.length : 0;

        return { ...h, status: 'active', currentUse, vales: activeVales, totalKg, theoreticalOil, avgYield, variety: activeVales[0].variedad };
    });
  }, [hoppers, pendingVales]);

  const tankLots = useMemo(() => {
    if (!selectedTank) return [];
    return millingLots.filter(lot => lot.deposito_id === selectedTank.id);
  }, [selectedTank, millingLots]);

  // Helper para mostrar destino legible
  const getDestinationLabel = (targetId: number | null) => {
      if (targetId === 999) return "Envasadora / Nodriza";
      return `Depósito ${targetId}`;
  };

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
            sourceId: m.source_tank_id,
            targetId: m.target_tank_id,
            batchId: m.batch_id,
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
            sourceId: selectedTank.id,
            targetId: null as number | null,
            batchId: undefined as string | undefined,
            detail: e
        }));

    return [...internal, ...exits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedTank, oilMovements, oilExits]);

  const uniqueProducers = useMemo(() => {
    const producerIds = new Set<string>();
    tankLots.forEach(lot => { lot.vales_ids.forEach(valeId => { const vale = vales.find(v => v.id_vale === valeId); if (vale) producerIds.add(vale.productor_id); }); });
    return producers.filter(p => producerIds.has(p.id));
  }, [tankLots, vales, producers]);

  const lowStockItems = useMemo(() => auxStock.filter(s => s.currentStock < config.lowStockThreshold), [auxStock, config.lowStockThreshold]);
  
  const todaysVales = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      return vales.filter(v => v.fecha_entrada.startsWith(todayStr));
  }, [vales]);

  const latestDirectSales = useMemo(() => {
      return vales.filter(v => v.tipo_vale === ValeType.VENTA_DIRECTA).sort((a,b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime()).slice(0, 5);
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
            {activeHoppers.map(hopper => (
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
                            <span className="bg-[#111111] text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                                {hopper.status === 'active' ? `Lote MT ${hopper.id}/${hopper.currentUse}` : 'Inactiva'}
                            </span>
                        </div>

                        {hopper.status === 'active' ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-1">{hopper.variety}</h3>
                                    <p className="text-xs font-bold text-gray-400">{hopper.vales.length} Entradas Agrupadas</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 bg-[#F9FAF9] p-4 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Aceituna Neta</p>
                                        <p className="text-lg font-black text-[#111111]">{hopper.totalKg?.toLocaleString()} kg</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Rend. Medio</p>
                                        <p className="text-lg font-black text-[#111111]">{hopper.avgYield?.toFixed(2)}%</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center px-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Aceite Teórico Estimado</span>
                                    <span className="text-xl font-black text-[#D9FF66] bg-black px-3 py-1 rounded-lg">
                                        {Math.round(hopper.theoreticalOil || 0).toLocaleString()} kg
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                                    {hopper.vales.map(v => (
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
                  {todaysVales.slice(0, 3).map(v => (
                      <div key={v.id_vale} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                          <div>
                              <p className="text-xs font-black text-[#111111] truncate max-w-[150px]">{v.productor_name}</p>
                              <p className="text-[10px] text-gray-500">{new Date(v.fecha_entrada).toLocaleTimeString()}</p>
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
                                    <div className="h-full bg-[#111111]" style={{width: `${item.percent}%`}}></div>
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

        {/* PANEL DE TRAZABILIDAD (SLIDE OVER) */}
        {selectedTank && (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTank(null)}></div>
                <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedTank(null)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-all">
                    <X size={24} />
                </button>

                <div className="mt-8 space-y-8">
                    {/* HEADER DEPÓSITO */}
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PASAPORTE DEL DEPÓSITO</span>
                        <h2 className="text-5xl font-black text-[#111111] uppercase tracking-tighter mb-2">{selectedTank.name}</h2>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[#111111] text-[#D9FF66] text-xs font-black uppercase rounded-lg">
                            {selectedTank.currentKg > 0 ? selectedTank.variety_id : 'VACÍO'}
                            </span>
                            <span className="text-xl font-black text-[#111111]">
                            {selectedTank.currentKg.toLocaleString()} <span className="text-sm text-gray-400">KG</span>
                            </span>
                        </div>
                    </div>

                    {/* COMPOSICIÓN (LOTES) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Factory size={18} className="text-[#111111]" />
                            <h3 className="text-sm font-black uppercase text-[#111111]">Lotes de Producción (Origen)</h3>
                        </div>
                        {tankLots.length > 0 ? (
                            <div className="space-y-3">
                            {tankLots.map(lot => (
                                <div 
                                    key={lot.id} 
                                    onClick={() => onViewLot && onViewLot(lot.id)}
                                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 cursor-pointer hover:border-[#D9FF66] transition-all hover:shadow-sm active:scale-95"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm">{lot.id}</span>
                                        <span className="text-[10px] font-bold text-gray-400">{new Date(lot.fecha).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-3">
                                        <span className="font-bold text-gray-600">Aceite Real:</span>
                                        <span className="font-black text-[#111111]">{lot.kilos_aceite_real.toLocaleString()} kg</span>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-gray-200">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Vales Asociados</p>
                                        <div className="flex flex-wrap gap-1">
                                        {lot.vales_ids.map(id => {
                                            const v = vales.find(x => x.id_vale === id);
                                            return (
                                                <button 
                                                    key={id} 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if(v && onViewValeDetails) onViewValeDetails(v); 
                                                    }}
                                                    className="text-[9px] font-bold bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 hover:text-[#111111] hover:border-black cursor-pointer hover:bg-gray-50 transition-colors"
                                                >
                                                    #{id}
                                                </button>
                                            );
                                        })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No hay lotes de molturación directa registrados actualmente en este depósito.</p>
                        )}
                    </div>

                    {/* PRODUCTORES ORIGEN */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <User size={18} className="text-[#111111]" />
                            <h3 className="text-sm font-black uppercase text-[#111111]">Productores Origen</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {uniqueProducers.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => onViewProducer && onViewProducer(p.id)}
                                className="flex items-center gap-2 bg-[#111111] border border-black px-3 py-2 rounded-xl shadow-md cursor-pointer hover:scale-105 transition-transform active:scale-95"
                            >
                                <div className="w-6 h-6 rounded-full bg-[#D9FF66] text-black flex items-center justify-center text-[10px] font-black shrink-0">
                                    {p.name.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black uppercase leading-none text-white truncate max-w-[120px]">{p.name}</p>
                                    <p className="text-[8px] text-gray-400 truncate">{p.municipality}</p>
                                </div>
                            </div>
                            ))}
                            {uniqueProducers.length === 0 && <p className="text-xs text-gray-400 italic">Sin información de productores.</p>}
                        </div>
                    </div>

                    {/* HISTORIAL DE MOVIMIENTOS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <History size={18} className="text-[#111111]" />
                            <h3 className="text-sm font-black uppercase text-[#111111]">Historial de Movimientos</h3>
                        </div>
                        {unifiedHistory.length > 0 ? (
                            <div className="relative border-l-2 border-gray-100 ml-2 space-y-4 py-2">
                            {unifiedHistory.map((mov, idx) => {
                                const isEntry = mov.isEntry;
                                const isBulkExit = mov.type === 'EXIT_BULK';
                                
                                return (
                                    <div key={`${mov.type}-${mov.id}-${idx}`} className="ml-4 relative group">
                                        <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${isEntry ? 'bg-green-500' : isBulkExit ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                                        <div 
                                            onClick={() => {
                                                if (isBulkExit && onViewExit) {
                                                    onViewExit(mov.detail);
                                                } else if (mov.type === 'INTERNAL') {
                                                    if (mov.batchId && onViewLot) {
                                                        onViewLot(mov.batchId);
                                                    } else {
                                                        const otherTankId = isEntry ? mov.sourceId : mov.targetId;
                                                        if (otherTankId && otherTankId !== 999) {
                                                            const targetTank = tanks.find(t => t.id === otherTankId);
                                                            if (targetTank) setSelectedTank(targetTank);
                                                        }
                                                    }
                                                }
                                            }}
                                            className={`p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all ${isBulkExit ? 'bg-blue-50 border-blue-100' : 'bg-[#F9FAF9] border-gray-100'}`}
                                        >
                                        <div className="flex justify-between items-start">
                                            <p className={`text-[10px] font-black uppercase mb-1 ${isEntry ? 'text-green-600' : isBulkExit ? 'text-blue-700' : 'text-orange-600'}`}>
                                                {isEntry ? 'Entrada por Trasiego' : isBulkExit ? 'Venta por Cisterna' : 'Salida por Trasiego'}
                                            </p>
                                            <span className="text-[9px] font-bold text-gray-400">{new Date(mov.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm font-black text-[#111111] group-hover:underline">
                                            {isEntry ? '+' : '-'}{mov.kg.toLocaleString()} KG
                                        </p>
                                        
                                        {isBulkExit ? (
                                            <div className="mt-1 space-y-0.5">
                                                <p className="text-[10px] text-gray-600 font-bold flex items-center gap-1"><Truck size={10} /> Matrícula: {mov.detail.license_plate}</p>
                                                <p className="text-[9px] text-gray-500">Destino: Cliente Externo</p>
                                            </div>
                                        ) : (
                                            <div className="mt-1">
                                                <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1 group-hover:text-[#111111] transition-colors">
                                                    {isEntry 
                                                        ? <><ArrowRight size={10} className="rotate-180" /> Origen: {getDestinationLabel(mov.sourceId)}</>
                                                        : <><ArrowRight size={10} /> Destino: {getDestinationLabel(mov.targetId)}</>
                                                    }
                                                </p>
                                                {mov.batchId && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <span className="inline-flex items-center gap-1 bg-[#111111] text-[#D9FF66] px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider">
                                                            <Package size={10} /> Lote Generado: {mov.batchId}
                                                        </span>
                                                    </div>
                                                )}
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
    </div>
  );
};
