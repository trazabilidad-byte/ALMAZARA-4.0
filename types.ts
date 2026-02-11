
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
}

export enum ValeType {
  MOLTURACION = 'Para Molturar',
  VENTA_DIRECTA = 'Venta Directa'
}

export enum OliveVariety {
  PICUAL = 'Picual',
  FRANTOIO = 'Frantoio',
  ARBEQUINA = 'Arbequina',
  HOJIBLANCA = 'Hojiblanca',
  CONTINENTAL = 'Continental',
  ARBOSANA = 'Arbosana'
}

export enum ValeStatus {
  PENDIENTE = 'PENDIENTE',
  MOLTURADO = 'MOLTURADO',
  VENDIDO_DIRECTO = 'VENDIDO_DIRECTO'
}

export enum ExitType {
  ENVASADORA = 'Envasadora Propia',
  CISTERNA = 'Venta Cliente Externo (Cisterna)'
}

export enum ProducerStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum CustomerType {
  MAYORISTA = 'Mayorista / Cisternas',
  MINORISTA = 'Minorista / Envasado',
  COMPRADOR_ACEITUNA = 'Comprador de Aceituna',
  COMPRADOR_ORUJO = 'Gestor de Residuos / Orujera'
}

export enum CustomerStatus {
  ACTIVE = 'Activo',
  ARCHIVED = 'Archivado'
}

// --- NEGOCIO Y CONTRATOS ---

export enum ContractMode {
  SAAS = 'SAAS',
  ON_PREMISE = 'ON_PREMISE'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED', // IMPAGO -> SOLO LECTURA
  CANCELLED = 'CANCELLED'
}

// --- AUTH & USER TYPES ---

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  almazaraId: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

// INTERFAZ DE TENANT (ALMAZARA)
export interface Almazara {
  id: string; // UUID
  name: string;
  cif: string;
  slug: string;
  setupCompleted: boolean;

  // Gestión Contractual
  contractMode: ContractMode;
  subscriptionStatus: SubscriptionStatus;

  // SaaS Specifics
  planPriceMonthly?: number;
  nextPaymentDate?: string;
  storageUsedMb: number;
  storageLimitMb: number;

  // On-Premise Specifics
  licenseKey?: string;
  allowedDomain?: string;
}

export interface Customer {
  id: string;
  almazaraId: string; // Multi-tenant FK
  name: string;
  cif: string;
  address: string;
  phone?: string;
  email?: string;
  province?: string;
  zipCode?: string;
  type: CustomerType;
  status: CustomerStatus;
}

export interface OilExit {
  id: string;
  almazaraId: string; // Multi-tenant FK
  tank_id: number;
  type: ExitType;
  date: string;
  kg: number;
  kg_after_exit: number;
  vale_number?: string;
  customer_id?: string;
  driver_name?: string;
  license_plate?: string;
  seals?: string;
  campaign?: string; // Nuevo para histórico
  deliveryNote?: string; // Nº Albarán (Ej: 004/25/26)
}

export interface OilMovement {
  id: string;
  almazaraId: string; // Multi-tenant FK
  date: string;
  source_tank_id: number;
  target_tank_id: number; // Si es cierre, puede ser null o el mismo ID
  kg: number;
  variety: OliveVariety | string;
  operator: string;
  campaign?: string; // Nuevo para histórico
  batch_id?: string; // Nuevo: ID del lote generado (ej: "1/2/2025" para entrada a nodriza)
  // Nuevo: Detalles de cierre de lote (Hito)
  closureDetails?: {
    startDate: string;
    endDate: string;
    valesIds: number[];
    millingLots: string[];
    totalKgConsolidated: number;
  };
}

export interface Producer {
  id: string;
  almazaraId: string; // Multi-tenant FK
  name: string;
  nif: string;
  municipality: string;
  province?: string;
  zipCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: ProducerStatus;
  totalKgDelivered?: number; // Sincronizado con Supabase
}

export interface Tank {
  id: number;
  almazaraId: string; // Multi-tenant FK
  name: string;
  maxCapacityKg: number;
  currentKg: number;
  variety_id?: string;
  currentBatchId?: string;
  cycleCount?: number; // Nuevo: Contador de ciclos de llenado (1, 2, 3...)
  status: 'FILLING' | 'FULL'; // Nuevo: Estado de gestión
}

export interface Hopper {
  id: number;
  almazaraId: string; // Multi-tenant FK
  name: string;
  isActive: boolean;
  currentUse: number;
  currentVariety?: OliveVariety;
}

export interface MillingLot {
  id: string; // MT01/01
  almazaraId: string; // Multi-tenant FK
  fecha: string;
  tolva_id: number;
  uso_contador: number;
  kilos_aceituna: number;
  kilos_aceite_esperado: number;
  kilos_aceite_real: number;
  deposito_id: number;
  variedad: OliveVariety;
  vales_ids: number[];
  campaign?: string; // Nuevo para histórico
  status?: string;
}

// NUEVO: LOTE DE PRODUCCIÓN (TANDA DIARIA)
export interface ProductionLot {
  id: string; // LP-DD/MM/YY
  almazaraId: string;
  fecha: string;
  millingLotsIds: string[]; // IDs de los MT que lo componen
  totalOliveKg: number;
  totalRealOilKg: number;
  targetTankId: number;
  notes?: string;
  campaign?: string;
}

