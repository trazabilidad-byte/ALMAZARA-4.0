
import React, { useState, useRef, useEffect } from 'react';
import { AppConfig, PackagingFormatDefinition, Vale, Producer, MillingLot, Tank, Customer, Hopper, NurseTank, AuxProductDefinition, AuthorizedUser, UserRole, SalesOrder, OilExit, ExitType, OliveVariety } from '../types';
import { Save, Layout, Beaker, Upload, Settings, Trash2, Plus, Database, Menu, LayoutDashboard, Eye, EyeOff, Scale, Package, Layers, Users, Shield, Archive, AlertOctagon, History, Download, X, Check, ArrowRight, FileSpreadsheet, Lock, Percent, MapPin, Phone, Mail, ChevronDown } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

interface SettingsDashboardProps {
  config: AppConfig;
  currentUser?: { role: UserRole } | null;
  onUpdateConfig: (newConfig: AppConfig) => void;
  vales: Vale[];
  salesOrders?: SalesOrder[];
  oilExits?: OilExit[];
  producers: Producer[];
  millingLots: MillingLot[];
  tanks: Tank[];
  hoppers: Hopper[];
  nurseTank: NurseTank;
  customers: Customer[];
  onUpdateInfrastructure?: (numTanks: number, numHoppers: number, tanksData?: Tank[], nurseCapacity?: number) => void;
  onArchiveCampaign?: (nextCampaign: string, transferOil: boolean, transferAux: boolean) => void;
  onViewHistory?: (campaignId: string | null) => void;
  selectedHistoryCampaign?: string | null;
  onDownloadBackup?: () => void;
}

