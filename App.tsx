
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
import { Tank, UserRole, Producer, Vale, Hopper, MillingLot, Customer, OilExit, OilMovement, NurseTank, PackagingLot, FinishedProduct, AuxEntry, AuxStock, SalesOrder, PomaceExit, AppConfig, User, UserRole as Role, ValeType, ValeStatus, OliveVariety, ExitType, ProductionLot } from './types';
import { NAV_ITEMS } from './constants';
import { Plus, CalendarRange, ShieldCheck, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { useOfflineSync } from './src/lib/useOfflineSync';
import { syncQueue } from './src/lib/syncQueue';
import {
  fetchProducers,
  fetchVales,
  fetchTanks,
  fetchHoppers,
  fetchMillingLots,
  upsertProducer,
  upsertTank,
  upsertMillingLot,
  upsertVale,
  upsertProductionLot,
  upsertPackagingLot,
  upsertOilMovement,
  upsertSalesOrder,
  upsertPomaceExit,
  upsertAuxEntry,
  upsertOilExit,
  upsertCustomer,
  fetchCustomers,
  fetchProductionLots,
  fetchPackagingLots,
  fetchOilMovements,
  fetchSalesOrders,
  fetchPomaceExits,
  fetchAuxEntries,
  fetchOilExits,
  setSyncAlmazaraId,
  fetchAppConfig,
  upsertAppConfig,
  deleteTank,
  deleteHopper,
  fetchNurseTank,
  upsertNurseTank,
  upsertHopper,
  ALMAZARA_ID
} from './src/lib/supabaseSync';

const APP_NAME = "ALMAZARA PRIVADA 4.0";
const CAMPAIGN = "2025/2026";
const OWNER_NAME = "Administrador";

// --- HELPERS: DEFINED BEFORE USE TO AVOID REFERENCE ERROR ---

// Helper para inicializar estado desde localStorage
const getPersistedState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Si es un objeto (no array), fusionar con defaultValue para asegurar que existan los nuevos campos
      if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...parsed };
      }
      return parsed;
    }
    return defaultValue;
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return defaultValue;
  }
};

// --- SAFETY CHECK: Sanitize Config on Load ---
// Esto previene la pantalla blanca si faltan campos nuevos en la configuración guardada
const sanitizeConfig = (config: AppConfig): AppConfig => {
  return {
    ...config,
    authorizedUsers: Array.isArray(config.authorizedUsers) ? config.authorizedUsers : [],
    packagingFormats: Array.isArray(config.packagingFormats) ? config.packagingFormats : [],
    auxiliaryProducts: Array.isArray(config.auxiliaryProducts) ? config.auxiliaryProducts : [],
    dashboardWidgets: Array.isArray(config.dashboardWidgets) ? config.dashboardWidgets : [],
    sidebarConfig: Array.isArray(config.sidebarConfig) ? config.sidebarConfig : [],
    pastCampaigns: Array.isArray(config.pastCampaigns) ? config.pastCampaigns : [],
    varietySettings: config.varietySettings || {}
  };
};