export interface Vale {
  id: string; // UUID para sincronización con Supabase
  id_vale: number; // Secuencial por Almazara
  almazaraId: string; // Multi-tenant FK
  tipo_vale: ValeType;
  productor_id: string;
  productor_name: string;
  parcela: string;
  comprador?: string; // ID del cliente si es venta directa
  fecha_entrada: string;
  kilos_brutos: number;
  impurezas_kg: number;
  kilos_netos: number;
  variedad: OliveVariety;
  ubicacion_id: number;
  uso_contador: number;
  estado: ValeStatus;
  milling_lot_id?: string;
  analitica: {
    rendimiento_graso: number;
    acidez: number;
  };
  campaign?: string; // Nuevo para histórico
}

// --- TIPOS NUEVOS PARA ENVASADORA ---

export interface NurseTank {
  almazaraId: string;
  maxCapacityKg: number;
  currentKg: number;
  lastEntryDate: string | null;
  lastSourceTankId: number | null;
  lastEntryId: number;
  // Campos nuevos para trazabilidad Lote Entrada (LE)
  currentBatchId?: string; // El lote activo "1/2/2026"
  currentVariety?: string;
  currentQuality?: string;
}

export interface PackagingLot {
  id: string;
  almazaraId: string;
  date: string;
  type: 'Filtrado' | 'Sin Filtrar';
  format: '1L' | '2L' | '5L';
  units: number;
  litersUsed: number;
  kgUsed: number;
  bottleBatch: string;
  capBatch: string;
  labelBatch: string;
  sourceInfo: string;
  sourceTankId?: number; // Para trazabilidad directa bodega -> envasado
  campaign?: string; // Nuevo para histórico
}

export interface FinishedProduct {
  id: string;
  almazaraId: string;
  lotId: string;
  format: '1L' | '2L' | '5L';
  type: 'Filtrado' | 'Sin Filtrar';
  unitsAvailable: number;
}

// --- TIPOS NUEVOS PARA ALMACÉN AUXILIARES ---

// Tipos base para categorización (se usan en lógica interna)
export enum AuxMaterialType {
  BOTELLA_1L = 'Botella Vidrio 1L',
  BOTELLA_2L = 'Botella PET 2L',
  BOTELLA_5L = 'Garrafa PET 5L',
  TAPON = 'Tapón Estándar',
  ETIQUETA = 'Etiqueta Adhesiva',
  PRECINTO = 'Precinto AICA',
  CAJA_1L = 'Caja Cartón 1L (15u)',
  CAJA_2L = 'Caja Cartón 2L (6u)',
  CAJA_5L = 'Caja Cartón 5L (3u)'
}

export interface AuxEntry {
  id: string;
  almazaraId: string;
  date: string;
  supplier: string;
  materialType: string; // Ahora es string dinámico basado en configuración
  quantity: number;
  manufacturerBatch: string;
  pricePerUnit: number;
  campaign?: string; // Nuevo para histórico
}

export interface AuxStock {
  type: string; // Nombre del producto (ej: "Botella Dorica")
  category: 'Envase' | 'Tapón' | 'Etiqueta' | 'Caja' | 'Otro';
  almazaraId: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
}

// --- TIPOS PARA VENTAS ---

export interface SalesOrder {
  id: string;
  almazaraId: string;
  date: string;
  customerId: string;
  products: {
    finishedProductId: string;
    lotId: string;
    format: string;
    units: number;
    pricePerUnit: number;
  }[];
  totalAmount: number;
  status: 'Completed' | 'Pending';
  campaign?: string; // Nuevo para histórico
}

export interface PomaceExit {
  id: string;
  almazaraId: string;
  date: string;
  customerId: string;
  kg: number;
  valeNumber: string;
  notes: string;
  campaign?: string; // Nuevo para histórico
}

// --- TIPOS NUEVOS PARA CONFIGURACIÓN GLOBAL ---

export interface PackagingFormatDefinition {
  id: string;
  name: string;
  capacityLiters: number;
  enabled: boolean;
}

export interface AuxProductDefinition {
  id: string;
  name: string; // ej: "Botella 500ml Dorica"
  category: 'Envase' | 'Tapón' | 'Etiqueta' | 'Caja' | 'Otro';
}

export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface SidebarItemConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Opcional para usuarios de Supabase, obligatorio para locales
}

// Nuevo tipo para configuración de variedad
export type VarietySettings = Record<string, { defaultYield: number }>;

export interface AppConfig {
  // Configuración específica de la Almazara (Guardada en DB por tenant)
  almazaraId: string; // ID del tenant
  companyName: string;
  cif: string;
  address: string;
  city: string; // Nuevo
  province: string; // Nuevo
  zipCode: string; // Nuevo
  phone: string;
  logoBase64?: string;
  currentCampaign: string;
  pastCampaigns: string[]; // Lista de campañas archivadas
  oilDensity: number;
  lowStockThreshold: number;
  tankHighThreshold: number;
  varietySettings: VarietySettings; // Nuevo: Configuración de rendimientos por variedad
  authorizedEmails: string[]; // Legacy, maintained for compatibility
  authorizedUsers: AuthorizedUser[]; // Nuevo panel gestión
  packagingFormats: PackagingFormatDefinition[];
  auxiliaryProducts: AuxProductDefinition[]; // Nuevo catálogo dinámico
  dashboardWidgets: DashboardWidgetConfig[];
  sidebarConfig: SidebarItemConfig[];
}
