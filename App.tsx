
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
import { DynamicDashboard } from './components/DynamicDashboard';
import { AuthScreen } from './components/AuthScreen';
import { Tank, UserRole, Producer, Vale, Hopper, MillingLot, Customer, OilExit, OilMovement, NurseTank, PackagingLot, FinishedProduct, AuxEntry, AuxStock, SalesOrder, PomaceExit, AppConfig, User, ValeType, ValeStatus, OliveVariety, ExitType, ProductionLot } from './types';
import { NAV_ITEMS } from './constants';
import { Plus, CalendarRange, ShieldCheck } from 'lucide-react';

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

  // Estados con Persistencia Completa para Testing
  const [vales, setVales] = useState<Vale[]>(() => getPersistedState('app_vales', []));
  const [producers, setProducers] = useState<Producer[]>(() => getPersistedState('app_producers', []));
  const [customers, setCustomers] = useState<Customer[]>(() => getPersistedState('app_customers', []));
  const [millingLots, setMillingLots] = useState<MillingLot[]>(() => getPersistedState('app_millingLots', []));
  const [productionLots, setProductionLots] = useState<ProductionLot[]>(() => getPersistedState('app_productionLots', []));
  const [oilExits, setOilExits] = useState<OilExit[]>(() => getPersistedState('app_oilExits', []));
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => getPersistedState('app_salesOrders', []));
  const [pomaceExits, setPomaceExits] = useState<PomaceExit[]>(() => getPersistedState('app_pomaceExits', []));
  const [packagingLots, setPackagingLots] = useState<PackagingLot[]>(() => getPersistedState('app_packagingLots', []));
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>(() => getPersistedState('app_finishedProducts', []));
  const [auxEntries, setAuxEntries] = useState<AuxEntry[]>(() => getPersistedState('app_auxEntries', []));
  const [hoppers, setHoppers] = useState<Hopper[]>(() => getPersistedState('app_hoppers', [
    { id: 1, almazaraId: 'private', name: 'Tolva 1', isActive: false, currentUse: 1 },
    { id: 2, almazaraId: 'private', name: 'Tolva 2', isActive: false, currentUse: 1 },
    { id: 3, almazaraId: 'private', name: 'Tolva 3', isActive: false, currentUse: 1 }
  ]));

  // Efectos de Persistencia para todos los estados
  useEffect(() => { localStorage.setItem('app_tanks', JSON.stringify(tanks)); }, [tanks]);
  useEffect(() => { localStorage.setItem('app_nurseTank', JSON.stringify(nurseTank)); }, [nurseTank]);
  useEffect(() => { localStorage.setItem('app_oilMovements', JSON.stringify(oilMovements)); }, [oilMovements]);

  useEffect(() => { localStorage.setItem('app_vales', JSON.stringify(vales)); }, [vales]);
  useEffect(() => { localStorage.setItem('app_producers', JSON.stringify(producers)); }, [producers]);
  useEffect(() => { localStorage.setItem('app_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('app_millingLots', JSON.stringify(millingLots)); }, [millingLots]);
  useEffect(() => { localStorage.setItem('app_productionLots', JSON.stringify(productionLots)); }, [productionLots]);
  useEffect(() => { localStorage.setItem('app_oilExits', JSON.stringify(oilExits)); }, [oilExits]);
  useEffect(() => { localStorage.setItem('app_salesOrders', JSON.stringify(salesOrders)); }, [salesOrders]);
  useEffect(() => { localStorage.setItem('app_pomaceExits', JSON.stringify(pomaceExits)); }, [pomaceExits]);
  useEffect(() => { localStorage.setItem('app_packagingLots', JSON.stringify(packagingLots)); }, [packagingLots]);
  useEffect(() => { localStorage.setItem('app_finishedProducts', JSON.stringify(finishedProducts)); }, [finishedProducts]);
  useEffect(() => { localStorage.setItem('app_auxEntries', JSON.stringify(auxEntries)); }, [auxEntries]);
  useEffect(() => { localStorage.setItem('app_hoppers', JSON.stringify(hoppers)); }, [hoppers]);

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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
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

  // --- HANDLERS VENTAS ---
  const handleProcessSale = (order: SalesOrder) => {
    setSalesOrders(prev => [...prev, order]);
    // Actualizar Stock de Producto Terminado
    setFinishedProducts(prev => prev.map(fp => {
      const line = order.products.find(p => p.finishedProductId === fp.id);
      if (line) {
        return { ...fp, unitsAvailable: fp.unitsAvailable - line.units };
      }
      return fp;
    }));
  };

  const handleProcessPomaceExit = (exit: PomaceExit) => {
    setPomaceExits(prev => [...prev, exit]);
  };

  const handleProcessBulkExit = (data: { customerId: string, date: string, driver: string, plate: string, seals: string, deliveryNote: string, sources: { tankId: number, kg: number }[] }) => {
    const newExits: OilExit[] = data.sources.map((s, idx) => ({
      id: `EXIT-${Date.now()}-${s.tankId}-${idx}`,
      almazaraId: 'private',
      tank_id: s.tankId,
      type: ExitType.CISTERNA,
      date: data.date,
      kg: s.kg,
      kg_after_exit: (tanks.find(t => t.id === s.tankId)?.currentKg || 0) - s.kg,
      customer_id: data.customerId,
      driver_name: data.driver,
      license_plate: data.plate,
      seals: data.seals,
      deliveryNote: data.deliveryNote
    }));

    setOilExits(prev => [...prev, ...newExits]);

    // Actualizar Depósitos (Sumando todas las extracciones del mismo depósito)
    setTanks(prev => prev.map(t => {
      const totalKgToSubtract = data.sources
        .filter(s => s.tankId === t.id)
        .reduce((acc, s) => acc + s.kg, 0);

      if (totalKgToSubtract > 0) {
        return { ...t, currentKg: t.currentKg - totalKgToSubtract };
      }
      return t;
    }));

    // Registrar Movimiento Salida (Con IDs únicos por línea)
    const newMovements: OilMovement[] = data.sources.map((s, idx) => ({
      id: `MOV-EXIT-${Date.now()}-${s.tankId}-${idx}`,
      almazaraId: 'private',
      date: data.date,
      source_tank_id: s.tankId,
      target_tank_id: 0, // Salida externa
      kg: s.kg,
      variety: 'Venta Granel',
      operator: 'Admin'
    }));
    setOilMovements(prev => [...prev, ...newMovements]);
  };

  const handleStartCampaign = (nextCampaign: string) => {
    // Actualizar configuración con nueva campaña
    setAppConfig(prev => ({
      ...prev,
      currentCampaign: nextCampaign
    }));

    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleCloseCampaign = () => {
    const campaignId = appConfig.currentCampaign;
    if (!campaignId) return;

    // 1. Snapshot de datos actuales para el histórico (ANTES de resetear!)
    const archiveData = {
      vales,
      producers,      // ← NUEVO: Necesario para nombres en PDF
      customers,      // ← NUEVO: Necesario para nombres en PDF
      oilMovements,
      oilExits,
      millingLots,
      productionLots,
      salesOrders,
      pomaceExits,
      packagingLots,
      finishedProducts,
      auxEntries,
      tanks,
      nurseTank,
      date: new Date().toISOString()
    };

    // Debug: Verificar que tenemos vales
    console.log('🗄️ Archivando campaña:', campaignId);
    console.log('📦 Vales a archivar:', vales.length);
    console.log('👥 Productores:', producers.length);
    console.log('🏢 Clientes:', customers.length);

    localStorage.setItem(`app_history_${campaignId}`, JSON.stringify(archiveData));

    // 2. Actualizar configuración y limpiar campañas antiguas (>5)
    const allPastCampaigns = [...new Set([...appConfig.pastCampaigns, campaignId])];

    let campaignsToKeep = allPastCampaigns;
    if (allPastCampaigns.length > 5) {
      const campaignsToDelete = allPastCampaigns.slice(0, allPastCampaigns.length - 5);
      console.log('🗑️ Eliminando campañas antiguas:', campaignsToDelete);

      campaignsToDelete.forEach(oldCampaign => {
        localStorage.removeItem(`app_history_${oldCampaign}`);
      });

      campaignsToKeep = allPastCampaigns.slice(-5);
    }

    const newConfig: AppConfig = {
      ...appConfig,
      currentCampaign: "",
      pastCampaigns: campaignsToKeep
    };
    setAppConfig(newConfig);

    // 3. RESETEAR TODO - La campaña siempre empieza desde cero
    setVales([]);
    setOilMovements([]);
    setOilExits([]);
    setMillingLots([]);
    setProductionLots([]);
    setSalesOrders([]);
    setPomaceExits([]);
    setPackagingLots([]);
    setFinishedProducts([]);
    setAuxEntries([]);

    // Forzar limpieza inmediata de localStorage (para evitar race conditions)
    localStorage.setItem('app_vales', '[]');
    localStorage.setItem('app_oilMovements', '[]');
    localStorage.setItem('app_oilExits', '[]');
    localStorage.setItem('app_millingLots', '[]');
    localStorage.setItem('app_productionLots', '[]');
    localStorage.setItem('app_salesOrders', '[]');
    localStorage.setItem('app_pomaceExits', '[]');
    localStorage.setItem('app_packagingLots', '[]');
    localStorage.setItem('app_finishedProducts', '[]');
    localStorage.setItem('app_auxEntries', '[]');

    // 4. Resetear infraestructura a vacío
    const emptyTanks = tanks.map(t => ({
      ...t,
      currentKg: 0,
      variety_id: undefined,
      currentBatchId: undefined,
      status: 'EMPTY' as const
    }));
    setTanks(emptyTanks);
    localStorage.setItem('app_tanks', JSON.stringify(emptyTanks));

    const emptyNurse = {
      ...nurseTank,
      currentKg: 0,
      currentLotId: null
    };
    setNurseTank(emptyNurse);
    localStorage.setItem('app_nurseTank', JSON.stringify(emptyNurse));

    console.log('✅ Campaña archivada correctamente');

    // Nota: Productores, Clientes, Configuración de Formatos y Usuarios se CONSERVAN.
    alert("Campaña cerrada y archivada. Descarga el PDF desde la sección de campañas archivadas.");
    setActiveTab('config');
  };



  const renderContent = () => {
    // SEGURIDAD: Verificar si el usuario tiene permiso para esta pestaña
    const currentNavItem = NAV_ITEMS.find(n => n.id === activeTab);
    if (currentNavItem?.allowedRoles && !currentNavItem.allowedRoles.includes(currentUser?.role as UserRole)) {
      return (
        <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
            <ShieldCheck size={40} />
          </div>
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 font-mono">Acceso Denegado</p>
          <h2 className="text-3xl font-black text-[#111111] uppercase tracking-tighter mb-4">No tienes permisos</h2>
          <p className="text-gray-500 text-sm mb-8">Lo sentimos, esta sección está reservada únicamente para personal de administración.</p>
          <button onClick={() => setActiveTab('dashboard')} className="px-8 py-4 bg-[#111111] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl">
            Volver al Panel Principal
          </button>
        </div>
      );
    }

    const currentC = appConfig.currentCampaign;

    // Filtros de Campaña para CADA estado relevante
    const fVales = vales.filter(v => (v.campaign || appConfig.currentCampaign) === currentC);
    const fMovements = oilMovements.filter(m => (m.campaign || appConfig.currentCampaign) === currentC);
    const fExits = oilExits.filter(e => (e.campaign || appConfig.currentCampaign) === currentC);
    const fMilling = millingLots.filter(l => (l.campaign || appConfig.currentCampaign) === currentC);
    const fProdLots = productionLots.filter(p => (p.campaign || appConfig.currentCampaign) === currentC);
    const fSales = salesOrders.filter(s => (s.campaign || appConfig.currentCampaign) === currentC);
    const fPackLots = packagingLots.filter(p => (p.campaign || appConfig.currentCampaign) === currentC);
    const fAuxEntries = auxEntries.filter(e => (e.campaign || appConfig.currentCampaign) === currentC);

    switch (activeTab) {
      // ... (Resto de casos sin cambios)
      case 'dashboard': return <DynamicDashboard config={appConfig} tanks={tanks} hoppers={hoppers} vales={fVales} millingLots={fMilling} auxStock={auxStock} salesOrders={fSales} producers={producers} oilMovements={fMovements} oilExits={fExits} productionLots={fProdLots} onExit={() => { }} onStartLot={() => { }} onViewTankDetails={() => { }} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProducer={(producerId) => { const p = producers.find(x => x.id === producerId); if (p) { setSelectedProducer(p); setActiveTab('producers'); } }} onViewExit={(exit) => { setTraceSearchTerm(exit.id); setActiveTab('traceability'); }} setActiveTab={setActiveTab} />;
      case 'producers': if (selectedProducer) return <ProducerDetail producer={selectedProducer} vales={vales} onBack={() => setSelectedProducer(null)} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onEdit={() => { setEditingProducer(selectedProducer); setShowProducerForm(true); }} onArchive={() => { }} onDelete={() => { }} appConfig={appConfig} />; return <ProducersList producers={producers} onSelect={setSelectedProducer} />;
      case 'customers': if (selectedCustomer) return <CustomerDetail customer={selectedCustomer} oilExits={fExits} vales={vales} salesOrders={fSales} pomaceExits={pomaceExits} onBack={() => setSelectedCustomer(null)} onEdit={() => { setEditingCustomer(selectedCustomer); setShowCustomerForm(true); }} onArchive={() => { }} onDelete={() => { }} />; return <CustomersList customers={customers} onSelect={setSelectedCustomer} />;
      case 'vales': return <ValesList vales={fVales} onEdit={(v) => { setEditingVale(v); setIsValeReadOnly(false); setShowValesForm(true); }} onView={(v) => { setTraceSearchTerm(String(v.id_vale)); setActiveTab('traceability'); }} onViewProducer={(name) => { const p = producers.find(x => x.name === name); if (p) { setSelectedProducer(p); setActiveTab('producers'); } }} onUpdateAnalitica={() => { }} />;
      case 'milling': return <MillingControl hoppers={hoppers} pendingVales={vales.filter(v => v.estado === ValeStatus.PENDIENTE)} allVales={vales} tanks={tanks} millingLots={fMilling} productionLots={fProdLots} appConfig={appConfig} initialViewProductionLotId={externalOpenProductionLotId} onProcessLot={(data) => { const newId = `MT${data.hopperId}/${data.uso}`; if (millingLots.some(lot => lot.id === newId)) { console.warn(`Intento de duplicación de lote MT prevenido: ${newId}`); return; } const activeVales = vales.filter(v => v.ubicacion_id === data.hopperId && v.uso_contador === data.uso && v.estado === ValeStatus.PENDIENTE); const totalKgAceituna = activeVales.reduce((acc, v) => acc + v.kilos_netos, 0); const totalAceiteTeorico = calculateTheoreticalOil(activeVales); const variedadLote = activeVales.length > 0 ? activeVales[0].variedad : OliveVariety.PICUAL; const newLot: MillingLot = { id: newId, almazaraId: 'private', fecha: data.date, tolva_id: data.hopperId, uso_contador: data.uso, kilos_aceituna: totalKgAceituna, kilos_aceite_esperado: totalAceiteTeorico, kilos_aceite_real: data.realOil, deposito_id: data.targetTankId, variedad: variedadLote, vales_ids: activeVales.map(v => v.id_vale), campaign: appConfig.currentCampaign }; setMillingLots([...millingLots, newLot]); setVales(vales.map(v => v.ubicacion_id === data.hopperId && v.uso_contador === data.uso ? { ...v, milling_lot_id: newLot.id } : v)); }} onViewLotDetail={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onDayClose={(data) => { const dateObj = new Date(data.productionDate); const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); let newLPId = ''; let totalOliveKg = 0; let totalRealOilKg = 0; let allMillingLotsIds: string[] = []; let yieldFactor = 0; let oilDifference = 0; const newLots = millingLots.filter(l => data.selectedLotIds.includes(l.id)); const newLotsOliveKg = newLots.reduce((acc, l) => acc + l.kilos_aceituna, 0); const newRealOilInput = data.totalRealOil; if (data.mergeWithLpId) { const existingLP = productionLots.find(lp => lp.id === data.mergeWithLpId); if (!existingLP) return alert("Error crítico: Tanda a fusionar no encontrada."); newLPId = existingLP.id; allMillingLotsIds = [...existingLP.millingLotsIds, ...data.selectedLotIds]; totalOliveKg = existingLP.totalOliveKg + newLotsOliveKg; totalRealOilKg = existingLP.totalRealOilKg + newRealOilInput; oilDifference = newRealOilInput; } else { const baseId = `LP-${dateStr}`; let suffix = ''; let counter = 1; while (productionLots.some(lp => lp.id === baseId + suffix)) { suffix = `-${String.fromCharCode(65 + counter)}`; counter++; } newLPId = baseId + suffix; allMillingLotsIds = data.selectedLotIds; totalOliveKg = newLotsOliveKg; totalRealOilKg = newRealOilInput; oilDifference = newRealOilInput; } yieldFactor = totalOliveKg > 0 ? totalRealOilKg / totalOliveKg : 0; const updatedMillingLots = millingLots.map(lot => { if (allMillingLotsIds.includes(lot.id)) { return { ...lot, kilos_aceite_real: lot.kilos_aceituna * yieldFactor, deposito_id: data.targetTankId }; } return lot; }); setMillingLots(updatedMillingLots); const updatedVales = vales.map(v => { if (v.milling_lot_id && allMillingLotsIds.includes(v.milling_lot_id)) { return { ...v, estado: ValeStatus.MOLTURADO }; } return v; }); setVales(updatedVales); const newProductionLot: ProductionLot = { id: newLPId, almazaraId: 'private', fecha: data.productionDate, millingLotsIds: allMillingLotsIds, totalOliveKg: totalOliveKg, totalRealOilKg: totalRealOilKg, targetTankId: data.targetTankId, notes: data.notes, campaign: appConfig.currentCampaign }; if (data.mergeWithLpId) { setProductionLots(prev => prev.map(lp => lp.id === data.mergeWithLpId ? newProductionLot : lp)); } else { setProductionLots(prev => [...prev, newProductionLot]); } setTanks(prev => prev.map(t => { if (t.id === data.targetTankId) { const newKg = t.currentKg + oilDifference; const shouldClose = newKg >= t.maxCapacityKg; return { ...t, currentKg: newKg, variety_id: t.currentKg === 0 && newLots.length > 0 ? String(newLots[0].variedad) : t.variety_id, status: shouldClose ? 'FULL' : t.status, currentBatchId: newLPId }; } return t; })); const movementType = data.mergeWithLpId ? 'Ajuste Fusión Tanda' : 'Entrada Molturación (Tanda)'; const adjustmentMovement: OilMovement = { id: `PROD-${newLPId}-${Date.now()}`, almazaraId: 'private', date: new Date().toISOString(), source_tank_id: data.targetTankId, target_tank_id: data.targetTankId, kg: oilDifference, variety: movementType, operator: OWNER_NAME, batch_id: newLPId, campaign: appConfig.currentCampaign, closureDetails: { startDate: data.productionDate, endDate: new Date().toISOString(), valesIds: [], millingLots: data.selectedLotIds, totalKgConsolidated: totalRealOilKg } }; setOilMovements(prev => [...prev, adjustmentMovement]); }} />;
      case 'sales':
        return (
          <SalesDashboard
            finishedProducts={finishedProducts}
            customers={customers}
            salesOrders={salesOrders}
            pomaceExits={pomaceExits}
            oilExits={oilExits}
            tanks={tanks}
            currentCampaign={appConfig.currentCampaign}
            appConfig={appConfig}
            onProcessSale={handleProcessSale}
            onProcessPomaceExit={handleProcessPomaceExit}
            onProcessBulkExit={handleProcessBulkExit}
            onViewLot={(lotId) => {
              setTraceSearchTerm(lotId);
              setActiveTab('traceability');
            }}
          />
        );
      case 'cellar': return <CellarDashboard tanks={tanks} millingLots={millingLots} vales={vales} producers={producers} oilMovements={oilMovements} oilExits={oilExits} productionLots={productionLots} initialSelectedTankId={externalOpenTankId} onTransfer={(data) => { setTanks(tanks.map(t => { if (t.id === data.sourceTankId) return { ...t, currentKg: t.currentKg - data.kg }; if (t.id === data.targetTankId) { const newKg = t.currentKg + data.kg; const isFull = newKg >= t.maxCapacityKg; return { ...t, currentKg: newKg, variety_id: tanks.find(s => s.id === data.sourceTankId)?.variety_id, status: isFull ? 'FULL' : t.status }; } return t; })); setOilMovements([...oilMovements, { id: `MOV-${Date.now()}`, almazaraId: 'private', date: data.date, source_tank_id: data.sourceTankId, target_tank_id: data.targetTankId, kg: data.kg, variety: 'Trasiego', operator: OWNER_NAME }]); }} onResetTank={(tankId) => { setTanks(prev => prev.map(t => { if (t.id !== tankId) return t; const newCycle = (t.cycleCount || 1) + 1; return { ...t, cycleCount: newCycle, currentKg: 0, variety_id: undefined, currentBatchId: `BATCH-${t.id}-${newCycle}-${Date.now()}`, status: 'FILLING' }; })); }} onCloseTankLot={(tankId) => { const tank = tanks.find(t => t.id === tankId); if (!tank) return; const closureMovement: OilMovement = { id: `CLOSURE-${tankId}-${Date.now()}`, almazaraId: 'private', date: new Date().toISOString(), source_tank_id: tankId, target_tank_id: tankId, kg: tank.currentKg, variety: tank.variety_id || 'Mezcla', operator: OWNER_NAME }; setOilMovements([...oilMovements, closureMovement]); setTanks(prev => prev.map(t => t.id === tankId ? { ...t, status: 'FULL' } : t)); }} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProducer={(producerId) => { const p = producers.find(x => x.id === producerId); if (p) { setSelectedProducer(p); setActiveTab('producers'); } }} onViewExit={(exit) => { setTraceSearchTerm(exit.id); setActiveTab('traceability'); }} />;

      case 'packaging': return <PackagingDashboard
        tanks={tanks}
        nurseTank={nurseTank}
        packagingLots={fPackLots}
        finishedProducts={finishedProducts}
        packagingFormats={appConfig.packagingFormats}
        availableAuxLots={auxEntries.map(e => {
          const def = appConfig.auxiliaryProducts.find(p => p.name === e.materialType);
          return { ...e, remaining: e.quantity, category: def ? def.category : 'Otro' };
        })}
        oilMovements={fMovements}
        onFillNurseTank={(kg, sourceId, date) => {
          const currentYear = new Date(date).getFullYear();
          const previousTransfers = oilMovements.filter(m => m.source_tank_id === sourceId && m.target_tank_id === 999 && new Date(m.date).getFullYear() === currentYear).length;
          const nextSequence = previousTransfers + 1;
          const batchId = `${sourceId}/${nextSequence}/${currentYear}`;
          const sourceTank = tanks.find(t => t.id === sourceId);
          const variety = sourceTank?.variety_id || 'Mezcla';
          setNurseTank({ ...nurseTank, currentKg: nurseTank.currentKg + kg, lastEntryDate: date, lastSourceTankId: sourceId, lastEntryId: nextSequence, currentBatchId: batchId, currentVariety: variety });
          setTanks(tanks.map(t => t.id === sourceId ? { ...t, currentKg: t.currentKg - kg } : t));
          const newMovement = { id: `MOV-NURSE-${Date.now()}`, almazaraId: 'private', date: date, source_tank_id: sourceId, target_tank_id: 999, kg: kg, variety: variety, operator: OWNER_NAME, batch_id: batchId, campaign: appConfig.currentCampaign };
          setOilMovements(prev => [...prev, newMovement]);
        }} onPackagingRun={(lot) => {
          const lotWithCampaign = { ...lot, campaign: appConfig.currentCampaign };
          setPackagingLots([...packagingLots, lotWithCampaign]);
          if (lot.sourceTankId) {
            const tank = tanks.find(t => t.id === lot.sourceTankId);
            setTanks(tanks.map(t => t.id === lot.sourceTankId ? { ...t, currentKg: t.currentKg - lot.kgUsed } : t));
            const newMovement = { id: `MOV-PACK-SF-${Date.now()}`, almazaraId: 'private', date: lot.date, source_tank_id: lot.sourceTankId, target_tank_id: 998, kg: lot.kgUsed, variety: tank?.variety_id || 'Mezcla', operator: OWNER_NAME, batch_id: lot.id, campaign: appConfig.currentCampaign };
            setOilMovements(prev => [...prev, newMovement]);
          } else {
            setNurseTank({ ...nurseTank, currentKg: nurseTank.currentKg - lot.kgUsed });
          }
          const existing = finishedProducts.find(p => p.lotId === lot.id);
          if (existing) {
            setFinishedProducts(finishedProducts.map(p => p.lotId === lot.id ? { ...p, unitsAvailable: p.unitsAvailable + lot.units } : p));
          } else {
            setFinishedProducts([...finishedProducts, { id: `FP-${lot.id}`, almazaraId: 'private', lotId: lot.id, format: lot.format, type: lot.type, unitsAvailable: lot.units }]);
          }
        }} onViewBatch={(batchId) => { setTraceSearchTerm(batchId); setActiveTab('traceability'); }} />;


      case 'auxiliary': return <AuxiliaryWarehouse entries={fAuxEntries} stockData={auxStock} availableProducts={appConfig.auxiliaryProducts || []} onAddEntry={(entry) => setAuxEntries([...auxEntries, { ...entry, campaign: appConfig.currentCampaign }])} />;
      case 'direct_sales': return <DirectSalesDashboard vales={fVales} customers={customers} producers={producers} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProducer={setSelectedProducer} onViewCustomer={setSelectedCustomer} />;
      case 'traceability': return <TraceabilityDashboard initialSearch={traceSearchTerm} packagingLots={fPackLots} millingLots={fMilling} vales={fVales} producers={producers} salesOrders={fSales} customers={customers} tanks={tanks} appConfig={appConfig} oilMovements={fMovements} oilExits={fExits} productionLots={fProdLots} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onNavigateToTank={(tankId) => { setExternalOpenTankId(tankId); setActiveTab('cellar'); }} />;
      case 'config': return <SettingsDashboard config={appConfig} currentUser={currentUser} onUpdateConfig={setAppConfig} vales={fVales} salesOrders={fSales} oilExits={fExits} producers={producers} customers={customers} tanks={tanks} hoppers={hoppers} millingLots={fMilling} productionLots={fProdLots} oilMovements={fMovements} nurseTank={nurseTank} onUpdateInfrastructure={(nt, nh, ut, nc) => { if (ut) setTanks(ut); if (nc) setNurseTank(p => ({ ...p, maxCapacityKg: nc })); setHoppers(prev => { if (nh === prev.length) return prev; if (nh > prev.length) { const newHoppers = Array.from({ length: nh - prev.length }, (_, i) => ({ id: prev.length + i + 1, almazaraId: 'private', name: `Tolva ${prev.length + i + 1}`, isActive: false, currentUse: 1 })); return [...prev, ...newHoppers]; } else { return prev.slice(0, nh); } }); }} onArchiveCampaign={handleCloseCampaign} onStartCampaign={handleStartCampaign} pastCampaigns={appConfig.pastCampaigns} />;

    }
  };

  if (isAuthChecking) return <div className="min-h-screen bg-[#F4F7F4] flex items-center justify-center font-bold text-gray-400">Cargando sistema...</div>;

  if (!isLoggedIn) {
    return <AuthScreen onLogin={(user) => { setCurrentUser(user); setIsLoggedIn(true); }} authorizedUsers={appConfig.authorizedUsers} />;
  }

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSelectedProducer(null); setSelectedCustomer(null); setTraceSearchTerm(''); setExternalOpenProductionLotId(null); setExternalOpenTankId(null); }} currentUser={currentUser} onLogout={handleLogout} />
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
              {currentUser?.role !== UserRole.VIEWER && !['dashboard', 'config', 'cellar', 'packaging', 'auxiliary', 'sales', 'analytics', 'traceability', 'direct_sales', 'milling'].includes(activeTab) && (
                <button onClick={handleRegisterClick} className="flex items-center justify-center gap-2 bg-[#111111] text-white px-7 py-4 rounded-3xl font-black text-sm shadow-xl border-b-4 border-[#D9FF66] uppercase">
                  <Plus size={18} /> Nuevo Registro
                </button>
              )}
            </header>
            {renderContent()}
          </>
        ) : (
          <div className="animate-in slide-in-from-top-4 duration-500">
            {showValesForm && <ValesForm producers={producers} hoppers={hoppers} vales={vales} lastValeId={vales.length} customers={customers} millingLots={millingLots} productionLots={productionLots} tanks={tanks} packagingLots={packagingLots} oilExits={oilExits} oilMovements={oilMovements} onSave={handleValeSave} onCancel={() => setShowValesForm(false)} editVale={editingVale} readOnly={isValeReadOnly} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onViewTank={(tankId) => { const t = tanks.find(x => x.id === tankId); if (t) { setActiveTab('cellar'); setTimeout(() => setSelectedProducer(null), 100); } }} />}
            {showProducerForm && <ProducerForm onSave={(p) => { setProducers(editingProducer ? producers.map(o => o.id === p.id ? p : o) : [...producers, p]); setShowProducerForm(false); }} onCancel={() => setShowProducerForm(false)} initialData={editingProducer} />}
            {showCustomerForm && <CustomerForm onSave={(c) => { setCustomers(editingCustomer ? customers.map(o => o.id === c.id ? c : o) : [...customers, c]); setShowCustomerForm(false); }} onCancel={() => setShowCustomerForm(false)} initialData={editingCustomer} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
