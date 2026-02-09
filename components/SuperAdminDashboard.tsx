
import React, { useState, useMemo } from 'react';
import { Almazara, ContractMode, SubscriptionStatus } from '../types';
import { 
  Globe, Server, Users, DollarSign, Calendar, HardDrive, 
  ShieldCheck, AlertTriangle, Search, Plus, Check, MoreVertical, X, LogOut 
} from 'lucide-react';

interface SuperAdminDashboardProps {
  tenants: Almazara[];
  onAddTenant: (tenant: Almazara) => void;
  onUpdateTenant: (tenant: Almazara) => void;
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ tenants, onAddTenant, onUpdateTenant, onLogout }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado formulario
  const [formData, setFormData] = useState<Partial<Almazara>>({
    name: '',
    cif: '',
    slug: '',
    contractMode: ContractMode.SAAS,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    planPriceMonthly: 150,
    storageLimitMb: 500,
    nextPaymentDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    allowedDomain: ''
  });

  // KPI: Monthly Recurring Revenue (SaaS only)
  const mrr = useMemo(() => {
    return tenants
      .filter(t => t.contractMode === ContractMode.SAAS && t.subscriptionStatus === SubscriptionStatus.ACTIVE)
      .reduce((acc, t) => acc + (t.planPriceMonthly || 0), 0);
  }, [tenants]);

  // KPI: Next 30 days projection
  const next30DaysIncome = useMemo(() => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30);

    return tenants
      .filter(t => 
        t.contractMode === ContractMode.SAAS && 
        t.subscriptionStatus === SubscriptionStatus.ACTIVE &&
        t.nextPaymentDate && new Date(t.nextPaymentDate) <= future && new Date(t.nextPaymentDate) >= today
      )
      .reduce((acc, t) => acc + (t.planPriceMonthly || 0), 0);
  }, [tenants]);

  const handleGenerateLicense = () => {
    // Simular generación de clave segura
    const key = 'LIC-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    setFormData({ ...formData, licenseKey: key });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cif) return;

    const newTenant: Almazara = {
      id: formData.id || `alm-${Date.now()}`,
      name: formData.name,
      cif: formData.cif,
      slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
      setupCompleted: false,
      contractMode: formData.contractMode!,
      subscriptionStatus: formData.subscriptionStatus!,
      storageUsedMb: 0,
      storageLimitMb: formData.storageLimitMb || 500,
      planPriceMonthly: formData.planPriceMonthly,
      nextPaymentDate: formData.nextPaymentDate,
      licenseKey: formData.licenseKey,
      allowedDomain: formData.allowedDomain
    };

    if (formData.id) {
        onUpdateTenant(newTenant);
    } else {
        onAddTenant(newTenant);
    }
    setShowModal(false);
    // Reset form
    setFormData({ contractMode: ContractMode.SAAS, subscriptionStatus: SubscriptionStatus.ACTIVE, planPriceMonthly: 150, storageLimitMb: 500 });
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.cif.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#D9FF66] text-black px-2 py-1 rounded font-black text-xs uppercase">Super Admin</div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Gestión de Almazaras</h1>
           </div>
           <p className="text-gray-400 text-sm">Control de rentabilidad, licencias y estado del servicio.</p>
        </div>
        
        <div className="flex gap-4">
            <button 
               onClick={onLogout}
               className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center gap-2"
            >
               <LogOut size={16} /> Cerrar Sesión
            </button>
            <button 
               onClick={() => setShowModal(true)}
               className="bg-[#D9FF66] text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center gap-2"
            >
               <Plus size={16} /> Nueva Almazara
            </button>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
         <div className="bg-[#1a1a1a] p-6 rounded-[24px] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><DollarSign size={20} /></div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">MRR Actual</span>
            </div>
            <p className="text-4xl font-black">{mrr.toLocaleString()}€</p>
            <p className="text-xs text-gray-500 mt-2">Ingresos recurrentes mensuales</p>
         </div>

         <div className="bg-[#1a1a1a] p-6 rounded-[24px] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-green-500/20 text-green-400 rounded-lg"><Calendar size={20} /></div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cobros (30 días)</span>
            </div>
            <p className="text-4xl font-black text-green-400">{next30DaysIncome.toLocaleString()}€</p>
            <p className="text-xs text-gray-500 mt-2">Previsión próxima facturación</p>
         </div>

         <div className="bg-[#1a1a1a] p-6 rounded-[24px] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Users size={20} /></div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clientes Activos</span>
            </div>
            <p className="text-4xl font-black">{tenants.filter(t => t.subscriptionStatus === SubscriptionStatus.ACTIVE).length}</p>
            <p className="text-xs text-gray-500 mt-2">SaaS y On-Premise</p>
         </div>

         <div className="bg-[#1a1a1a] p-6 rounded-[24px] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><AlertTriangle size={20} /></div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Impagos / Riesgo</span>
            </div>
            <p className="text-4xl font-black text-red-500">{tenants.filter(t => t.subscriptionStatus === SubscriptionStatus.SUSPENDED).length}</p>
            <p className="text-xs text-gray-500 mt-2">Cuentas bloqueadas</p>
         </div>
      </div>

      {/* LISTADO */}
      <div className="bg-[#1a1a1a] rounded-[32px] border border-white/5 overflow-hidden">
         <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-black uppercase">Cartera de Clientes</h3>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#D9FF66] outline-none"
               />
            </div>
         </div>
         <table className="w-full text-left">
            <thead className="bg-[#111] text-gray-500 text-[10px] uppercase font-bold tracking-widest">
               <tr>
                  <th className="px-6 py-4">Almazara</th>
                  <th className="px-6 py-4">Modalidad</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Facturación</th>
                  <th className="px-6 py-4">Almacenamiento</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
               {filteredTenants.map(tenant => {
                  const storagePercent = (tenant.storageUsedMb / tenant.storageLimitMb) * 100;
                  const isSaaS = tenant.contractMode === ContractMode.SAAS;

                  return (
                     <tr key={tenant.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                           <p className="font-bold text-white">{tenant.name}</p>
                           <p className="text-xs text-gray-500">{tenant.cif}</p>
                        </td>
                        <td className="px-6 py-4">
                           {isSaaS ? (
                              <div className="flex items-center gap-2 text-blue-400">
                                 <Globe size={16} /> <span className="font-bold text-xs">CLOUD SAAS</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2 text-purple-400">
                                 <Server size={16} /> <span className="font-bold text-xs">ON-PREMISE</span>
                              </div>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                              tenant.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'bg-green-500/20 text-green-400' :
                              tenant.subscriptionStatus === SubscriptionStatus.SUSPENDED ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                           }`}>
                              {tenant.subscriptionStatus}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           {isSaaS ? (
                              <div>
                                 <p className="font-bold">{tenant.planPriceMonthly}€ / mes</p>
                                 <p className="text-[10px] text-gray-500">Prox: {tenant.nextPaymentDate}</p>
                              </div>
                           ) : (
                              <p className="text-gray-500 text-xs italic">Pago Único</p>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           <div className="w-32">
                              <div className="flex justify-between text-[10px] mb-1">
                                 <span className="text-gray-400">{tenant.storageUsedMb}MB</span>
                                 <span className={storagePercent > 90 ? 'text-red-500 font-bold' : 'text-gray-600'}>{Math.round(storagePercent)}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full ${storagePercent > 90 ? 'bg-red-500' : 'bg-gray-500'}`} 
                                    style={{ width: `${Math.min(storagePercent, 100)}%` }}
                                 ></div>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => { setFormData(tenant); setShowModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                              <MoreVertical size={16} />
                           </button>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>

      {/* MODAL ALTA/EDICIÓN */}
      {showModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
               <div className="p-8 border-b border-white/10 flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase">{formData.id ? 'Editar Contrato' : 'Alta de Almazara'}</h3>
                  <button onClick={() => setShowModal(false)}><X className="text-gray-400 hover:text-white" /></button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {/* TIPO CONTRATO */}
                  <div className="grid grid-cols-2 gap-4">
                     <button
                        type="button"
                        onClick={() => setFormData({...formData, contractMode: ContractMode.SAAS})}
                        className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.contractMode === ContractMode.SAAS ? 'border-[#D9FF66] bg-[#D9FF66]/10 text-white' : 'border-white/5 bg-black text-gray-500'}`}
                     >
                        <Globe className="mx-auto mb-2" />
                        <span className="font-bold text-sm">SaaS (Suscripción)</span>
                     </button>
                     <button
                        type="button"
                        onClick={() => setFormData({...formData, contractMode: ContractMode.ON_PREMISE})}
                        className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.contractMode === ContractMode.ON_PREMISE ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/5 bg-black text-gray-500'}`}
                     >
                        <Server className="mx-auto mb-2" />
                        <span className="font-bold text-sm">On-Premise (Licencia)</span>
                     </button>
                  </div>

                  {/* DATOS GENERALES */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Fiscal</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#D9FF66]" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">CIF</label>
                        <input type="text" required value={formData.cif} onChange={e => setFormData({...formData, cif: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#D9FF66]" />
                     </div>
                  </div>

                  {/* CAMPOS ESPECÍFICOS SAAS */}
                  {formData.contractMode === ContractMode.SAAS && (
                     <div className="space-y-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Configuración Suscripción</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Precio Mensual (€)</label>
                              <input type="number" value={formData.planPriceMonthly} onChange={e => setFormData({...formData, planPriceMonthly: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Próximo Cobro</label>
                              <input type="date" value={formData.nextPaymentDate} onChange={e => setFormData({...formData, nextPaymentDate: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Límite Almacenamiento (MB)</label>
                              <input type="number" value={formData.storageLimitMb} onChange={e => setFormData({...formData, storageLimitMb: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
                              <select value={formData.subscriptionStatus} onChange={e => setFormData({...formData, subscriptionStatus: e.target.value as SubscriptionStatus})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                                 <option value={SubscriptionStatus.ACTIVE}>Activa</option>
                                 <option value={SubscriptionStatus.SUSPENDED}>Suspendida (Impago)</option>
                                 <option value={SubscriptionStatus.CANCELLED}>Cancelada</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* CAMPOS ESPECÍFICOS ON-PREMISE */}
                  {formData.contractMode === ContractMode.ON_PREMISE && (
                     <div className="space-y-4 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/20">
                        <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest">Seguridad de Licencia</h4>
                        <div className="space-y-3">
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Clave de Activación</label>
                              <div className="flex gap-2">
                                 <input type="text" readOnly value={formData.licenseKey || ''} placeholder="Generar clave..." className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-purple-300 outline-none" />
                                 <button type="button" onClick={handleGenerateLicense} className="bg-purple-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-purple-500">Generar</button>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Dominio Vinculado</label>
                              <input type="text" placeholder="ej: gestion.almazara-cliente.com" value={formData.allowedDomain || ''} onChange={e => setFormData({...formData, allowedDomain: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                           </div>
                        </div>
                     </div>
                  )}

                  <button type="submit" className="w-full py-4 bg-[#D9FF66] text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all">
                     {formData.id ? 'Guardar Cambios' : 'Dar de Alta'}
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};
