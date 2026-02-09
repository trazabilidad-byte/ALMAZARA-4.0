
import React, { useMemo } from 'react';
import { Customer, CustomerStatus, OilExit, ExitType, Vale, ValeType, CustomerType, SalesOrder, PomaceExit } from '../types';
import { ArrowLeft, Edit, Archive, Trash2, RotateCcw, MapPin, Phone, Mail, FileText, Truck, ShoppingBag, Droplets, Calendar, Package, Download, UserCog } from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  oilExits: OilExit[];
  vales: Vale[];
  salesOrders?: SalesOrder[];
  pomaceExits?: PomaceExit[];
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ 
  customer, 
  oilExits, 
  vales, 
  salesOrders = [], 
  pomaceExits = [], 
  onBack, onEdit, onArchive, onDelete 
}) => {
  
  const isArchived = customer.status === CustomerStatus.ARCHIVED;

  // 1. SECCIONES DINÁMICAS ESTRICTAS POR TIPO DE CLIENTE
  const showBulkSection = customer.type === CustomerType.MAYORISTA;
  const showOliveSection = customer.type === CustomerType.COMPRADOR_ACEITUNA;
  const showPackageSection = customer.type === CustomerType.MINORISTA; 
  const showPomaceSection = customer.type === CustomerType.COMPRADOR_ORUJO;

  // Filtrar Datos
  const bulkSales = useMemo(() => 
    showBulkSection 
      ? oilExits.filter(exit => exit.customer_id === customer.id && exit.type === ExitType.CISTERNA)
          .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [], 
  [oilExits, customer.id, showBulkSection]);

  const oliveSales = useMemo(() => 
    showOliveSection
      ? vales.filter(v => v.tipo_vale === ValeType.VENTA_DIRECTA && (v.comprador === customer.id || v.comprador === customer.name))
          .sort((a,b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime())
      : [],
  [vales, customer.id, customer.name, showOliveSection]);

  const packagedSales = useMemo(() => 
    showPackageSection
      ? salesOrders.filter(s => s.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [],
  [salesOrders, customer.id, showPackageSection]);

  const pomaceSales = useMemo(() => 
    showPomaceSection
      ? pomaceExits.filter(p => p.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [],
  [pomaceExits, customer.id, showPomaceSection]);

  // KPIs dinámicos
  const totalBulkKg = bulkSales.reduce((acc, s) => acc + s.kg, 0);
  const totalOliveKg = oliveSales.reduce((acc, v) => acc + v.kilos_netos, 0);
  const totalPomaceKg = pomaceSales.reduce((acc, p) => acc + p.kg, 0);
  const totalPackagedUnits = packagedSales.reduce((acc, order) => acc + order.products.reduce((sum, p) => sum + p.units, 0), 0);
  
  // 2. LÓGICA DE VOLUMEN TOTAL Y UNIDAD
  const volumeUnit = customer.type === CustomerType.MINORISTA ? 'uds' : 'kg';
  
  const totalVolume = useMemo(() => {
    if (customer.type === CustomerType.MINORISTA) return totalPackagedUnits;
    if (customer.type === CustomerType.MAYORISTA) return totalBulkKg;
    if (customer.type === CustomerType.COMPRADOR_ACEITUNA) return totalOliveKg;
    if (customer.type === CustomerType.COMPRADOR_ORUJO) return totalPomaceKg;
    return 0;
  }, [customer.type, totalBulkKg, totalOliveKg, totalPomaceKg, totalPackagedUnits]);

  const handleDownloadCertificate = () => {
    if (!window.jspdf) {
      alert("Error: La librería de PDF no se ha cargado correctamente.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración de colores
    const limeColor = [217, 255, 102];
    const blackColor = [17, 17, 17];

    doc.setFillColor(...blackColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(...limeColor);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ALMAZARA 4.0", 14, 20);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("HISTORIAL DE OPERACIONES - CAMPAÑA 2025/2026", 14, 28);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE", 14, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Razón Social: ${customer.name.toUpperCase()}`, 14, 65);
    doc.text(`CIF/NIF: ${customer.cif}`, 14, 71);
    
    doc.save(`Historial_Cliente_${customer.cif}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      {/* HEADER */}
      <div className="flex flex-col gap-6">
         <div className="flex justify-between items-center">
             <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors font-bold text-xs uppercase tracking-widest">
                <ArrowLeft size={16} /> Volver al listado
             </button>
             <div className="flex gap-2">
                 {isArchived ? (
                     <button onClick={onArchive} className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-100"><RotateCcw size={14} /> Restaurar</button>
                 ) : (
                     <button onClick={onArchive} className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100"><Archive size={14} /> Archivar</button>
                 )}
             </div>
         </div>
         
         <div className={`bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm relative overflow-hidden ${isArchived ? 'opacity-80' : ''}`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl md:text-4xl font-black text-[#111111] uppercase tracking-tighter">{customer.name}</h1>
                      <span className="px-3 py-1 bg-black text-[#D9FF66] rounded-lg text-xs font-black uppercase tracking-widest">{customer.cif}</span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-black uppercase tracking-widest">{customer.type}</span>
                   </div>
                   
                   <div className="flex flex-col gap-2 mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 max-w-2xl">
                      <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Datos de Contacto</p>
                          {/* 3. BOTÓN DE EDICIÓN ELIMINADO AQUÍ */}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-bold text-[#111111]">
                          <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> {customer.address || 'Sin dirección'}</div>
                          <div className="flex items-center gap-2"><Phone size={16} className="text-gray-400" /> {customer.phone || 'Sin teléfono'}</div>
                          <div className="flex items-center gap-2"><Mail size={16} className="text-gray-400" /> {customer.email || 'Sin email'}</div>
                      </div>
                   </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volumen Total Negocio</p>
                        <p className="text-3xl font-black text-[#111111]">
                            {totalVolume.toLocaleString()} <span className="text-sm text-gray-400">{volumeUnit}</span>
                        </p>
                    </div>
                    <button 
                       onClick={onEdit}
                       className="bg-[#111111] text-[#D9FF66] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                    >
                       <UserCog size={16} /> Modificar Ficha
                    </button>
                </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* COMPRAS A GRANEL (CISTERNAS) - Solo Mayorista */}
        {showBulkSection && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#111111] text-white rounded-lg"><Truck size={18} /></div>
                    <h3 className="text-lg font-black uppercase text-[#111111]">Compras a Granel</h3>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    {bulkSales.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="bg-[#F9FAF9] border-b border-gray-50">
                            <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Fecha</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Matrícula</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Kilos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {bulkSales.map(sale => (
                            <tr key={sale.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-xs font-bold text-gray-600 flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400" />
                                    {new Date(sale.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-xs font-black uppercase text-[#111111]">{sale.license_plate}</td>
                                <td className="px-6 py-4 text-sm font-black text-[#111111] text-right">{sale.kg.toLocaleString()}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                    ) : (
                    <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Sin registros de cisternas</div>
                    )}
                </div>
            </div>
        )}

        {/* COMPRAS DE ENVASADO - Solo Minorista */}
        {showPackageSection && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShoppingBag size={18} /></div>
                    <h3 className="text-lg font-black uppercase text-[#111111]">Compras Envasado</h3>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    {packagedSales.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="bg-[#F9FAF9] border-b border-gray-50">
                                <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Productos</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {packagedSales.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        {order.products.map((p, i) => (
                                            <div key={i} className="text-xs text-[#111111]">
                                                <span className="font-black">{p.units}x</span> {p.format} (Lote: {p.lotId})
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-[#111111] text-right">{order.totalAmount.toLocaleString()}€</td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Sin registros de envasado</div>
                    )}
                </div>
            </div>
        )}

        {/* SALIDAS ORUJO */}
        {showPomaceSection && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Truck size={18} /></div>
                    <h3 className="text-lg font-black uppercase text-[#111111]">Retiradas de Orujo</h3>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    {pomaceSales.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="bg-[#F9FAF9] border-b border-gray-50">
                                <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Nº Vale</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Notas</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Kg</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pomaceSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-xs font-black text-[#111111]">{sale.valeNumber}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{sale.notes}</td>
                                    <td className="px-6 py-4 text-sm font-black text-[#111111] text-right">{sale.kg.toLocaleString()}</td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Sin registros de orujo</div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
