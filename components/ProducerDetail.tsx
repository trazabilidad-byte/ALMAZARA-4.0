
import React, { useMemo } from 'react';
import { Producer, Vale, ValeType, ValeStatus, ProducerStatus, AppConfig } from '../types';
import { ArrowLeft, Download, MapPin, Phone, Mail, Scale, Droplets, Percent, FileText, Info, Eye, Edit, Archive, Trash2, RotateCcw } from 'lucide-react';

// Declaración global para typescript
declare global {
  interface Window {
    jspdf: any;
  }
}

interface ProducerDetailProps {
  producer: Producer;
  vales: Vale[];
  onBack: () => void;
  onViewVale: (vale: Vale) => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  appConfig?: AppConfig;
}

export const ProducerDetail: React.FC<ProducerDetailProps> = ({ producer, vales, onBack, onViewVale, onEdit, onArchive, onDelete, appConfig }) => {
  
  // Filtrar vales del productor
  const producerVales = useMemo(() => vales.filter(v => v.productor_id === producer.id).sort((a,b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime()), [vales, producer.id]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const totalVales = producerVales.length;
    // Total Kilos incluye TODOS los vales (Molturación + Venta Directa)
    const totalKilos = producerVales.reduce((acc, v) => acc + v.kilos_netos, 0);
    
    // Media de Rendimiento: SOLO vales de Molturación con analítica
    // Excluir Venta Directa explícitamente para no falsear la media con 0s
    const valesParaMedia = producerVales.filter(v => 
        v.tipo_vale === ValeType.MOLTURACION && 
        v.analitica.rendimiento_graso > 0
    );
    
    const sumaRendimientos = valesParaMedia.reduce((acc, v) => acc + v.analitica.rendimiento_graso, 0);
    const rendimientoMedio = valesParaMedia.length > 0 
        ? (sumaRendimientos / valesParaMedia.length) 
        : 0;

    // Aceite Estimado: Suma de lo producido en Molturación
    // Venta Directa no genera aceite para el productor en bodega, pero se podría calcular teórico si se quisiera.
    // Aquí asumimos "Aceite Liquidable" como lo que ha entrado a bodega.
    const aceiteEstimado = producerVales.reduce((acc, v) => {
        const rend = v.analitica.rendimiento_graso || 0;
        return acc + (v.kilos_netos * rend / 100);
    }, 0);

    return { totalVales, totalKilos, rendimientoMedio, aceiteEstimado };
  }, [producerVales]);

  const handleDownloadCertificate = () => {
    if (!window.jspdf) {
      alert("Error: La librería de PDF no se ha cargado correctamente.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración de colores y fuente
    const limeColor = [217, 255, 102]; // #D9FF66
    const blackColor = [17, 17, 17]; // #111111

    // Cabecera
    doc.setFillColor(...blackColor);
    doc.rect(0, 0, 210, 45, 'F');
    
    // Logo (si existe)
    if (appConfig?.logoBase64) {
       try {
          doc.addImage(appConfig.logoBase64, 'PNG', 14, 10, 25, 25, undefined, 'FAST');
       } catch(e) { console.error(e); }
    }

    // Datos Empresa
    if (appConfig) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(appConfig.companyName.toUpperCase(), 45, 18);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`CIF: ${appConfig.cif}`, 45, 24);
        
        // Dirección completa
        const fullAddress = `${appConfig.address || ''}`;
        const location = `${appConfig.zipCode || ''} ${appConfig.city || ''} (${appConfig.province || ''})`;
        doc.text(fullAddress, 45, 29);
        doc.text(location, 45, 34);
        doc.text(`Tel: ${appConfig.phone}`, 45, 39);
    } else {
        doc.setTextColor(...limeColor);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("ALMAZARA 4.0", 14, 20);
    }
    
    doc.setTextColor(...limeColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE ENTREGAS", 200, 35, { align: 'right' });

    // Datos del Productor
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL SOCIO", 14, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${producer.name.toUpperCase()}`, 14, 70);
    doc.text(`NIF/CIF: ${producer.nif}`, 14, 76);
    doc.text(`Dirección: ${producer.address || ''}, ${producer.municipality}`, 14, 82);

    // Resumen
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN TOTAL", 130, 60);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Entregas: ${kpis.totalVales}`, 130, 70);
    doc.text(`Total Aceituna Neta: ${kpis.totalKilos.toLocaleString()} KG`, 130, 76);
    doc.text(`Rendimiento Medio: ${kpis.rendimientoMedio.toFixed(2)}%`, 130, 82);
    doc.text(`Total Aceite Liquidable: ${Math.round(kpis.aceiteEstimado).toLocaleString()} KG`, 130, 88);

    // Tabla de Vales
    const tableColumn = ["Nº Vale", "Fecha", "Variedad", "Estado", "Kg Netos", "Rend. (%)", "Aceite (Kg)"];
    const tableRows: any[] = [];

    producerVales.forEach(v => {
      const isDirect = v.tipo_vale === ValeType.VENTA_DIRECTA;
      const aceiteKg = v.analitica.rendimiento_graso > 0 
        ? Math.round(v.kilos_netos * v.analitica.rendimiento_graso / 100)
        : 0;

      const valeData = [
        v.id_vale.toString().padStart(3, '0'),
        new Date(v.fecha_entrada).toLocaleDateString(),
        v.variedad,
        isDirect ? 'VENTA DIRECTA' : v.estado,
        v.kilos_netos.toLocaleString(),
        isDirect ? '--' : (v.analitica.rendimiento_graso > 0 ? `${v.analitica.rendimiento_graso}%` : '--'),
        isDirect ? '--' : (aceiteKg > 0 ? aceiteKg.toLocaleString() : '--')
      ];
      tableRows.push(valeData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: 'grid',
      headStyles: { fillColor: blackColor, textColor: limeColor, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [249, 250, 249] }
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for(var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Este documento es un resumen informativo generado por el sistema Almazara 4.0.', 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    }

    doc.save(`Certificado_Entregas_${producer.nif}.pdf`);
  };

  const getStatusBadge = (status: ValeStatus, type: ValeType) => {
    if (type === ValeType.VENTA_DIRECTA) {
       return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    switch (status) {
        case ValeStatus.PENDIENTE:
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case ValeStatus.MOLTURADO:
            return 'bg-green-100 text-green-800 border-green-200';
        case ValeStatus.VENDIDO_DIRECTO:
            return 'bg-blue-100 text-blue-800 border-blue-200';
        default:
            return 'bg-gray-100 text-gray-800';
    }
  };

  const isArchived = producer.status === ProducerStatus.ARCHIVED;

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
                     <>
                        <button 
                           onClick={onArchive} 
                           className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-100 transition-all border border-green-200"
                        >
                           <RotateCcw size={14} /> Restaurar Socio
                        </button>
                        <button 
                           onClick={onDelete} 
                           className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-200"
                        >
                           <Trash2 size={14} /> Eliminar Definitivamente
                        </button>
                     </>
                 ) : (
                     <>
                        <button 
                           onClick={onEdit} 
                           className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100 shadow-sm"
                        >
                           <Edit size={14} /> Editar Ficha
                        </button>
                        <button 
                           onClick={onArchive} 
                           className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-200"
                        >
                           <Archive size={14} /> Dar de Baja
                        </button>
                     </>
                 )}
             </div>
         </div>
         
         <div className={`bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden ${isArchived ? 'opacity-80' : ''}`}>
            {isArchived && (
               <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 px-6 py-2 rounded-bl-2xl text-xs font-black uppercase tracking-widest border-l border-b border-orange-200 z-10">
                  Productor Archivado
               </div>
            )}
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-black text-[#111111] uppercase tracking-tighter">{producer.name}</h1>
                  <span className="px-3 py-1 bg-black text-[#D9FF66] rounded-lg text-xs font-black uppercase tracking-widest">{producer.nif}</span>
               </div>
               <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1.5"><MapPin size={16} /> {producer.address || 'Sin dirección'}, {producer.municipality} ({producer.province})</div>
                  <div className="flex items-center gap-1.5"><Phone size={16} /> {producer.phone || 'Sin teléfono'}</div>
                  <div className="flex items-center gap-1.5"><Mail size={16} /> {producer.email || 'Sin email'}</div>
               </div>
            </div>
            <button 
               onClick={handleDownloadCertificate}
               className="bg-[#111111] text-white px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black/80 hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
               <Download size={18} /> Descargar Certificado (PDF)
            </button>
         </div>
      </div>

      {/* KPIS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ENTREGAS</span>
            </div>
            <p className="text-3xl font-black text-[#111111]">{kpis.totalVales}</p>
            <p className="text-xs font-bold text-gray-400 mt-1">Vales registrados</p>
         </div>

         <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Scale size={20} /></div>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">VOLUMEN</span>
            </div>
            <p className="text-3xl font-black text-[#111111]">{kpis.totalKilos.toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-400 mt-1">Kg Aceituna Neta</p>
         </div>

         <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Percent size={20} /></div>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">REND. MEDIO</span>
            </div>
            <p className="text-3xl font-black text-[#111111]">{kpis.rendimientoMedio.toFixed(2)}%</p>
            <p className="text-xs font-bold text-gray-400 mt-1">Graso Industrial</p>
         </div>

         <div className="bg-[#111111] p-6 rounded-[24px] border border-gray-100 shadow-xl text-white">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-white/10 text-[#D9FF66] rounded-xl"><Droplets size={20} /></div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TOTAL ACEITE</span>
            </div>
            <p className="text-3xl font-black text-[#D9FF66]">{Math.round(kpis.aceiteEstimado).toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-500 mt-1">Kg Liquidables</p>
         </div>
      </div>

      {/* TABLA HISTÓRICO */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 rounded-full bg-black"></div>
               <h3 className="text-lg font-black uppercase text-[#111111]">Histórico de Entregas</h3>
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-lg">Campaña 2025/2026</span>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-[#F9FAF9] border-b border-gray-100">
                     <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº Vale</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Variedad</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Kilos Netos</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Rendimiento</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acidez</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aceite (KG)</th>
                     <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Acción</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {producerVales.map(v => (
                     <tr key={v.id_vale} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-8 py-5 font-black text-[#111111]">#{v.id_vale.toString().padStart(3, '0')}</td>
                        <td className="px-6 py-5 text-sm font-bold text-gray-600">{new Date(v.fecha_entrada).toLocaleDateString()}</td>
                        <td className="px-6 py-5">
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getStatusBadge(v.estado, v.tipo_vale)}`}>
                              {v.tipo_vale === ValeType.VENTA_DIRECTA ? 'VENTA DIRECTA' : v.estado}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-800 px-2 py-1 rounded-md border border-gray-200">
                             {v.variedad}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-[#111111]">{v.kilos_netos.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-bold text-gray-600">
                           {v.tipo_vale === ValeType.VENTA_DIRECTA 
                              ? <span className="text-gray-300 italic">--</span> 
                              : (v.analitica.rendimiento_graso > 0 ? `${v.analitica.rendimiento_graso}%` : <span className="text-gray-300 italic">Pendiente</span>)
                           }
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-gray-600">
                           {v.tipo_vale === ValeType.VENTA_DIRECTA
                              ? <span className="text-gray-300 italic">--</span>
                              : (v.analitica.acidez > 0 ? `${v.analitica.acidez}º` : <span className="text-gray-300 italic">--</span>)
                           }
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-[#111111]">
                           {v.tipo_vale === ValeType.VENTA_DIRECTA
                              ? <span className="text-gray-300 italic">--</span>
                              : (v.analitica.rendimiento_graso > 0 
                                  ? Math.round(v.kilos_netos * v.analitica.rendimiento_graso / 100).toLocaleString()
                                  : <span className="text-gray-300 italic">--</span>)
                           }
                        </td>
                        <td className="px-6 py-5 text-center">
                           <button 
                              onClick={() => onViewVale(v)}
                              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-black hover:border-black transition-all"
                           >
                              <Eye size={16} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
