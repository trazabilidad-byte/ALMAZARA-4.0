
import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ValesForm } from './components/ValesForm';
import { ValesList } from './components/ValesList';
import { ProducersList } from './components/ProducersList';
import { ProducerDetail } from './components/ProducerDetail';
import { ProducerForm } from './components/ProducerForm';
import { CustomersList } from './components/CustomersList';
import { CustomerForm } from './components/CustomerForm';
import { CustomerDetail } from './components/CustomerDetail';
import { DirectSalesDashboard } from './components/DirectSalesDashboard';
import { MillingControl } from './components/MillingControl';
import { CellarDashboard } from './components/CellarDashboard';
import { PackagingDashboard } from './components/PackagingDashboard';
import { AuxiliaryWarehouse } from './components/AuxiliaryWarehouse';
import { SalesDashboard } from './components/SalesDashboard';
import { TraceabilityDashboard } from './components/TraceabilityDashboard';
import { SettingsDashboard } from './components/SettingsDashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DynamicDashboard } from './components/DynamicDashboard';
import { AuthScreen } from './components/AuthScreen';
import { Tank, UserRole, Producer, Vale, Hopper, MillingLot, Customer, OilExit, OilMovement, NurseTank, PackagingLot, FinishedProduct, AuxEntry, AuxStock, SalesOrder, PomaceExit, AppConfig, User, ValeType, ValeStatus, OliveVariety, ExitType, ProductionLot } from './types';
import { NAV_ITEMS } from './constants';
import { Plus, CalendarRange } from 'lucide-react';

const APP_NAME = "ALMAZARA PRIVADA 4.0";
const CAMPAIGN = "2025/2026";
const OWNER_NAME = "Administrador";