const WIDGET_NAMES: Record<string, string> = {
    'kpi_summary': 'Resumen KPIs Globales',
    'bodega_main': 'Monitor de Bodega (Depósitos)',
    'milling_active': 'Tolvas de Molturación Activas',
    'stock_alerts': 'Alertas Stock Auxiliares',
    'producers_today': 'Entradas de Productores (Hoy)',
    'direct_sales_recent': 'Últimas Ventas Directas'
};

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({ 
  config, 
  currentUser,
  onUpdateConfig,
  vales,
  salesOrders = [],
  oilExits = [],
  tanks,
  hoppers,
  nurseTank,
  onUpdateInfrastructure,
  onArchiveCampaign,
  onViewHistory,
  selectedHistoryCampaign,
  onDownloadBackup
}) => {
  const [formConfig, setFormConfig] = useState<AppConfig>(config);
  const [activeSection, setActiveSection] = useState<'general' | 'visual' | 'infra' | 'technical' | 'formats' | 'users' | 'data'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFormat, setNewFormat] = useState({ name: '', liters: '' });
  const [newAuxProduct, setNewAuxProduct] = useState({ name: '', category: 'Envase' as AuxProductDefinition['category'] });
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.OPERATOR });
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveForm, setArchiveForm] = useState({
      nextCampaign: '',
      confirmText: '',
      transferOil: false,
      transferAux: true
  });
  const [numTanks, setNumTanks] = useState(tanks.length);
  const [numHoppers, setNumHoppers] = useState(hoppers.length);
  const [localTanks, setLocalTanks] = useState<Tank[]>(tanks);
  const [localNurseCapacity, setLocalNurseCapacity] = useState(nurseTank.maxCapacityKg);

  // Estados para el dropdown personalizado de roles
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormConfig(config);
  }, [config]);

  useEffect(() => {
      setLocalTanks(prev => {
          if (numTanks > prev.length) {
              const added: Tank[] = Array.from({ length: numTanks - prev.length }, (_, i) => ({
                  id: prev.length + i + 1,
                  almazaraId: 'single',
                  name: `D.${(prev.length + i + 1).toString().padStart(2, '0')}`,
                  maxCapacityKg: 50000,
                  currentKg: 0,
                  variety_id: undefined,
                  status: 'FILLING' // Default status for new tanks
              }));
              return [...prev, ...added];
          } else if (numTanks < prev.length) {
              return prev.slice(0, numTanks);
          }
          return prev;
      });
  }, [numTanks]);

  // Click outside para el dropdown de roles
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
            setIsRoleOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateTankCapacity = (id: number, val: string) => {
      const cap = parseFloat(val);
      if (isNaN(cap)) return;
      setLocalTanks(prev => prev.map(t => t.id === id ? { ...t, maxCapacityKg: cap } : t));
  };

  const handleSaveForm = () => {
    onUpdateConfig(formConfig);
    if (activeSection === 'infra' && onUpdateInfrastructure) {
        onUpdateInfrastructure(numTanks, numHoppers, localTanks, localNurseCapacity);
    }
    alert('Configuración guardada correctamente.');
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormConfig({ ...formConfig, logoBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleWidget = (id: string) => {
      const newWidgets = formConfig.dashboardWidgets.map(w => 
          w.id === id ? { ...w, visible: !w.visible } : w
      );
      setFormConfig({ ...formConfig, dashboardWidgets: newWidgets });
  };

  const toggleSidebarItem = (id: string) => {
      if (id === 'config') return;
      const newSidebar = formConfig.sidebarConfig.map(i => 
          i.id === id ? { ...i, visible: !i.visible } : i
      );
      setFormConfig({ ...formConfig, sidebarConfig: newSidebar });
  };

  const handleAddFormat = () => {
     if (!newFormat.name || !newFormat.liters) return;
     const newDef: PackagingFormatDefinition = {
        id: `fmt-${Date.now()}`,
        name: newFormat.name,
        capacityLiters: parseFloat(newFormat.liters),
        enabled: true
     };
     setFormConfig({
        ...formConfig,
        packagingFormats: [...formConfig.packagingFormats, newDef]
     });
     setNewFormat({ name: '', liters: '' });
  };

  const handleRemoveFormat = (id: string) => {
     setFormConfig({
        ...formConfig,
        packagingFormats: formConfig.packagingFormats.filter(f => f.id !== id)
     });
  };

  const handleAddAuxProduct = () => {
      if (!newAuxProduct.name) return;
      const newProd: AuxProductDefinition = {
          id: `aux-${Date.now()}`,
          name: newAuxProduct.name,
          category: newAuxProduct.category
      };
      setFormConfig({
          ...formConfig,
          auxiliaryProducts: [...(formConfig.auxiliaryProducts || []), newProd]
      });
      setNewAuxProduct({ name: '', category: 'Envase' });
  };

  const handleRemoveAuxProduct = (id: string) => {
      setFormConfig({
          ...formConfig,
          auxiliaryProducts: formConfig.auxiliaryProducts.filter(p => p.id !== id)
      });
  };

  const handleAddUser = () => {
      if (!newUser.name || !newUser.email) return;
      const newAuthorizedUser: AuthorizedUser = {
          id: `user-${Date.now()}`,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
      };
      const updatedConfig = {
          ...formConfig,
          authorizedUsers: [...(formConfig.authorizedUsers || []), newAuthorizedUser]
      };
      setFormConfig(updatedConfig);
      setNewUser({ name: '', email: '', role: UserRole.OPERATOR });
  };

  const handleRemoveUser = (id: string) => {
      const updatedConfig = {
          ...formConfig,
          authorizedUsers: formConfig.authorizedUsers.filter(u => u.id !== id)
      };
      setFormConfig(updatedConfig);
  };

  const handleArchiveSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (archiveForm.confirmText !== 'ARCHIVAR') return alert('Por favor, escribe "ARCHIVAR" para confirmar.');
      if (!archiveForm.nextCampaign) return alert('Debes especificar el nombre de la nueva campaña.');
      
      if (onArchiveCampaign) {
          onArchiveCampaign(archiveForm.nextCampaign, archiveForm.transferOil, archiveForm.transferAux);
          setShowArchiveModal(false);
          setArchiveForm({ nextCampaign: '', confirmText: '', transferOil: false, transferAux: true });
          alert(`Campaña cerrada correctamente. Iniciando: ${archiveForm.nextCampaign}`);
      }
  };

  const handleExportMasterCSV = () => {
      if (currentUser?.role !== UserRole.ADMIN) return alert("Acceso denegado. Se requieren permisos de Administrador.");

      const rows = [];
      const headers = [
          "ID_Transaccion", "Fecha (YYYY-MM-DD)", "Campana", "Tipo_Movimiento", "Entidad_Nombre", "Concepto_Variedad", "Kilos_Entrada_Neta", "Rendimiento_Graso", "Aceite_Teorico_Kg", "Kilos_Salida_Aceite", "Importe_Total_Eur"
      ];
      rows.push(headers.join(","));

      const targetCampaign = exportScope === 'current' ? config.currentCampaign : 'all';
      const filterByCampaign = (item: any) => targetCampaign === 'all' || (item.campaign || config.currentCampaign) === targetCampaign;

      vales.filter(filterByCampaign).forEach(v => {
          const dateStr = new Date(v.fecha_entrada).toISOString().split('T')[0];
          const oilKg = (v.kilos_netos * (v.analitica.rendimiento_graso || 0) / 100).toFixed(2);
          rows.push([
              `VAL-${v.id_vale}`, dateStr, v.campaign || config.currentCampaign, v.tipo_vale === 'Venta Directa' ? 'VENTA_DIRECTA_ACEITUNA' : 'ENTRADA_MOLTURACION', `"${v.productor_name}"`, v.variedad, v.kilos_netos, v.analitica.rendimiento_graso || 0, oilKg, 0, 0
          ].join(","));
      });

      salesOrders.filter(filterByCampaign).forEach(s => {
          const dateStr = new Date(s.date).toISOString().split('T')[0];
          s.products.forEach((p, idx) => {
              const volumeL = parseInt(p.format.replace('L', '')) || 0;
              const weightKg = (volumeL * p.units * 0.916).toFixed(2);
              rows.push([
                  `VTA-${s.id}-${idx}`, dateStr, s.campaign || config.currentCampaign, 'VENTA_ENVASADO', `"${s.customerId}"`, `${p.format} - ${p.lotId}`, 0, 0, 0, weightKg, (p.pricePerUnit * p.units).toFixed(2)
              ].join(","));
          });
      });

      oilExits.filter(e => e.type === ExitType.CISTERNA && filterByCampaign(e)).forEach(e => {
          const dateStr = new Date(e.date).toISOString().split('T')[0];
          rows.push([
              `SAL-${e.id}`, dateStr, e.campaign || config.currentCampaign, 'VENTA_GRANEL', `"${e.customer_id}"`, 'Aceite a Granel', 0, 0, 0, e.kg, 0
          ].join(","));
      });

      const csvContent = rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `master_data_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleYieldUpdate = (variety: string, value: number) => {
      setFormConfig(prev => ({
          ...prev,
          varietySettings: {
              ...prev.varietySettings,
              [variety]: { defaultYield: value }
          }
      }));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 pb-20 relative">
      <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
         {[
           { id: 'general', label: 'Datos Empresa', icon: Layout },
           { id: 'users', label: 'Equipo y Accesos', icon: Users },
           { id: 'visual', label: 'Personalización Visual', icon: LayoutDashboard },
           { id: 'infra', label: 'Infraestructura', icon: Database },
           { id: 'technical', label: 'Parámetros Técnicos', icon: Beaker },
           { id: 'data', label: 'Análisis de Datos', icon: FileSpreadsheet },
           { id: 'formats', label: 'Formatos Envasado', icon: Settings },
         ].map(item => (
            <button 
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`text-left px-6 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all ${activeSection === item.id ? 'bg-[#111111] text-[#D9FF66] shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                <item.icon size={18} /> {String(item.label)}
            </button>
         ))}
      </div>

      <div className="flex-1 bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm min-h-[600px] relative">
         
         {/* BOTÓN GUARDAR FLOTANTE */}
         {['general', 'technical', 'infra', 'visual', 'users', 'formats'].includes(activeSection) && (
             <div className="absolute top-8 right-8 z-10 flex gap-2">
                {onDownloadBackup && (
                    <button 
                        onClick={onDownloadBackup}
                        className="bg-black text-white px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
                        title="Descargar Copia de Seguridad JSON"
                    >
                        <Download size={16} /> Backup
                    </button>
                )}
                <button 
                   onClick={handleSaveForm}
                   className="bg-[#D9FF66] text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#D9FF66]/20"
                >
                   <Save size={18} /> Guardar Cambios
                </button>
             </div>
         )}

         {/* --- 1. SECCIÓN GENERAL --- */}
         {activeSection === 'general' && (
            <div className="max-w-2xl space-y-8 animate-in slide-in-from-right-4 duration-300">
               {/* ... (Contenido sección general sin cambios) ... */}
               <div>
                  <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">Identidad Corporativa</h2>
                  <p className="text-gray-400 text-sm">Datos fiscales y dirección para informes y documentos oficiales.</p>
               </div>
               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Logotipo (Fondo Transparente)</label>
                     <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                           {formConfig.logoBase64 ? (
                              <img src={formConfig.logoBase64} alt="Logo" className="w-full h-full object-contain" />
                           ) : (
                              <Layout className="text-gray-300" />
                           )}
                        </div>
                        <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           ref={fileInputRef}
                           onChange={handleLogoUpload}
                        />
                        <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800"
                        >
                           Subir Imagen
                        </button>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Razón Social</label>
                        <input type="text" value={formConfig.companyName} onChange={e => setFormConfig({...formConfig, companyName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">NIF / CIF</label>
                           <input type="text" value={formConfig.cif} onChange={e => setFormConfig({...formConfig, cif: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
                           <input type="text" value={formConfig.phone} onChange={e => setFormConfig({...formConfig, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dirección</label>
                        <input type="text" value={formConfig.address} onChange={e => setFormConfig({...formConfig, address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">C. Postal</label>
                           <input type="text" value={formConfig.zipCode} onChange={e => setFormConfig({...formConfig, zipCode: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                        </div>
                        <div className="col-span-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ciudad</label>
                           <input type="text" value={formConfig.city} onChange={e => setFormConfig({...formConfig, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                        </div>
                        <div className="col-span-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Provincia</label>
                           <input type="text" value={formConfig.province} onChange={e => setFormConfig({...formConfig, province: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-[#111111] outline-none" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- 2. GESTIÓN DE USUARIOS --- */}
         {activeSection === 'users' && (
             <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                 <div>
                    <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">Equipo y Accesos</h2>
                    <p className="text-gray-400 text-sm">Gestiona quién tiene permiso para acceder a la aplicación.</p>
                 </div>

                 {/* Formulario Nuevo Usuario */}
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-end gap-4">
                    <div className="flex-1 space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre</label>
                       <input type="text" placeholder="Ej: Juan Pérez" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none text-[#111111]" />
                    </div>
                    <div className="flex-1 space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email</label>
                       <input type="email" placeholder="juan@empresa.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none text-[#111111]" />
                    </div>
                    
                    {/* CUSTOM DROPDOWN ROL */}
                    <div className="w-40 space-y-1 relative" ref={roleRef}>
                       <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Rol</label>
                       <button 
                          onClick={() => setIsRoleOpen(!isRoleOpen)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-[#111111] outline-none flex justify-between items-center h-[38px] transition-all hover:border-gray-300"
                       >
                          <span>{newUser.role === UserRole.ADMIN ? 'Administrador' : newUser.role === UserRole.OPERATOR ? 'Operario' : 'Solo Lectura'}</span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isRoleOpen ? 'rotate-180' : ''}`} />
                       </button>
                       
                       {isRoleOpen && (
                          <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1">
                             {[
                                { val: UserRole.ADMIN, label: 'Administrador' },
                                { val: UserRole.OPERATOR, label: 'Operario' },
                                { val: UserRole.VIEWER, label: 'Solo Lectura' }
                             ].map(opt => (
                                <button
                                   key={opt.val}
                                   onClick={() => { setNewUser({...newUser, role: opt.val}); setIsRoleOpen(false); }}
                                   className={`w-full text-left px-4 py-2.5 text-xs font-bold flex justify-between items-center transition-colors ${newUser.role === opt.val ? 'bg-[#111111] text-[#D9FF66]' : 'text-[#111111] hover:bg-gray-50'}`}
                                >
                                   {opt.label}
                                   {newUser.role === opt.val && <Check size={12} />}
                                </button>
                             ))}
                          </div>
                       )}
                    </div>

                    <button onClick={handleAddUser} className="bg-black text-[#D9FF66] px-4 py-2 rounded-xl h-[38px] font-black uppercase text-xs hover:bg-gray-800 transition-all">
                       <Plus size={18} /> Añadir
                    </button>
                 </div>

                 {/* Lista de Usuarios */}
                 <div className="space-y-2">
                    {formConfig.authorizedUsers?.map(user => (
                       <div key={user.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-black transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                {user.name.charAt(0)}
                             </div>
                             <div>
                                <p className="text-sm font-black text-[#111111]">{user.name}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className={`bg-gray-100 text-[#111111] px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-gray-200`}>
                                {user.role}
                             </span>
                             <button onClick={() => handleRemoveUser(user.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                       </div>
                    ))}
                 </div>
             </div>
         )}

         {/* --- 3. PERSONALIZACIÓN VISUAL --- */}
         {activeSection === 'visual' && (
             <div className="max-w-4xl space-y-10 animate-in slide-in-from-right-4 duration-300">
                 {/* ... (Contenido visual sin cambios) ... */}
                 <div>
                    <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">Personalización</h2>
                    <p className="text-gray-400 text-sm">Controla qué elementos se muestran en el panel principal.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Widgets Dashboard */}
                    <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase flex items-center gap-2"><LayoutDashboard size={16} /> Widgets del Dashboard</h3>
                       <div className="space-y-2">
                          {formConfig.dashboardWidgets.map(widget => (
                             <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-600">{WIDGET_NAMES[widget.id] || widget.id}</span>
                                <button 
                                   onClick={() => toggleWidget(widget.id)} 
                                   className={`p-2 rounded-lg transition-colors ${widget.visible ? 'bg-black text-[#D9FF66]' : 'bg-gray-200 text-gray-400'}`}
                                >
                                   {widget.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Menú Lateral */}
                    <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase flex items-center gap-2"><Menu size={16} /> Menú Lateral</h3>
                       <div className="space-y-2">
                          {formConfig.sidebarConfig.map(item => {
                             const navItem = NAV_ITEMS.find(n => n.id === item.id);
                             return (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                   <div className="flex items-center gap-2 text-gray-600">
                                      {navItem?.icon}
                                      <span className="text-xs font-bold">{navItem?.label}</span>
                                   </div>
                                   <button 
                                      onClick={() => toggleSidebarItem(item.id)} 
                                      className={`p-2 rounded-lg transition-colors ${item.visible ? 'bg-black text-[#D9FF66]' : 'bg-gray-200 text-gray-400'} ${item.id === 'config' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      disabled={item.id === 'config'}
                                   >
                                      {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                   </button>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>
             </div>
         )}

         {/* --- 4. INFRAESTRUCTURA --- */}
         {activeSection === 'infra' && (
            <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300">
               {/* ... (Contenido infra sin cambios) ... */}
               <div>
                  <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">Infraestructura</h2>
                  <p className="text-gray-400 text-sm">Define la capacidad instalada de la almazara.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                       <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2 text-[#111111]"><Database size={16} /> Tolvas de Recepción</h3>
                       <div className="flex items-center gap-4">
                           <button onClick={() => setNumHoppers(Math.max(1, numHoppers - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-xl hover:bg-gray-100 text-[#111111]">-</button>
                           <span className="text-3xl font-black tabular-nums text-[#111111]">{numHoppers}</span>
                           <button onClick={() => setNumHoppers(numHoppers + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-xl hover:bg-gray-100 text-[#111111]">+</button>
                       </div>
                       <p className="text-[10px] text-gray-400 mt-2">Puntos de descarga de aceituna.</p>
                   </div>
                   <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                       <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2 text-[#111111]"><Database size={16} /> Depósitos Bodega</h3>
                       <div className="flex items-center gap-4">
                           <button onClick={() => setNumTanks(Math.max(1, numTanks - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-xl hover:bg-gray-100 text-[#111111]">-</button>
                           <span className="text-3xl font-black tabular-nums text-[#111111]">{numTanks}</span>
                           <button onClick={() => setNumTanks(numTanks + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-xl hover:bg-gray-100 text-[#111111]">+</button>
                       </div>
                       <p className="text-[10px] text-gray-400 mt-2">Tanques de almacenamiento de aceite.</p>
                   </div>
               </div>

               {/* Edición de capacidades */}
               <div className="bg-white border border-gray-100 rounded-[24px] p-6">
                   <h3 className="text-sm font-black uppercase mb-4 text-[#111111]">Capacidades Individuales (KG)</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                       {localTanks.map(tank => (
                           <div key={tank.id} className="space-y-1">
                               <label className="text-[9px] font-bold text-[#111111] block">{tank.name}</label>
                               <input 
                                   type="number" 
                                   value={tank.maxCapacityKg} 
                                   onChange={e => handleUpdateTankCapacity(tank.id, e.target.value)}
                                   className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-black text-black"
                               />
                           </div>
                       ))}
                   </div>
                   <div className="mt-6 border-t border-gray-100 pt-4">
                       <label className="text-[9px] font-black text-[#111111] uppercase block mb-1">Capacidad Nodriza (Litros)</label>
                       <input 
                           type="number" 
                           value={Math.round(localNurseCapacity / formConfig.oilDensity)}
                           onChange={e => {
                               const liters = parseFloat(e.target.value);
                               if(!isNaN(liters)) {
                                   setLocalNurseCapacity(liters * formConfig.oilDensity);
                               }
                           }}
                           className="bg-black text-[#D9FF66] rounded-xl px-4 py-2 text-sm font-bold w-32 text-center outline-none"
                       />
                   </div>
               </div>
            </div>
         )}

         {/* --- 5. PARÁMETROS TÉCNICOS --- */}
         {activeSection === 'technical' && (
            <div className="max-w-3xl space-y-8 animate-in slide-in-from-right-4 duration-300">
               {/* ... (Contenido técnico sin cambios) ... */}
               <div><h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Variables de Proceso</h2></div>
               <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-black text-orange-800 uppercase tracking-widest">Densidad Aceite (kg/L)</label>
                     <span className="text-2xl font-black text-orange-600">{formConfig.oilDensity}</span>
                  </div>
                  <input type="range" min="0.900" max="0.930" step="0.001" value={formConfig.oilDensity} onChange={(e) => setFormConfig({...formConfig, oilDensity: parseFloat(e.target.value)})} className="w-full accent-orange-500"/>
                  <p className="text-[10px] text-orange-700 mt-2">Este valor se utiliza para todas las conversiones de Litros a Kilos en Envasado y Bodega.</p>
               </div>

               <div className="w-full h-px bg-gray-100 my-8"></div>

               {/* NUEVA SECCIÓN: AJUSTES DE CAMPAÑA (RENDIMIENTOS) */}
               <div>
                   <h3 className="text-lg font-black text-[#111111] uppercase tracking-tighter mb-4 flex items-center gap-2">
                       <Percent size={20} /> Ajustes de Campaña (Rendimientos Estimados)
                   </h3>
                   <p className="text-xs text-gray-500 mb-6 max-w-lg">
                       Define el rendimiento medio estimado para calcular el aceite teórico en Vales que aún no tienen análisis de laboratorio.
                   </p>
                   
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {Object.values(OliveVariety).map(variety => (
                           <div key={variety} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-[#D9FF66] transition-colors">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{variety}</label>
                               <div className="relative">
                                   <input 
                                       type="number" 
                                       step="0.1" 
                                       min="0" 
                                       max="100"
                                       value={formConfig.varietySettings?.[variety]?.defaultYield || 0}
                                       onChange={(e) => handleYieldUpdate(variety, parseFloat(e.target.value))}
                                       className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-black rounded-xl pl-3 pr-8 py-2 text-lg font-black text-[#111111] outline-none transition-all"
                                   />
                                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>

               <div className="w-full h-px bg-gray-100 my-8"></div>

               <div className="space-y-6">
                   <div className="flex items-center gap-3">
                       <History size={24} className="text-[#111111]" />
                       <h2 className="text-xl font-black text-[#111111] uppercase tracking-tighter">Gestión de Ciclo y Datos</h2>
                   </div>
                   
                   <div className="bg-[#F9FAF9] p-6 rounded-[24px] border border-gray-100 flex justify-between items-center">
                       <div>
                           <h3 className="text-sm font-black text-[#111111] uppercase mb-1">Campaña Actual</h3>
                           <p className="text-xl font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg w-fit">{String(config.currentCampaign)}</p>
                       </div>
                       <button 
                           onClick={() => setShowArchiveModal(true)}
                           className="px-6 py-3 bg-white border border-gray-200 text-[#111111] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm"
                       >
                           Cerrar Campaña
                       </button>
                   </div>
               </div>
            </div>
         )}

         {/* --- 6. FORMATOS Y PRODUCTOS --- */}
         {activeSection === 'formats' && (
            <div className="max-w-4xl space-y-10 animate-in slide-in-from-right-4 duration-300">
               <div>
                  <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">Formatos y Productos</h2>
                  <p className="text-gray-400 text-sm">Configura los envases de venta y el catálogo de materiales auxiliares.</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* FORMATOS DE ENVASADO */}
                   <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase flex items-center gap-2"><Package size={16} /> Formatos de Venta</h3>
                       <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                           <div className="flex gap-2">
                               <input type="text" placeholder="Nombre (Ej: Botella 500ml)" value={newFormat.name} onChange={e => setNewFormat({...newFormat, name: e.target.value})} className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-bold text-black outline-none placeholder:text-gray-500" />
                               <input type="number" placeholder="Litros" value={newFormat.liters} onChange={e => setNewFormat({...newFormat, liters: e.target.value})} className="w-20 bg-white px-3 py-2 rounded-lg text-xs font-bold text-black outline-none placeholder:text-gray-500" />
                               <button onClick={handleAddFormat} className="bg-black text-white p-2 rounded-lg"><Plus size={16} /></button>
                           </div>
                           <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                               {formConfig.packagingFormats.map(fmt => (
                                   <div key={fmt.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 group hover:border-gray-300">
                                       <span className="text-xs font-bold text-black">{fmt.name} ({fmt.capacityLiters} L)</span>
                                       <button onClick={() => handleRemoveFormat(fmt.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>

                   {/* MATERIALES AUXILIARES */}
                   <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase flex items-center gap-2"><Layers size={16} /> Catálogo Auxiliar</h3>
                       <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                           <div className="flex gap-2">
                               <input type="text" placeholder="Producto (Ej: Tapón Corcho)" value={newAuxProduct.name} onChange={e => setNewAuxProduct({...newAuxProduct, name: e.target.value})} className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-bold text-black outline-none placeholder:text-gray-500" />
                               <select value={newAuxProduct.category} onChange={e => setNewAuxProduct({...newAuxProduct, category: e.target.value as any})} className="w-24 bg-white px-2 py-2 rounded-lg text-xs font-bold text-black outline-none">
                                   <option value="Envase">Envase</option>
                                   <option value="Tapón">Tapón</option>
                                   <option value="Etiqueta">Etiqueta</option>
                                   <option value="Caja">Caja</option>
                               </select>
                               <button onClick={handleAddAuxProduct} className="bg-black text-white p-2 rounded-lg"><Plus size={16} /></button>
                           </div>
                           <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                               {formConfig.auxiliaryProducts?.map(prod => (
                                   <div key={prod.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 group hover:border-gray-300">
                                       <div>
                                           <p className="text-xs font-bold text-black">{prod.name}</p>
                                           <p className="text-[9px] text-gray-600 font-bold uppercase">{prod.category}</p>
                                       </div>
                                       <button onClick={() => handleRemoveAuxProduct(prod.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
               </div>
            </div>
         )}

         {/* ... (Sección Data y Modal de Archivo sin cambios relevantes) ... */}
         {/* --- 7. EXPORTACIÓN DE DATOS --- */}
         {activeSection === 'data' && (
             <div className="max-w-3xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                 <div>
                    <h2 className="text-2xl font-black text-[#111111] uppercase tracking-tighter mb-2">Exportación de Datos</h2>
                    <p className="text-gray-400 text-sm">Descarga la información completa del sistema para análisis externo.</p>
                 </div>

                 <div className="bg-[#111111] text-white p-8 rounded-[32px] shadow-2xl">
                     <div className="flex items-center gap-4 mb-6">
                         <div className="p-3 bg-[#D9FF66] text-black rounded-xl"><FileSpreadsheet size={24} /></div>
                         <h3 className="text-xl font-black uppercase">Informe Maestro</h3>
                     </div>
                     
                     <div className="space-y-4 mb-8">
                         <div className="flex items-center gap-4">
                             <button 
                                onClick={() => setExportScope('current')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border ${exportScope === 'current' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                             >
                                Campaña Actual ({config.currentCampaign})
                             </button>
                             <button 
                                onClick={() => setExportScope('all')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border ${exportScope === 'all' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                             >
                                Todo el Histórico
                             </button>
                         </div>
                         <p className="text-xs text-gray-400 leading-relaxed">
                             Se generará un archivo CSV compatible con Excel conteniendo:
                             <br/>• Entradas de Aceituna (Vales)
                             <br/>• Ventas de Envasado (Detalladas)
                             <br/>• Salidas a Granel
                         </p>
                     </div>

                     <button 
                        onClick={handleExportMasterCSV}
                        className="w-full py-4 bg-[#D9FF66] hover:bg-[#cbf550] text-black rounded-[20px] font-black uppercase text-sm tracking-widest shadow-lg shadow-[#D9FF66]/20 transition-all flex items-center justify-center gap-2"
                     >
                        <Download size={18} /> Descargar Informe CSV
                     </button>
                 </div>
             </div>
         )}

      </div>

      {showArchiveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-gray-100 bg-[#F9FAF9]">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CAMBIO DE CICLO</p>
                              <h3 className="text-2xl font-black text-[#111111] uppercase tracking-tighter">Empezar Nueva Campaña</h3>
                          </div>
                          <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={24} /></button>
                      </div>
                  </div>
                  
                  <form onSubmit={handleArchiveSubmit} className="p-8 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Nueva Campaña</label>
                          <input 
                              type="text" 
                              required
                              placeholder="Ej: 2026/2027"
                              value={archiveForm.nextCampaign}
                              onChange={e => setArchiveForm({...archiveForm, nextCampaign: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111111] outline-none focus:border-black transition-all shadow-sm"
                          />
                      </div>

                      <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gestión de Stock (Bodega)</p>
                          <label className="flex items-start gap-3 cursor-pointer group">
                              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${archiveForm.transferOil ? 'bg-black border-black' : 'border-gray-300 bg-white'}`}>
                                  {archiveForm.transferOil && <Check size={12} className="text-white" />}
                              </div>
                              <input type="checkbox" checked={archiveForm.transferOil} onChange={e => setArchiveForm({...archiveForm, transferOil: e.target.checked})} className="hidden" />
                              <div className="flex-1">
                                  <span className="text-xs font-bold text-[#111111] block">Arrastrar saldos de aceite</span>
                                  <span className="text-[10px] text-gray-500 leading-tight">Si marcas esta opción, los depósitos mantendrán su nivel actual como existencias iniciales. Si no, se pondrán a 0.</span>
                              </div>
                          </label>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Confirmación de Seguridad</label>
                          <input 
                              type="text" 
                              required
                              placeholder='Escribe "ARCHIVAR" para confirmar'
                              value={archiveForm.confirmText}
                              onChange={e => setArchiveForm({...archiveForm, confirmText: e.target.value})}
                              className="w-full bg-white border-2 border-red-100 focus:border-red-500 rounded-xl px-4 py-3 text-sm font-bold text-red-600 outline-none placeholder:text-red-200 transition-all"
                          />
                      </div>

                      <button 
                          type="submit"
                          disabled={archiveForm.confirmText !== 'ARCHIVAR' || !archiveForm.nextCampaign}
                          className="w-full py-4 bg-[#111111] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                      >
                          Confirmar y Abrir Nueva Campaña
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};