const DEFAULT_APP_CONFIG: AppConfig = {
  almazaraId: 'unknown',
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

  // Usamos las funciones del scope global
  const [appConfig, setAppConfig] = useState<AppConfig>(() => sanitizeConfig(getPersistedState('app_config', DEFAULT_APP_CONFIG)));

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  const getActiveAlmazaraId = () => {
    return (currentUser?.almazaraId && currentUser.almazaraId !== 'unknown' && currentUser.almazaraId !== 'private-user')
      ? currentUser.almazaraId
      : ALMAZARA_ID;
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar_collapsed', String(newState));
      return newState;
    });
  };

  const [tanks, setTanks] = useState<Tank[]>(() => {
    const saved = getPersistedState<Tank[]>('app_tanks', []);
    if (saved && saved.length > 0) return saved;
    return Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, almazaraId: 'unknown', name: `D.${(i + 1).toString().padStart(2, '0')}`,
      maxCapacityKg: 50000, currentKg: 0, variety_id: undefined, cycleCount: 1, status: 'FILLING' as const
    }));
  });

  const [nurseTank, setNurseTank] = useState<NurseTank>(() => getPersistedState('app_nurseTank', {
    almazaraId: 'unknown', maxCapacityKg: 10000, currentKg: 0, lastEntryDate: null, lastSourceTankId: null, lastEntryId: 0
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
  const [hoppers, setHoppers] = useState<Hopper[]>(() => {
    const saved = getPersistedState<Hopper[]>('app_hoppers', []);
    if (saved && saved.length > 0) return saved;
    return [
      { id: 1, almazaraId: 'unknown', name: 'Tolva 1', isActive: false, currentUse: 1 },
      { id: 2, almazaraId: 'unknown', name: 'Tolva 2', isActive: false, currentUse: 1 },
      { id: 3, almazaraId: 'unknown', name: 'Tolva 3', isActive: false, currentUse: 1 }
    ];
  });

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
  useEffect(() => { localStorage.setItem('app_config', JSON.stringify(appConfig)); }, [appConfig]);

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
    // NUCLEAR OPTION: Limpieza forzada de caché al subir versión
    const SYS_VERSION = '4.2';
    const storedVersion = localStorage.getItem('sys_version');

    if (storedVersion !== SYS_VERSION) {
      console.log("Detectada nueva versión. Limpiando caché local...");
      const keysToRemove = [
        'app_vales', 'app_producers', 'app_customers', 'app_millingLots',
        'app_productionLots', 'app_oilExits', 'app_salesOrders',
        'app_pomaceExits', 'app_packagingLots', 'app_finishedProducts',
        'app_auxEntries', 'app_oilMovements', 'app_tanks', 'app_nurseTank',
        'app_hoppers', 'app_config'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('sys_version', SYS_VERSION);
      window.location.reload();
      return;
    }

    const timer = setTimeout(() => setIsAuthChecking(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: User) => {
    const almazaraId = (user.almazaraId && user.almazaraId !== 'unknown' && user.almazaraId !== 'private-user')
      ? user.almazaraId
      : ALMAZARA_ID;

    setSyncAlmazaraId(almazaraId);

    // Asegurar que el usuario tiene el ID correcto para la sesión
    const updatedUser = { ...user, almazaraId };
    setCurrentUser(updatedUser);
    setIsLoggedIn(true);
    localStorage.setItem('almazara_user', JSON.stringify(updatedUser));

    // Cargar configuración Y datos de Supabase al loguear
    const loadRemoteData = async () => {
      try {
        // 1. Cargar configuración
        const remoteConfig = await fetchAppConfig(almazaraId);
        if (remoteConfig) {
          console.log("✅ Configuración remota cargada");
          setAppConfig({
            ...remoteConfig,
            almazaraId // Asegurar que el ID sea correcto
          });
        } else {
          console.log("⚠️ No se encontró configuración remota, usando local/default.");
        }

        // 2. 🆕 NUEVO: Cargar TODOS los datos desde Supabase
        console.log("🔄 Cargando datos de Supabase para:", almazaraId);
        const [p, v, t, h, m, c, pl, pk, om, so, pe, ae, oe, nt] = await Promise.all([
          fetchProducers(almazaraId),
          fetchVales(almazaraId),
          fetchTanks(almazaraId),
          fetchHoppers(almazaraId),
          fetchMillingLots(almazaraId),
          fetchCustomers(almazaraId),
          fetchProductionLots(almazaraId),
          fetchPackagingLots(almazaraId),
          fetchOilMovements(almazaraId),
          fetchSalesOrders(almazaraId),
          fetchPomaceExits(almazaraId),
          fetchAuxEntries(almazaraId),
          fetchOilExits(almazaraId),
          fetchNurseTank(almazaraId)
        ]);

        // 3. Actualizar estados con datos del servidor
        if (p && p.length > 0) {
          console.log(`✅ ${p.length} productores cargados desde Supabase`);
          setProducers(p);
        }
        if (v && v.length > 0) {
          console.log(`✅ ${v.length} vales cargados desde Supabase`);
          setVales(v);
        }
        if (t && t.length > 0) setTanks(t);
        if (h && h.length > 0) setHoppers(h);
        if (m && m.length > 0) setMillingLots(m);
        if (c && c.length > 0) setCustomers(c);
        if (pl && pl.length > 0) setProductionLots(pl);
        if (pk && pk.length > 0) setPackagingLots(pk);
        if (om && om.length > 0) setOilMovements(om);
        if (so && so.length > 0) setSalesOrders(so);
        if (pe && pe.length > 0) setPomaceExits(pe);
        if (ae && ae.length > 0) setAuxEntries(ae);
        if (oe && oe.length > 0) setOilExits(oe);
        if (nt) setNurseTank(nt);

        console.log("✅ Todos los datos sincronizados desde Supabase");
      } catch (err) {
        console.error("❌ Error cargando datos remotos:", err);
      }
    };

    loadRemoteData();
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
        stockMap[prod.name] = { type: prod.name, category: prod.category, almazaraId: getActiveAlmazaraId(), totalIn: 0, totalOut: 0, currentStock: 0 };
      });
    }
    const batchToTypeMap: Record<string, string> = {};
    auxEntries.forEach(entry => {
      if (!stockMap[entry.materialType]) {
        stockMap[entry.materialType] = { type: entry.materialType, category: 'Otro', almazaraId: getActiveAlmazaraId(), totalIn: 0, totalOut: 0, currentStock: 0 };
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

  const handleUpdateConfig = (newConfig: AppConfig) => {
    setAppConfig(newConfig);
    upsertAppConfig(newConfig).catch(err => {
      console.error("Error sincronizando configuración:", err);
    });
  };

  const handleRegisterClick = () => {
    if (activeTab === 'producers') { setEditingProducer(null); setShowProducerForm(true); }
    else if (activeTab === 'customers') { setEditingCustomer(null); setShowCustomerForm(true); }
    else { setEditingVale(null); setIsValeReadOnly(false); setShowValesForm(true); }
  };

  const handleValeSave = async (v: Vale) => {
    const activeAlmazaraId = getActiveAlmazaraId();

    const valeToSave = {
      ...v,
      id: v.id || crypto.randomUUID(),
      almazaraId: activeAlmazaraId
    };

    const updatedVales = editingVale
      ? vales.map(old => old.id_vale === valeToSave.id_vale ? valeToSave : old)
      : [...vales, valeToSave];

    setVales(updatedVales);

    try {
      await upsertVale(valeToSave);
      console.log("Vale sincronizado con Supabase");
    } catch (err) {
      console.error("Error sincronizando vale:", err);
    }

    if (editingVale && valeToSave.milling_lot_id) {
      const relevantVales = updatedVales.filter(item => item.milling_lot_id === valeToSave.milling_lot_id);
      const newTheoreticalOil = calculateTheoreticalOil(relevantVales);
      setMillingLots(prevLots => prevLots.map(lot => {
        if (lot.id === valeToSave.milling_lot_id) {
          return { ...lot, kilos_aceite_esperado: newTheoreticalOil };
        }
        return lot;
      }));
    }
    setShowValesForm(false);
  };

  const handleProducerSave = async (p: Producer) => {
    const activeAlmazaraId = getActiveAlmazaraId();

    const producerToSave = {
      ...p,
      id: p.id || crypto.randomUUID(),
      almazaraId: activeAlmazaraId
    };

    const updatedProducers = editingProducer
      ? producers.map(old => old.id === producerToSave.id ? producerToSave : old)
      : [...producers, producerToSave];

    setProducers(updatedProducers);

    try {
      await upsertProducer(producerToSave);
      console.log("Productor sincronizado con Supabase");
    } catch (err) {
      console.error("Error sincronizando productor:", err);
    }

    setShowProducerForm(false);
    setEditingProducer(null);
  };

  const handleCustomerSave = async (c: Customer) => {
    const activeAlmazaraId = getActiveAlmazaraId();

    const customerToSave = {
      ...c,
      id: c.id || crypto.randomUUID(),
      almazaraId: activeAlmazaraId
    };

    const updatedCustomers = editingCustomer
      ? customers.map(old => old.id === customerToSave.id ? customerToSave : old)
      : [...customers, customerToSave];

    setCustomers(updatedCustomers);

    try {
      await upsertCustomer(customerToSave);
      console.log("Cliente sincronizado con Supabase");
    } catch (err) {
      console.error("Error sincronizando cliente:", err);
    }

    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  // --- LÓGICA DE CARGA DESDE SUPABASE ---
  const refreshAllData = async () => {
    if (!currentUser || isRefreshing) return;
    setIsRefreshing(true);
    const activeId = currentUser.almazaraId;
    console.log("🔄 Recarga manual solicitada para:", activeId);
    setSyncAlmazaraId(activeId);

    try {
      const [p, v, t, h, m, c, pl, pk, om, so, pe, ae, oe, nt] = await Promise.all([
        fetchProducers(activeId),
        fetchVales(activeId),
        fetchTanks(activeId),
        fetchHoppers(activeId),
        fetchMillingLots(activeId),
        fetchCustomers(activeId),
        fetchProductionLots(activeId),
        fetchPackagingLots(activeId),
        fetchOilMovements(activeId),
        fetchSalesOrders(activeId),
        fetchPomaceExits(activeId),
        fetchAuxEntries(activeId),
        fetchOilExits(activeId),
        fetchNurseTank(activeId)
      ]);

      // --- LÓGICA DE FUSIÓN (MERGE) PARA EVITAR BORRADOS ---
      const getMergedState = (serverItems: any[], localItems: any[], opType: string) => {
        const queue = syncQueue.get();
        const pendingIds = new Set(queue.filter(op => op.type === opType).map(op => op.payload.id || op.payload.id_vale));
        const pendingLocally = localItems.filter(item => pendingIds.has(item.id || item.id_vale));
        const serverIds = new Set(serverItems.map(item => item.id || item.id_vale));
        // Mezclamos: Lo del servidor manda, pero lo que tenemos pendiente localmente se mantiene si no está en el servidor
        return [...serverItems, ...pendingLocally.filter(item => !serverIds.has(item.id || item.id_vale))];
      };

      if (p) setProducers(prev => getMergedState(p, prev, 'upsertProducer'));
      if (v) setVales(prev => {
        const queueOps = syncQueue.get().filter(op => op.type === 'upsertVale');
        const pendingIds = new Set(queueOps.map(op => op.payload.id));
        const pendingLocally = prev.filter(item => pendingIds.has(item.id));
        const serverIds = new Set(v.map(item => item.id));
        return [...v, ...pendingLocally.filter(item => !serverIds.has(item.id))];
      });
      if (t && t.length > 0) setTanks(t);
      if (h && h.length > 0) setHoppers(h);
      if (m) setMillingLots(prev => getMergedState(m, prev, 'upsertMillingLot'));
      if (c) setCustomers(prev => getMergedState(c, prev, 'upsertCustomer'));
      if (pl) setProductionLots(prev => getMergedState(pl, prev, 'upsertProductionLot'));
      if (pk) setPackagingLots(prev => getMergedState(pk, prev, 'upsertPackagingLot'));
      if (om) setOilMovements(prev => getMergedState(om, prev, 'upsertOilMovement'));
      if (so) setSalesOrders(prev => getMergedState(so, prev, 'upsertSalesOrder'));
      if (pe) setPomaceExits(prev => getMergedState(pe, prev, 'upsertPomaceExit'));
      if (ae) setAuxEntries(prev => getMergedState(ae, prev, 'upsertAuxEntry'));
      if (oe) setOilExits(prev => getMergedState(oe, prev, 'upsertOilExit'));
      if (nt) setNurseTank(nt);

      console.log("✅ Datos actualizados correctamente");
    } catch (error) {
      console.error("❌ Error en recarga:", error);
      alert("Error al sincronizar datos. Comprueba tu conexión.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      refreshAllData();
    }
  }, [isLoggedIn, currentUser]);

  // --- HANDLERS VENTAS ---
  const handleProcessSale = async (order: SalesOrder) => {
    const orderToSave = {
      ...order,
      almazaraId: getActiveAlmazaraId()
    };
    setSalesOrders(prev => [...prev, orderToSave]);
    // Actualizar Stock de Producto Terminado
    setFinishedProducts(prev => prev.map(fp => {
      const line = orderToSave.products.find(p => p.finishedProductId === fp.id);
      if (line) {
        return { ...fp, unitsAvailable: fp.unitsAvailable - line.units };
      }
      return fp;
    }));

    try {
      await upsertSalesOrder(orderToSave);
      console.log("Pedido de venta sincronizado");
    } catch (err) {
      console.error("Error sincronizando venta:", err);
    }
  };

  const handleProcessPomaceExit = async (exit: PomaceExit) => {
    const exitToSave = {
      ...exit,
      almazaraId: getActiveAlmazaraId()
    };
    setPomaceExits(prev => [...prev, exitToSave]);
    try {
      await upsertPomaceExit(exitToSave);
      console.log("Salida de orujo sincronizada");
    } catch (err) {
      console.error("Error sincronizando salida de orujo:", err);
    }
  };

  const handleProcessBulkExit = async (data: { customerId: string, date: string, driver: string, plate: string, seals: string, deliveryNote: string, sources: { tankId: number, kg: number }[] }) => {
    const newExits: OilExit[] = data.sources.map((s, idx) => ({
      id: `EXIT-${Date.now()}-${s.tankId}-${idx}`,
      almazaraId: getActiveAlmazaraId(),
      tank_id: s.tankId,
      type: ExitType.CISTERNA,
      date: data.date,
      kg: s.kg,
      kg_after_exit: (tanks.find(t => t.id === s.tankId)?.currentKg || 0) - s.kg,
      customer_id: data.customerId,
      driver_name: data.driver,
      license_plate: data.plate,
      seals: data.seals,
      deliveryNote: data.deliveryNote,
      campaign: appConfig.currentCampaign
    }));

    setOilExits(prev => [...prev, ...newExits]);

    // Actualizar Depósitos
    const updatedTanks = tanks.map(t => {
      const totalKgToSubtract = data.sources
        .filter(s => s.tankId === t.id)
        .reduce((acc, s) => acc + s.kg, 0);

      if (totalKgToSubtract > 0) {
        return { ...t, currentKg: t.currentKg - totalKgToSubtract };
      }
      return t;
    });
    setTanks(updatedTanks);

    // Registrar Movimiento Salida
    const newMovements: OilMovement[] = data.sources.map((s, idx) => ({
      id: `MOV-EXIT-${Date.now()}-${s.tankId}-${idx}`,
      almazaraId: getActiveAlmazaraId(),
      date: data.date,
      source_tank_id: s.tankId,
      target_tank_id: 0, // Salida externa
      kg: s.kg,
      variety: 'Venta Granel',
      operator: currentUser?.fullName || 'Admin',
      campaign: appConfig.currentCampaign
    }));
    setOilMovements(prev => [...prev, ...newMovements]);

    try {
      await Promise.all(newExits.map(e => upsertOilExit(e)));
      await Promise.all(newMovements.map(m => upsertOilMovement(m)));
      await Promise.all(data.sources.map(s => {
        const t = updatedTanks.find(tank => tank.id === s.tankId);
        return t ? upsertTank(t) : Promise.resolve();
      }));
      console.log("Salida a granel sincronizada con éxito");
    } catch (err) {
      console.error("Error sincronizando salida a granel:", err);
    }
  };

  const handleStartCampaign = (nextCampaign: string) => {
    setAppConfig(prev => ({
      ...prev,
      currentCampaign: nextCampaign
    }));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    // 1. Limpiar LocalStorage para evitar fugas de datos
    const keysToRemove = [
      'app_vales', 'app_producers', 'app_customers', 'app_millingLots',
      'app_productionLots', 'app_oilExits', 'app_salesOrders',
      'app_pomaceExits', 'app_packagingLots', 'app_finishedProducts',
      'app_auxEntries', 'app_oilMovements', 'app_tanks', 'app_nurseTank',
      'app_hoppers', 'app_config'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 2. Limpiar Estado en Memoria
    setVales([]);
    setProducers([]);
    setCustomers([]);
    setMillingLots([]);
    setProductionLots([]);
    setOilExits([]);
    setSalesOrders([]);
    setPomaceExits([]);
    setPackagingLots([]);
    setFinishedProducts([]);
    setAuxEntries([]);
    setOilMovements([]);
    // No limpiamos tanques/tolvas para no romper UI visualmente, pero se recargarán

    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
    window.location.reload(); // Forzar recarga para asegurar limpieza total
  };

  const handleCloseCampaign = () => {
    const campaignId = appConfig.currentCampaign;
    if (!campaignId) return;

    const archiveData = {
      vales,
      producers,
      customers,
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

    localStorage.setItem(`app_history_${campaignId}`, JSON.stringify(archiveData));

    const allPastCampaigns = [...new Set([...appConfig.pastCampaigns, campaignId])];
    let campaignsToKeep = allPastCampaigns;
    if (allPastCampaigns.length > 5) {
      const campaignsToDelete = allPastCampaigns.slice(0, allPastCampaigns.length - 5);
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

    const emptyTanks = tanks.map(t => ({
      ...t,
      currentKg: 0,
      variety_id: undefined,
      currentBatchId: undefined,
      status: 'EMPTY' as const
    }));
    setTanks(emptyTanks);

    const emptyNurse = {
      ...nurseTank,
      currentKg: 0,
      currentLotId: null
    };
    setNurseTank(emptyNurse);

    alert("Campaña cerrada y archivada.");
    setActiveTab('config');
  };

  const renderContent = () => {
    const currentNavItem = NAV_ITEMS.find(n => n.id === activeTab);
    if (currentNavItem?.allowedRoles && !currentNavItem.allowedRoles.includes(currentUser?.role as UserRole)) {
      return (
        <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
            <ShieldCheck size={40} />
          </div>
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 font-mono">Acceso Denegado</p>
          <h2 className="text-3xl font-black text-[#111111] uppercase tracking-tighter mb-4">No tienes permisos</h2>
          <button onClick={() => setActiveTab('dashboard')} className="px-8 py-4 bg-[#111111] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl">
            Volver al Panel Principal
          </button>
        </div>
      );
    }

    const currentC = appConfig.currentCampaign;
    const fVales = vales.filter(v => (v.campaign || appConfig.currentCampaign) === currentC);
    const fMovements = oilMovements.filter(m => (m.campaign || appConfig.currentCampaign) === currentC);
    const fExits = oilExits.filter(e => (e.campaign || appConfig.currentCampaign) === currentC);
    const fMilling = millingLots.filter(l => (l.campaign || appConfig.currentCampaign) === currentC);
    const fProdLots = productionLots.filter(p => (p.campaign || appConfig.currentCampaign) === currentC);
    const fSales = salesOrders.filter(s => (s.campaign || appConfig.currentCampaign) === currentC);
    const fPackLots = packagingLots.filter(p => (p.campaign || appConfig.currentCampaign) === currentC);
    const fAuxEntries = auxEntries.filter(e => (e.campaign || appConfig.currentCampaign) === currentC);

    switch (activeTab) {
      case 'dashboard': return <DynamicDashboard config={appConfig} tanks={tanks} hoppers={hoppers} vales={fVales} millingLots={fMilling} auxStock={auxStock} salesOrders={fSales} producers={producers} oilMovements={fMovements} oilExits={fExits} productionLots={fProdLots} onExit={() => { }} onStartLot={() => { }} onViewTankDetails={() => { }} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProducer={(producerId) => { const p = producers.find(x => x.id === producerId); if (p) { setSelectedProducer(p); setActiveTab('producers'); } }} onViewExit={(exit) => { setTraceSearchTerm(exit.id); setActiveTab('traceability'); }} setActiveTab={setActiveTab} />;
      case 'producers': if (selectedProducer) return <ProducerDetail producer={selectedProducer} vales={vales} onBack={() => setSelectedProducer(null)} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onEdit={() => { setEditingProducer(selectedProducer); setShowProducerForm(true); }} onArchive={() => { }} onDelete={() => { }} appConfig={appConfig} />; return <ProducersList producers={producers} onSelect={setSelectedProducer} />;
      case 'customers': if (selectedCustomer) return <CustomerDetail customer={selectedCustomer} oilExits={fExits} vales={vales} salesOrders={fSales} pomaceExits={pomaceExits} onBack={() => setSelectedCustomer(null)} onEdit={() => { setEditingCustomer(selectedCustomer); setShowCustomerForm(true); }} onArchive={() => { }} onDelete={() => { }} />; return <CustomersList customers={customers} onSelect={setSelectedCustomer} />;
      case 'vales': return <ValesList vales={fVales} onEdit={(v) => { setEditingVale(v); setIsValeReadOnly(false); setShowValesForm(true); }} onView={(v) => { setTraceSearchTerm(String(v.id_vale)); setActiveTab('traceability'); }} onViewProducer={(name) => { const p = producers.find(x => x.name === name); if (p) { setSelectedProducer(p); setActiveTab('producers'); } }} onUpdateAnalitica={() => { }} />;
      case 'milling': return <MillingControl hoppers={hoppers} pendingVales={vales.filter(v => v.estado === ValeStatus.PENDIENTE)} allVales={vales} tanks={tanks} millingLots={fMilling} productionLots={fProdLots} appConfig={appConfig} initialViewProductionLotId={externalOpenProductionLotId} onProcessLot={async (data) => { const newId = `MT${data.hopperId}/${data.uso}`; if (millingLots.some(lot => lot.id === newId)) return; const activeVales = vales.filter(v => v.ubicacion_id === data.hopperId && v.uso_contador === data.uso && v.estado === ValeStatus.PENDIENTE); const totalKgAceituna = activeVales.reduce((acc, v) => acc + v.kilos_netos, 0); const totalAceiteTeorico = calculateTheoreticalOil(activeVales); const variedadLote = activeVales.length > 0 ? activeVales[0].variedad : OliveVariety.PICUAL; const newLot: MillingLot = { id: newId, almazaraId: getActiveAlmazaraId(), fecha: data.date, tolva_id: data.hopperId, uso_contador: data.uso, kilos_aceituna: totalKgAceituna, kilos_aceite_esperado: totalAceiteTeorico, kilos_aceite_real: data.realOil, deposito_id: data.targetTankId, variedad: variedadLote, vales_ids: activeVales.map(v => v.id_vale), campaign: appConfig.currentCampaign }; setMillingLots([...millingLots, newLot]); const updatedVales = vales.map(v => v.ubicacion_id === data.hopperId && v.uso_contador === data.uso ? { ...v, milling_lot_id: newLot.id } : v); setVales(updatedVales); try { await upsertMillingLot(newLot); await Promise.all(updatedVales.filter(v => v.milling_lot_id === newLot.id).map(v => upsertVale(v))); } catch (err) { console.error(err); } }} onDayClose={async (data) => { const dateObj = new Date(data.productionDate); const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); let newLPId = ''; let totalOliveKg = 0; let totalRealOilKg = 0; let allMillingLotsIds: string[] = []; let yieldFactor = 0; let oilDifference = 0; const newLots = millingLots.filter(l => data.selectedLotIds.includes(l.id)); const newLotsOliveKg = newLots.reduce((acc, l) => acc + l.kilos_aceituna, 0); if (data.mergeWithLpId) { const existingLP = productionLots.find(lp => lp.id === data.mergeWithLpId); if (!existingLP) return; newLPId = existingLP.id; allMillingLotsIds = [...existingLP.millingLotsIds, ...data.selectedLotIds]; totalOliveKg = existingLP.totalOliveKg + newLotsOliveKg; totalRealOilKg = existingLP.totalRealOilKg + data.totalRealOil; oilDifference = data.totalRealOil; } else { const baseId = `LP-${dateStr}`; let suffix = ''; let counter = 1; while (productionLots.some(lp => lp.id === baseId + suffix)) { suffix = `-${String.fromCharCode(65 + counter)}`; counter++; } newLPId = baseId + suffix; allMillingLotsIds = data.selectedLotIds; totalOliveKg = newLotsOliveKg; totalRealOilKg = data.totalRealOil; oilDifference = data.totalRealOil; } yieldFactor = totalOliveKg > 0 ? totalRealOilKg / totalOliveKg : 0; const updatedMillingLotsState = millingLots.map(lot => allMillingLotsIds.includes(lot.id) ? { ...lot, kilos_aceite_real: lot.kilos_aceituna * yieldFactor, deposito_id: data.targetTankId } : lot); setMillingLots(updatedMillingLotsState); const updatedVales = vales.map(v => v.milling_lot_id && allMillingLotsIds.includes(v.milling_lot_id) ? { ...v, estado: ValeStatus.MOLTURADO } : v); setVales(updatedVales); const newProductionLot: ProductionLot = { id: newLPId, almazaraId: getActiveAlmazaraId(), fecha: data.productionDate, millingLotsIds: allMillingLotsIds, totalOliveKg, totalRealOilKg, targetTankId: data.targetTankId, notes: data.notes, campaign: appConfig.currentCampaign }; if (data.mergeWithLpId) setProductionLots(prev => prev.map(lp => lp.id === data.mergeWithLpId ? newProductionLot : lp)); else setProductionLots(prev => [...prev, newProductionLot]); const updatedTanks = tanks.map(t => { if (t.id === data.targetTankId) { const newKg = t.currentKg + oilDifference; return { ...t, currentKg: newKg, variety_id: t.currentKg === 0 && newLots.length > 0 ? String(newLots[0].variedad) : t.variety_id, status: newKg >= t.maxCapacityKg ? 'FULL' : t.status, currentBatchId: newLPId }; } return t; }); setTanks(updatedTanks); const adjustmentMovement: OilMovement = { id: `PROD-${newLPId}-${Date.now()}`, almazaraId: getActiveAlmazaraId(), date: new Date().toISOString(), source_tank_id: data.targetTankId, target_tank_id: data.targetTankId, kg: oilDifference, variety: data.mergeWithLpId ? 'Ajuste Fusión Tanda' : 'Entrada Molturación (Tanda)', operator: OWNER_NAME, batch_id: newLPId, campaign: appConfig.currentCampaign }; setOilMovements(prev => [...prev, adjustmentMovement]); try { await upsertProductionLot(newProductionLot); await Promise.all(updatedMillingLotsState.filter(l => allMillingLotsIds.includes(l.id)).map(l => upsertMillingLot(l))); await Promise.all(updatedVales.filter(v => v.milling_lot_id && allMillingLotsIds.includes(v.milling_lot_id)).map(v => upsertVale(v))); await upsertOilMovement(adjustmentMovement); const tank = updatedTanks.find(t => t.id === data.targetTankId); if (tank) await upsertTank(tank); } catch (err) { console.error(err); } }} />;
      case 'sales': return <SalesDashboard finishedProducts={finishedProducts} customers={customers} salesOrders={salesOrders} pomaceExits={pomaceExits} oilExits={oilExits} tanks={tanks} currentCampaign={appConfig.currentCampaign} appConfig={appConfig} onProcessSale={handleProcessSale} onProcessPomaceExit={handleProcessPomaceExit} onProcessBulkExit={handleProcessBulkExit} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} />;
      case 'cellar': return <CellarDashboard tanks={tanks} millingLots={millingLots} vales={vales} producers={producers} oilMovements={oilMovements} oilExits={oilExits} productionLots={productionLots} config={appConfig} initialSelectedTankId={externalOpenTankId} onTransfer={async (data) => { const sourceTank = tanks.find(t => t.id === data.sourceTankId); const updatedTanks = tanks.map(t => { if (t.id === data.sourceTankId) return { ...t, currentKg: t.currentKg - data.kg }; if (t.id === data.targetTankId) { const newKg = t.currentKg + data.kg; return { ...t, currentKg: newKg, variety_id: sourceTank?.variety_id, status: newKg >= t.maxCapacityKg ? 'FULL' : t.status }; } return t; }); setTanks(updatedTanks); const newMovement: OilMovement = { id: `MOV-${Date.now()}`, almazaraId: getActiveAlmazaraId(), date: data.date, source_tank_id: data.sourceTankId, target_tank_id: data.targetTankId, kg: data.kg, variety: 'Trasiego', operator: currentUser?.fullName || OWNER_NAME, campaign: appConfig.currentCampaign }; setOilMovements([...oilMovements, newMovement]); try { await upsertOilMovement(newMovement); const sT = updatedTanks.find(t => t.id === data.sourceTankId); const tT = updatedTanks.find(t => t.id === data.targetTankId); if (sT) await upsertTank(sT); if (tT) await upsertTank(tT); } catch (err) { console.error(err); } }} onResetTank={(tankId) => { setTanks(prev => prev.map(t => t.id === tankId ? { ...t, cycleCount: (t.cycleCount || 1) + 1, currentKg: 0, variety_id: undefined, status: 'FILLING' } : t)); }} onCloseTankLot={async (tankId) => { const tank = tanks.find(t => t.id === tankId); if (!tank) return; const closureMovement: OilMovement = { id: `CLOSURE-${tankId}-${Date.now()}`, almazaraId: getActiveAlmazaraId(), date: new Date().toISOString(), source_tank_id: tankId, target_tank_id: tankId, kg: tank.currentKg, variety: tank.variety_id || 'Mezcla', operator: currentUser?.fullName || OWNER_NAME, campaign: appConfig.currentCampaign }; setOilMovements([...oilMovements, closureMovement]); const updatedTanks = tanks.map(t => t.id === tankId ? { ...t, status: 'FULL' } : t); setTanks(updatedTanks); try { await upsertOilMovement(closureMovement); const tT = updatedTanks.find(t => t.id === tankId); if (tT) await upsertTank(tT); } catch (err) { console.error(err); } }} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProducer={(producerId) => { const p = producers.find(x => x.id === producerId); if (p) { setSelectedProducer(p); setActiveTab('producers'); } }} onViewExit={(exit) => { setTraceSearchTerm(exit.id); setActiveTab('traceability'); }} />;
      case 'packaging': return <PackagingDashboard tanks={tanks} nurseTank={nurseTank} packagingLots={fPackLots} finishedProducts={finishedProducts} packagingFormats={appConfig.packagingFormats} availableAuxLots={auxEntries.map(e => ({ ...e, remaining: e.quantity, category: appConfig.auxiliaryProducts.find(p => p.name === e.materialType)?.category || 'Otro' }))} oilMovements={fMovements} onFillNurseTank={async (kg, sourceId, date) => { const sourceTank = tanks.find(t => t.id === sourceId); const batchId = `${sourceId}/${oilMovements.filter(m => m.source_tank_id === sourceId && m.target_tank_id === 999).length + 1}/${new Date(date).getFullYear()}`; const updatedNurseTank = { ...nurseTank, currentKg: nurseTank.currentKg + kg, lastEntryDate: date, lastSourceTankId: sourceId, currentBatchId: batchId, currentVariety: sourceTank?.variety_id || 'Mezcla' }; setNurseTank(updatedNurseTank); const updatedTanks = tanks.map(t => t.id === sourceId ? { ...t, currentKg: t.currentKg - kg } : t); setTanks(updatedTanks); const newMovement: OilMovement = { id: `MOV-NURSE-${Date.now()}`, almazaraId: getActiveAlmazaraId(), date, source_tank_id: sourceId, target_tank_id: 999, kg, variety: sourceTank?.variety_id || 'Mezcla', operator: currentUser?.fullName || OWNER_NAME, batch_id: batchId, campaign: appConfig.currentCampaign }; setOilMovements(prev => [...prev, newMovement]); try { await upsertOilMovement(newMovement); const tank = updatedTanks.find(t => t.id === sourceId); if (tank) await upsertTank(tank); } catch (err) { console.error(err); } }} onPackagingRun={async (lot) => { const lotToSave: PackagingLot = { ...lot, almazaraId: getActiveAlmazaraId(), campaign: appConfig.currentCampaign }; setPackagingLots([...packagingLots, lotToSave]); let updatedTanksState = tanks; if (lot.sourceTankId) { const tank = tanks.find(t => t.id === lot.sourceTankId); updatedTanksState = tanks.map(t => t.id === lot.sourceTankId ? { ...t, currentKg: t.currentKg - lot.kgUsed } : t); setTanks(updatedTanksState); const newMovement: OilMovement = { id: `MOV-PACK-SF-${Date.now()}`, almazaraId: getActiveAlmazaraId(), date: lot.date, source_tank_id: lot.sourceTankId, target_tank_id: 998, kg: lot.kgUsed, variety: tank?.variety_id || 'Mezcla', operator: currentUser?.fullName || OWNER_NAME, batch_id: lot.id, campaign: appConfig.currentCampaign }; setOilMovements(prev => [...prev, newMovement]); try { await upsertOilMovement(newMovement); const tankToUp = updatedTanksState.find(t => t.id === lot.sourceTankId); if (tankToUp) await upsertTank(tankToUp); } catch (err) { console.error(err); } } else { setNurseTank(prev => ({ ...prev, currentKg: prev.currentKg - lot.kgUsed })); } const existing = finishedProducts.find(p => p.lotId === lot.id); if (existing) setFinishedProducts(prev => prev.map(p => p.lotId === lot.id ? { ...p, unitsAvailable: p.unitsAvailable + lot.units } : p)); else setFinishedProducts(prev => [...prev, { id: `FP-${lot.id}`, almazaraId: getActiveAlmazaraId(), lotId: lot.id, format: lot.format, type: lot.type, unitsAvailable: lot.units }]); try { await upsertPackagingLot(lotToSave); } catch (err) { console.error(err); } }} onViewBatch={(batchId) => { setTraceSearchTerm(batchId); setActiveTab('traceability'); }} />;
      case 'auxiliary': return <AuxiliaryWarehouse entries={fAuxEntries} stockData={auxStock} availableProducts={appConfig.auxiliaryProducts || []} onAddEntry={async (entry) => { const entryToSave: AuxEntry = { ...entry, almazaraId: getActiveAlmazaraId(), campaign: appConfig.currentCampaign }; setAuxEntries([...auxEntries, entryToSave]); try { await upsertAuxEntry(entryToSave); } catch (err) { console.error(err); } }} />;
      case 'direct_sales': return <DirectSalesDashboard vales={fVales} customers={customers} producers={producers} onViewVale={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProducer={setSelectedProducer} onViewCustomer={setSelectedCustomer} />;
      case 'traceability': return <TraceabilityDashboard initialSearch={traceSearchTerm} packagingLots={fPackLots} millingLots={fMilling} vales={fVales} producers={producers} salesOrders={fSales} customers={customers} tanks={tanks} appConfig={appConfig} oilMovements={fMovements} oilExits={fExits} productionLots={fProdLots} onViewValeDetails={(v) => { setEditingVale(v); setIsValeReadOnly(true); setShowValesForm(true); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onNavigateToTank={(tankId) => { setExternalOpenTankId(tankId); setActiveTab('cellar'); }} />;
      case 'config': return <SettingsDashboard config={appConfig} currentUser={currentUser} onUpdateConfig={handleUpdateConfig} vales={fVales} salesOrders={fSales} oilExits={fExits} producers={producers} customers={customers} tanks={tanks} hoppers={hoppers} millingLots={fMilling} productionLots={fProdLots} oilMovements={fMovements} nurseTank={nurseTank} onUpdateInfrastructure={(nt, nh, ut, nc) => {
        // 1. Sincronización de Tanques
        if (ut) {
          // Detectar eliminados
          const newIds = new Set(ut.map(t => t.id));
          tanks.forEach(t => {
            if (!newIds.has(t.id)) deleteTank(t.id).catch(console.error);
          });
          // Upsert de los actuales
          ut.forEach(t => upsertTank(t).catch(console.error));
          setTanks(ut);
        }

        // 2. Sincronización de Nodriza
        if (nc !== undefined) {
          setNurseTank(prev => {
            const newNt = { ...prev, maxCapacityKg: nc };
            upsertNurseTank(newNt).catch(console.error);
            return newNt;
          });
        }

        // 3. Sincronización de Tolvas
        setHoppers(prev => {
          let newHoppers = [...prev];
          if (nh < prev.length) {
            // Borrar sobrantes
            const toDelete = prev.slice(nh);
            toDelete.forEach(h => deleteHopper(h.id).catch(console.error));
            newHoppers = prev.slice(0, nh);
          } else if (nh > prev.length) {
            // Añadir nuevas
            const added = Array.from({ length: nh - prev.length }, (_, i) => ({
              id: prev.length + i + 1,
              almazaraId: getActiveAlmazaraId(),
              name: `Tolva ${prev.length + i + 1}`,
              isActive: false,
              currentUse: 1
            }));
            // Guardar nuevas en Supabase
            added.forEach(h => upsertHopper(h).catch(console.error)); // Necesitaríamos upsertHopper en supabaseSync
            newHoppers = [...prev, ...added];
          }
          // Sincronizar estado (aunque tolvas solo tienen active/inactive que se maneja en otro lado,
          // aquí solo manejamos cantidad. Pero al crear nuevas hay que guardarlas).
          return newHoppers;
        });
      }} onArchiveCampaign={handleCloseCampaign} onStartCampaign={handleStartCampaign} pastCampaigns={appConfig.pastCampaigns} />;
      default: return null;
    }
  };

  // --- LÓGICA DE ID VISIBLE (SOLUCIÓN DEFINITIVA) ---
  const MobileIDBadge = () => {
    if (!currentUser?.almazaraId) return null;
    return (
      <div className="fixed bottom-2 right-2 bg-[#D9FF66] text-black text-[10px] px-3 py-1.5 rounded-full font-black font-mono z-[99999] border-2 border-black shadow-2xl pointer-events-none">
        ID: {currentUser.almazaraId.substring(0, 6)}
      </div>
    );
  };

  if (isAuthChecking) return <div className="min-h-screen bg-[#F4F7F4] flex items-center justify-center font-bold text-gray-400">Cargando sistema...</div>;

  if (!isLoggedIn) {
    return <AuthScreen onLogin={handleLogin} authorizedUsers={appConfig.authorizedUsers} almazaraId={appConfig.almazaraId} />;
  }

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setSelectedProducer(null); setSelectedCustomer(null); setTraceSearchTerm(''); setExternalOpenProductionLotId(null); setExternalOpenTankId(null); }}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <main className={`flex-1 ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-16 md:ml-20 lg:ml-64'} p-4 md:p-6 lg:p-10 transition-all duration-300 w-full max-w-[100vw] overflow-x-hidden`}>
        {!showValesForm && !showProducerForm && !showCustomerForm ? (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-black text-[#D9FF66] text-[10px] font-black uppercase tracking-widest">{String(appConfig.companyName)}</span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#D9FF66] text-black text-[10px] font-black uppercase tracking-widest border border-black/10">
                    <CalendarRange size={10} /> Campaña: {String(appConfig.currentCampaign)}
                  </span>

                  {/* Indicador de Sincronización Offline */}
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${isOnline ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {isOnline ? 'Online' : 'Trabajando Offline'}
                  </div>

                  {pendingCount > 0 && (
                    <div
                      className="flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse relative group cursor-help"
                      title={syncQueue.get().map(op => `${op.type}: ${op.payload.name || op.payload.id}`).join('\n')}
                    >
                      <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                      {pendingCount} Pendientes

                      {/* Tooltip con nombres */}
                      <div className="absolute top-full mt-2 left-0 bg-black text-white p-2 rounded shadow-xl text-[9px] lowercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-white/10">
                        {syncQueue.get().slice(0, 5).map(op => (
                          <div key={op.id}>• {op.type.replace('upsert', '')}: {op.payload.name || op.payload.id?.substring(0, 5)}</div>
                        ))}
                        {pendingCount > 5 && <div>y {pendingCount - 5} más...</div>}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("¿Seguro que quieres limpiar la cola de espera? Se perderán las cosas que no se hayan subido.")) {
                            syncQueue.clear();
                            window.location.reload();
                          }
                        }}
                        className="ml-2 hover:bg-white/20 p-0.5 rounded pointer-events-auto"
                        title="Limpiar cola"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => refreshAllData()}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white hover:bg-gray-100 text-black text-[10px] font-black uppercase tracking-widest border border-black/10 transition-all shadow-sm active:scale-95"
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
                    {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
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

              <MobileIDBadge />
            </header>
            {renderContent()}
          </>
        ) : (
          <div className="animate-in slide-in-from-top-4 duration-500">
            {showValesForm && <ValesForm producers={producers} hoppers={hoppers} vales={vales} lastValeId={vales.length} customers={customers} millingLots={millingLots} productionLots={productionLots} tanks={tanks} packagingLots={packagingLots} oilExits={oilExits} oilMovements={oilMovements} onSave={handleValeSave} onCancel={() => setShowValesForm(false)} editVale={editingVale} readOnly={isValeReadOnly} onViewLot={(lotId) => { setTraceSearchTerm(lotId); setActiveTab('traceability'); }} onViewProductionLot={(lpId) => { setExternalOpenProductionLotId(lpId); setActiveTab('milling'); }} onViewTank={(tankId) => { const t = tanks.find(x => x.id === tankId); if (t) { setActiveTab('cellar'); setTimeout(() => setSelectedProducer(null), 100); } }} />}
            {showProducerForm && <ProducerForm onSave={handleProducerSave} onCancel={() => setShowProducerForm(false)} initialData={editingProducer} />}
            {showCustomerForm && <CustomerForm onSave={handleCustomerSave} onCancel={() => setShowCustomerForm(false)} initialData={editingCustomer} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