const DEFAULT_APP_CONFIG: AppConfig = {
  almazaraId: 'private-user',
  companyName: APP_NAME,
  cif: 'A-00000000',
  address: 'Sede Central',
  city: 'Jaén',
  province: 'Jaén',
  zipCode: '23001',
  phone: '000000000',
  currentCampaign: CAMPAIGN,
  pastCampaigns: [],
  oilDensity: 0.916,
  lowStockThreshold: 500,
  tankHighThreshold: 90,
  varietySettings: {
      [OliveVariety.PICUAL]: { defaultYield: 21.5 },
      [OliveVariety.ARBEQUINA]: { defaultYield: 16.0 },
      [OliveVariety.FRANTOIO]: { defaultYield: 18.5 },
      [OliveVariety.HOJIBLANCA]: { defaultYield: 19.0 },
      [OliveVariety.ARBOSANA]: { defaultYield: 17.5 },
      [OliveVariety.CONTINENTAL]: { defaultYield: 15.0 },
  },
  authorizedEmails: ['admin@demo.com'],
  authorizedUsers: [{ id: 'u1', name: OWNER_NAME, email: 'admin@demo.com', role: UserRole.ADMIN }],
  packagingFormats: [
     { id: '1', name: 'Botella 500ml', capacityLiters: 0.5, enabled: true },
     { id: '2', name: 'Botella 1L', capacityLiters: 1.0, enabled: true },
     { id: '3', name: 'Garrafa 5L', capacityLiters: 5.0, enabled: true }
  ],
  auxiliaryProducts: [
     { id: 'p1', name: 'Botella Vidrio 500ml', category: 'Envase' },
     { id: 'p2', name: 'Botella PET 1L', category: 'Envase' },
     { id: 'p3', name: 'Garrafa PET 5L', category: 'Envase' },
     { id: 'p4', name: 'Tapón Estándar', category: 'Tapón' },
     { id: 'p5', name: 'Etiqueta Premium', category: 'Etiqueta' }
  ],
  dashboardWidgets: [
      { id: 'kpi_summary', visible: true, order: 0 },
      { id: 'bodega_main', visible: true, order: 1 },
      { id: 'milling_active', visible: true, order: 2 },
      { id: 'producers_today', visible: true, order: 3 }
  ],
  sidebarConfig: NAV_ITEMS.map((item, index) => ({ id: item.id, visible: true, order: index }))
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [historicalView, setHistoricalView] = useState<string | null>(null);

  // --- PERSISTENCIA Y ESTADO GLOBAL ---
  
  // Helper para inicializar estado desde localStorage
  const getPersistedState = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Error loading ${key}`, e);
      return defaultValue;
    }
  };

  const [tanks, setTanks] = useState<Tank[]>(() => getPersistedState('app_tanks', Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, almazaraId: 'private', name: `D.${(i + 1).toString().padStart(2, '0')}`,
      maxCapacityKg: 50000, currentKg: 0, variety_id: undefined, cycleCount: 1, status: 'FILLING'
  }))));

  const [nurseTank, setNurseTank] = useState<NurseTank>(() => getPersistedState('app_nurseTank', {
      almazaraId: 'private', maxCapacityKg: 10000, currentKg: 0, lastEntryDate: null, lastSourceTankId: null, lastEntryId: 0
  }));

  const [oilMovements, setOilMovements] = useState<OilMovement[]>(() => getPersistedState('app_oilMovements', []));

  // Efectos de Persistencia
  useEffect(() => { localStorage.setItem('app_tanks', JSON.stringify(tanks)); }, [tanks]);
  useEffect(() => { localStorage.setItem('app_nurseTank', JSON.stringify(nurseTank)); }, [nurseTank]);
  useEffect(() => { localStorage.setItem('app_oilMovements', JSON.stringify(oilMovements)); }, [oilMovements]);

  // Otros estados (sin persistencia explícita en este ejemplo por brevedad, pero recomendado)
  const [hoppers, setHoppers] = useState<Hopper[]>([
      { id: 1, almazaraId: 'private', name: 'Tolva 1', isActive: false, currentUse: 1 },
      { id: 2, almazaraId: 'private', name: 'Tolva 2', isActive: false, currentUse: 1 },
      { id: 3, almazaraId: 'private', name: 'Tolva 3', isActive: false, currentUse: 1 }
  ]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [millingLots, setMillingLots] = useState<MillingLot[]>([]);
  const [productionLots, setProductionLots] = useState<ProductionLot[]>([]); 
  const [oilExits, setOilExits] = useState<OilExit[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [pomaceExits, setPomaceExits] = useState<PomaceExit[]>([]);
  const [packagingLots, setPackagingLots] = useState<PackagingLot[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [auxEntries, setAuxEntries] = useState<AuxEntry[]>([]);

  // --- UI NAVIGATION STATE ---
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showProducerForm, setShowProducerForm] = useState(false);
  const [editingProducer, setEditingProducer] = useState<Producer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showValesForm, setShowValesForm] = useState(false);
  const [editingVale, setEditingVale] = useState<Vale | null>(null);
  const [isValeReadOnly, setIsValeReadOnly] = useState(false); 
  const [traceSearchTerm, setTraceSearchTerm] = useState('');
  
  const [externalOpenProductionLotId, setExternalOpenProductionLotId] = useState<string | null>(null);
  const [externalOpenTankId, setExternalOpenTankId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsAuthChecking(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (email: string) => {
    setCurrentUser({ id: 'admin-id', email, fullName: OWNER_NAME, role: UserRole.ADMIN, almazaraId: 'private' });
    setIsLoggedIn(true);
  };

  // --- LÓGICA DE CÁLCULO DE TEÓRICOS ---
  const calculateTheoreticalOil = (valesList: Vale[]) => {
      return valesList.reduce((acc, v) => {
          let yieldPercent = v.analitica.rendimiento_graso;
          if (!yieldPercent || yieldPercent === 0) {
              const configYield = appConfig.varietySettings?.[v.variedad]?.defaultYield;
              yieldPercent = configYield || 18.0; 
          }
          return acc + (v.kilos_netos * yieldPercent / 100);
      }, 0);
  };

  // --- LÓGICA DE STOCK AUXILIAR CONECTADA ---
  const auxStock = useMemo(() => {
    const stockMap: Record<string, AuxStock> = {};
    if (appConfig.auxiliaryProducts) {
        appConfig.auxiliaryProducts.forEach(prod => {
           stockMap[prod.name] = { type: prod.name, category: prod.category, almazaraId: 'private', totalIn: 0, totalOut: 0, currentStock: 0 };
        });
    }
    const batchToTypeMap: Record<string, string> = {};
    auxEntries.forEach(entry => {
        if (!stockMap[entry.materialType]) {
             stockMap[entry.materialType] = { type: entry.materialType, category: 'Otro', almazaraId: 'private', totalIn: 0, totalOut: 0, currentStock: 0 };
        }
        stockMap[entry.materialType].totalIn += entry.quantity; 
        if (entry.manufacturerBatch && entry.manufacturerBatch !== 'N/A') {
            batchToTypeMap[entry.manufacturerBatch] = entry.materialType;
        }
    });
    packagingLots.forEach(lot => {
        const bottleType = batchToTypeMap[lot.bottleBatch];
        if (bottleType && stockMap[bottleType]) {
            stockMap[bottleType].totalOut += lot.units;
        } else {
            const fallbackKey = Object.keys(stockMap).find(key => key.includes(lot.format) && stockMap[key].category === 'Envase');
            if (fallbackKey) stockMap[fallbackKey].totalOut += lot.units;
        }
        const capType = batchToTypeMap[lot.capBatch];
        if (capType && stockMap[capType]) {
            stockMap[capType].totalOut += lot.units;
        } else {
            const fallbackKey = Object.keys(stockMap).find(key => stockMap[key].category === 'Tapón');
            if (fallbackKey) stockMap[fallbackKey].totalOut += lot.units;
        }
        const labelType = batchToTypeMap[lot.labelBatch];
        if (labelType && stockMap[labelType]) {
            stockMap[labelType].totalOut += lot.units;
        } else {
            const fallbackKey = Object.keys(stockMap).find(key => stockMap[key].category === 'Etiqueta');
            if (fallbackKey) stockMap[fallbackKey].totalOut += lot.units;
        }
    });
    return Object.values(stockMap).map(s => ({ ...s, currentStock: s.totalIn - s.totalOut }));
  }, [appConfig.auxiliaryProducts, auxEntries, packagingLots]);

  const handleRegisterClick = () => {
    if (activeTab === 'producers') { setEditingProducer(null); setShowProducerForm(true); }
    else if (activeTab === 'customers') { setEditingCustomer(null); setShowCustomerForm(true); }
    else { setEditingVale(null); setIsValeReadOnly(false); setShowValesForm(true); }
  };

  const handleValeSave = (v: Vale) => {
      const updatedVales = editingVale ? vales.map(old => old.id_vale === v.id_vale ? v : old) : [...vales, v];
      setVales(updatedVales);
      if (editingVale && v.milling_lot_id) {
          const relevantVales = updatedVales.filter(item => item.milling_lot_id === v.milling_lot_id);
          const newTheoreticalOil = calculateTheoreticalOil(relevantVales);
          setMillingLots(prevLots => prevLots.map(lot => {
              if (lot.id === v.milling_lot_id) {
                  return { ...lot, kilos_aceite_esperado: newTheoreticalOil };
              }
              return lot;
          }));
      }
      setShowValesForm(false);
  };

  const renderContent = () => {
    const filteredVales = vales.filter(v => (v.campaign || CAMPAIGN) === (historicalView || CAMPAIGN));

    switch (activeTab) {
      // ... (Resto de casos sin cambios)
      case 'dashboard': return <DynamicDashboard config={appConfig} tanks={tanks} hoppers={hoppers} vales={filteredVales} millingLots={millingLots} auxStock={auxStock} salesOrders={salesOrders} producers={producers} oilMovements={oilMovements} oilExits={oilExits} onExit={()=>{}} onStartLot={()=>{}} onViewTankDetails={()=>{}} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProducer={(producerId) => { const p = producers.find(x => x.id === producerId); if(p) {setSelectedProducer(p); setActiveTab('producers');} }} onViewExit={(exit) => { setTraceSearchTerm(exit.id); setActiveTab('traceability'); }} setActiveTab={setActiveTab} />;
      case 'producers': if (selectedProducer) return <ProducerDetail producer={selectedProducer} vales={vales} onBack={() => setSelectedProducer(null)} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onEdit={() => { setEditingProducer(selectedProducer); setShowProducerForm(true); }} onArchive={()=>{}} onDelete={()=>{}} appConfig={appConfig} />; return <ProducersList producers={producers} onSelect={setSelectedProducer} />;
      case 'customers': if (selectedCustomer) return <CustomerDetail customer={selectedCustomer} oilExits={oilExits} vales={vales} salesOrders={salesOrders} pomaceExits={pomaceExits} onBack={() => setSelectedCustomer(null)} onEdit={() => { setEditingCustomer(selectedCustomer); setShowCustomerForm(true); }} onArchive={()=>{}} onDelete={()=>{}} />; return <CustomersList customers={customers} onSelect={setSelectedCustomer} />;
      case 'vales': return <ValesList vales={filteredVales} onEdit={(v) => { setEditingVale(v); setIsValeReadOnly(false); setShowValesForm(true); }} onView={(v) => { setTraceSearchTerm(String(v.id_vale)); setActiveTab('traceability'); }} onViewProducer={(name) => { const p = producers.find(x => x.name === name); if(p) {setSelectedProducer(p); setActiveTab('producers');} }} onUpdateAnalitica={()=>{}} />;
      case 'milling': return <MillingControl hoppers={hoppers} pendingVales={vales.filter(v => v.estado === ValeStatus.PENDIENTE)} allVales={vales} tanks={tanks} millingLots={millingLots} productionLots={productionLots} appConfig={appConfig} initialViewProductionLotId={externalOpenProductionLotId} onProcessLot={(data) => { const newId = `MT${data.hopperId}/${data.uso}`; if (millingLots.some(lot => lot.id === newId)) { console.warn(`Intento de duplicación de lote MT prevenido: ${newId}`); return; } const activeVales = vales.filter(v => v.ubicacion_id === data.hopperId && v.uso_contador === data.uso && v.estado === ValeStatus.PENDIENTE); const totalKgAceituna = activeVales.reduce((acc, v) => acc + v.kilos_netos, 0); const totalAceiteTeorico = calculateTheoreticalOil(activeVales); const variedadLote = activeVales.length > 0 ? activeVales[0].variedad : OliveVariety.PICUAL; const newLot: MillingLot = { id: newId, almazaraId: 'private', fecha: data.date, tolva_id: data.hopperId, uso_contador: data.uso, kilos_aceituna: totalKgAceituna, kilos_aceite_esperado: totalAceiteTeorico, kilos_aceite_real: data.realOil, deposito_id: data.targetTankId, variedad: variedadLote, vales_ids: activeVales.map(v => v.id_vale) }; setMillingLots([...millingLots, newLot]); setVales(vales.map(v => v.ubicacion_id === data.hopperId && v.uso_contador === data.uso ? { ...v, milling_lot_id: newLot.id } : v)); }} onViewLotDetail={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onDayClose={(data) => { const dateObj = new Date(data.productionDate); const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); let newLPId = ''; let totalOliveKg = 0; let totalRealOilKg = 0; let allMillingLotsIds: string[] = []; let yieldFactor = 0; let oilDifference = 0; const newLots = millingLots.filter(l => data.selectedLotIds.includes(l.id)); const newLotsOliveKg = newLots.reduce((acc, l) => acc + l.kilos_aceituna, 0); const newRealOilInput = data.totalRealOil; if (data.mergeWithLpId) { const existingLP = productionLots.find(lp => lp.id === data.mergeWithLpId); if (!existingLP) return alert("Error crítico: Tanda a fusionar no encontrada."); newLPId = existingLP.id; allMillingLotsIds = [...existingLP.millingLotsIds, ...data.selectedLotIds]; totalOliveKg = existingLP.totalOliveKg + newLotsOliveKg; totalRealOilKg = existingLP.totalRealOilKg + newRealOilInput; oilDifference = newRealOilInput; } else { const baseId = `LP-${dateStr}`; let suffix = ''; let counter = 1; while (productionLots.some(lp => lp.id === baseId + suffix)) { suffix = `-${String.fromCharCode(65 + counter)}`; counter++; } newLPId = baseId + suffix; allMillingLotsIds = data.selectedLotIds; totalOliveKg = newLotsOliveKg; totalRealOilKg = newRealOilInput; oilDifference = newRealOilInput; } yieldFactor = totalOliveKg > 0 ? totalRealOilKg / totalOliveKg : 0; const updatedMillingLots = millingLots.map(lot => { if (allMillingLotsIds.includes(lot.id)) { return { ...lot, kilos_aceite_real: lot.kilos_aceituna * yieldFactor, deposito_id: data.targetTankId }; } return lot; }); setMillingLots(updatedMillingLots); const updatedVales = vales.map(v => { if (v.milling_lot_id && allMillingLotsIds.includes(v.milling_lot_id)) { return { ...v, estado: ValeStatus.MOLTURADO }; } return v; }); setVales(updatedVales); const newProductionLot: ProductionLot = { id: newLPId, almazaraId: 'private', fecha: data.productionDate, millingLotsIds: allMillingLotsIds, totalOliveKg: totalOliveKg, totalRealOilKg: totalRealOilKg, targetTankId: data.targetTankId, notes: data.notes, campaign: CAMPAIGN }; if (data.mergeWithLpId) { setProductionLots(prev => prev.map(lp => lp.id === data.mergeWithLpId ? newProductionLot : lp)); } else { setProductionLots(prev => [...prev, newProductionLot]); } setTanks(prev => prev.map(t => { if (t.id === data.targetTankId) { const newKg = t.currentKg + oilDifference; const shouldClose = newKg >= t.maxCapacityKg; return { ...t, currentKg: newKg, variety_id: t.currentKg === 0 && newLots.length > 0 ? String(newLots[0].variedad) : t.variety_id, status: shouldClose ? 'FULL' : t.status, currentBatchId: newLPId }; } return t; })); const movementType = data.mergeWithLpId ? 'Ajuste Fusión Tanda' : 'Entrada Molturación (Tanda)'; const adjustmentMovement: OilMovement = { id: `PROD-${newLPId}-${Date.now()}`, almazaraId: 'private', date: new Date().toISOString(), source_tank_id: data.targetTankId, target_tank_id: data.targetTankId, kg: oilDifference, variety: movementType, operator: OWNER_NAME, batch_id: newLPId, closureDetails: { startDate: data.productionDate, endDate: new Date().toISOString(), valesIds: [], millingLots: data.selectedLotIds, totalKgConsolidated: totalRealOilKg } }; setOilMovements(prev => [...prev, adjustmentMovement]); }} />;
      case 'cellar': return <CellarDashboard tanks={tanks} millingLots={millingLots} vales={vales} producers={producers} oilMovements={oilMovements} oilExits={oilExits} productionLots={productionLots} initialSelectedTankId={externalOpenTankId} onTransfer={(data) => { setTanks(tanks.map(t => { if (t.id === data.sourceTankId) return { ...t, currentKg: t.currentKg - data.kg }; if (t.id === data.targetTankId) { const newKg = t.currentKg + data.kg; const isFull = newKg >= t.maxCapacityKg; return { ...t, currentKg: newKg, variety_id: tanks.find(s => s.id === data.sourceTankId)?.variety_id, status: isFull ? 'FULL' : t.status }; } return t; })); setOilMovements([...oilMovements, { id: `MOV-${Date.now()}`, almazaraId: 'private', date: data.date, source_tank_id: data.sourceTankId, target_tank_id: data.targetTankId, kg: data.kg, variety: 'Trasiego', operator: OWNER_NAME }]); }} onResetTank={(tankId) => { setTanks(prev => prev.map(t => { if (t.id !== tankId) return t; const newCycle = (t.cycleCount || 1) + 1; return { ...t, cycleCount: newCycle, currentKg: 0, variety_id: undefined, currentBatchId: `BATCH-${t.id}-${newCycle}-${Date.now()}`, status: 'FILLING' }; })); }} onCloseTankLot={(tankId) => { const tank = tanks.find(t => t.id === tankId); if (!tank) return; const closureMovement: OilMovement = { id: `CLOSURE-${tankId}-${Date.now()}`, almazaraId: 'private', date: new Date().toISOString(), source_tank_id: tankId, target_tank_id: tankId, kg: tank.currentKg, variety: tank.variety_id || 'Mezcla', operator: OWNER_NAME }; setOilMovements([...oilMovements, closureMovement]); setTanks(prev => prev.map(t => t.id === tankId ? { ...t, status: 'FULL' } : t)); }} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProducer={(producerId) => { const p = producers.find(x => x.id === producerId); if(p) {setSelectedProducer(p); setActiveTab('producers');} }} onViewExit={(exit) => { setTraceSearchTerm(exit.id); setActiveTab('traceability'); }} />;
      
      // --- LOGICA REVISADA ENVASADORA ---
      case 'packaging':
        return <PackagingDashboard 
            tanks={tanks} 
            nurseTank={nurseTank} 
            finishedProducts={finishedProducts} 
            packagingLots={packagingLots} 
            packagingFormats={appConfig.packagingFormats}
            availableAuxLots={auxEntries.map(e => {
                const def = appConfig.auxiliaryProducts.find(p => p.name === e.materialType);
                return { ...e, remaining: e.quantity, category: def ? def.category : 'Otro' };
            })} 
            oilMovements={oilMovements} // Pasamos movimientos para historial
            onFillNurseTank={(kg, sourceId, date) => { 
                const currentYear = new Date(date).getFullYear();
                const previousTransfers = oilMovements.filter(m => 
                    m.source_tank_id === sourceId && 
                    m.target_tank_id === 999 && 
                    new Date(m.date).getFullYear() === currentYear
                ).length;
                
                const nextSequence = previousTransfers + 1;
                // GENERAR BATCH ID Y ACTUALIZAR NODRIZA (INMEDIATO)
                const batchId = `${sourceId}/${nextSequence}/${currentYear}`; 
                const sourceTank = tanks.find(t => t.id === sourceId);
                const variety = sourceTank?.variety_id || 'Mezcla';

                setNurseTank({ 
                    ...nurseTank, 
                    currentKg: nurseTank.currentKg + kg, 
                    lastEntryDate: date, 
                    lastSourceTankId: sourceId, 
                    lastEntryId: nextSequence,
                    currentBatchId: batchId,
                    currentVariety: variety
                }); 

                setTanks(tanks.map(t => t.id === sourceId ? { ...t, currentKg: t.currentKg - kg } : t)); 
                
                // GUARDAR MOVIMIENTO (CRÍTICO PARA HISTORIAL)
                const newMovement = { 
                    id: `MOV-NURSE-${Date.now()}`, 
                    almazaraId: 'private', 
                    date: date, 
                    source_tank_id: sourceId, 
                    target_tank_id: 999, 
                    kg: kg, 
                    variety: variety, 
                    operator: OWNER_NAME, 
                    batch_id: batchId 
                };
                setOilMovements(prev => [...prev, newMovement]); // Push al historial global
            }} 
            onPackagingRun={(lot) => { setPackagingLots([...packagingLots, lot]); setNurseTank({ ...nurseTank, currentKg: nurseTank.currentKg - lot.kgUsed }); const existing = finishedProducts.find(p => p.lotId === lot.id); if (existing) setFinishedProducts(finishedProducts.map(p => p.lotId === lot.id ? { ...p, unitsAvailable: p.unitsAvailable + lot.units } : p)); else setFinishedProducts([...finishedProducts, { id: `FP-${lot.id}`, almazaraId: 'private', lotId: lot.id, format: lot.format, type: lot.type, unitsAvailable: lot.units }]); }} 
            onViewBatch={(batchId) => { setTraceSearchTerm(batchId); setActiveTab('traceability'); }}
        />;
      
      case 'auxiliary': return <AuxiliaryWarehouse entries={auxEntries} stockData={auxStock} availableProducts={appConfig.auxiliaryProducts || []} onAddEntry={(entry) => setAuxEntries([...auxEntries, entry])} />;
      case 'direct_sales': return <DirectSalesDashboard vales={vales} customers={customers} producers={producers} onViewVale={(v)=>{setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true);}} onViewProducer={setSelectedProducer} onViewCustomer={setSelectedCustomer} />;
      case 'sales': return <SalesDashboard finishedProducts={finishedProducts} customers={customers} salesOrders={salesOrders} pomaceExits={pomaceExits} oilExits={oilExits} tanks={tanks} currentCampaign={appConfig.currentCampaign} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onProcessSale={(order) => { setSalesOrders([...salesOrders, order]); setFinishedProducts(finishedProducts.map(p => { const line = order.products.find(sl => sl.lotId === p.lotId); return line ? { ...p, unitsAvailable: p.unitsAvailable - line.units } : p; })); }} onProcessPomaceExit={(exit) => setPomaceExits([...pomaceExits, exit])} onProcessBulkExit={(data) => { data.sources.forEach(s => { const exit: OilExit = { id: `EXT-${Date.now()}-${s.tankId}`, almazaraId: 'private', tank_id: s.tankId, type: ExitType.CISTERNA, date: data.date, kg: s.kg, kg_after_exit: 0, customer_id: data.customerId, driver_name: data.driver, license_plate: data.plate, seals: data.seals, deliveryNote: data.deliveryNote }; setOilExits(prev => [...prev, exit]); setTanks(prev => prev.map(t => t.id === s.tankId ? { ...t, currentKg: t.currentKg - s.kg } : t)); }); }} />;
      case 'traceability': return <TraceabilityDashboard initialSearch={traceSearchTerm} packagingLots={packagingLots} millingLots={millingLots} vales={vales} producers={producers} salesOrders={salesOrders} customers={customers} tanks={tanks} appConfig={appConfig} oilMovements={oilMovements} oilExits={oilExits} productionLots={productionLots} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onNavigateToTank={(tankId) => { setExternalOpenTankId(tankId); setActiveTab('cellar'); }} />;
      case 'analytics': return <AnalyticsDashboard currentCampaign={CAMPAIGN} currentVales={vales} currentSales={salesOrders} currentExits={oilExits} customers={customers} />;
      case 'config': return <SettingsDashboard config={appConfig} currentUser={currentUser} onUpdateConfig={setAppConfig} vales={vales} producers={producers} millingLots={millingLots} tanks={tanks} hoppers={hoppers} customers={customers} nurseTank={nurseTank} onUpdateInfrastructure={(nt, nh, ut, nc) => { if(ut) setTanks(ut); if(nc) setNurseTank(p => ({...p, maxCapacityKg: nc})); setHoppers(prev => { if (nh === prev.length) return prev; if (nh > prev.length) { const newHoppers = Array.from({ length: nh - prev.length }, (_, i) => ({ id: prev.length + i + 1, almazaraId: 'private', name: `Tolva ${prev.length + i + 1}`, isActive: false, currentUse: 1 })); return [...prev, ...newHoppers]; } else { return prev.slice(0, nh); } }); }} />;
      default: return null;
    }
  };

  if (isAuthChecking) return <div className="min-h-screen bg-[#F4F7F4] flex items-center justify-center font-bold text-gray-400">Cargando sistema...</div>;
  if (!isLoggedIn || !currentUser) return <AuthScreen onLogin={handleLogin} onRegister={()=>{}} />;

  return (
    <div className="flex min-h-screen bg-[#F4F7F4] overflow-x-hidden">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedProducer(null); setSelectedCustomer(null); setTraceSearchTerm(''); setExternalOpenProductionLotId(null); setExternalOpenTankId(null); }} currentUser={currentUser} />
      <main className="flex-1 ml-16 md:ml-20 lg:ml-64 p-4 md:p-6 lg:p-10 transition-all duration-300 w-full max-w-[100vw] overflow-x-hidden">
        {!showValesForm && !showProducerForm && !showCustomerForm ? (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <span className="px-2 py-0.5 rounded-md bg-black text-[#D9FF66] text-[10px] font-black uppercase tracking-widest">{String(appConfig.companyName)}</span>
                   <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#D9FF66] text-black text-[10px] font-black uppercase tracking-widest border border-black/10">
                      <CalendarRange size={10} /> Campaña: {String(appConfig.currentCampaign)}
                   </span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter text-[#111111] uppercase">
                    {String(NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Panel de Control')}
                </h1>
              </div>
              {!['dashboard', 'config', 'cellar', 'packaging', 'auxiliary', 'sales', 'analytics', 'traceability', 'direct_sales', 'milling'].includes(activeTab) && (
                <button onClick={handleRegisterClick} className="flex items-center justify-center gap-2 bg-[#111111] text-white px-7 py-4 rounded-3xl font-black text-sm shadow-xl border-b-4 border-[#D9FF66] uppercase">
                  <Plus size={18} /> Nuevo Registro
                </button>
              )}
            </header>
            {renderContent()}
          </>
        ) : (
          <div className="animate-in slide-in-from-top-4 duration-500">
            {showValesForm && <ValesForm producers={producers} hoppers={hoppers} vales={vales} lastValeId={vales.length} customers={customers} millingLots={millingLots} productionLots={productionLots} tanks={tanks} packagingLots={packagingLots} oilExits={oilExits} onSave={handleValeSave} onCancel={() => setShowValesForm(false)} editVale={editingVale} readOnly={isValeReadOnly} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onViewTank={(tankId) => { const t = tanks.find(x => x.id === tankId); if(t) { setActiveTab('cellar'); setTimeout(()=>setSelectedProducer(null), 100); } }} />}
            {showProducerForm && <ProducerForm onSave={(p) => { setProducers(editingProducer ? producers.map(o => o.id === p.id ? p : o) : [...producers, p]); setShowProducerForm(false); }} onCancel={() => setShowProducerForm(false)} initialData={editingProducer} />}
            {showCustomerForm && <CustomerForm onSave={(c) => { setCustomers(editingCustomer ? customers.map(o => o.id === c.id ? c : o) : [...customers, c]); setShowCustomerForm(false); }} onCancel={() => setShowCustomerForm(false)} initialData={editingCustomer} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
