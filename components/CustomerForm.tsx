import React, { useState } from 'react';
import { Customer, CustomerType, CustomerStatus } from '../types';
import { X, User, FileText, MapPin, Phone, Mail, CheckCircle2, Building2 } from 'lucide-react';

interface CustomerFormProps {
  onSave: (customer: Customer) => void;
  onCancel: () => void;
  initialData?: Customer | null;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: initialData?.name || '',
    cif: initialData?.cif || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    type: initialData?.type || CustomerType.MAYORISTA,
    status: initialData?.status || CustomerStatus.ACTIVE
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.cif) {
      onSave({
        id: initialData?.id || Date.now().toString(),
        almazaraId: initialData?.almazaraId || 'private',
        name: formData.name,
        cif: formData.cif,
        address: formData.address || '',
        phone: formData.phone,
        email: formData.email,
        type: formData.type || CustomerType.MAYORISTA,
        status: formData.status || CustomerStatus.ACTIVE
      });
    }
  };

  const inputClasses = "w-full bg-[#111111] border-2 border-transparent focus:border-[#D9FF66] rounded-[20px] px-5 py-3.5 text-sm font-bold text-white transition-all outline-none placeholder:text-gray-600";
  const labelClasses = "text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="bg-white rounded-[40px] custom-shadow p-8 max-w-2xl mx-auto border border-gray-100 animate-in zoom-in duration-300 w-full relative">
      <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#111111] tracking-tighter uppercase leading-none">
            {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <p className="text-gray-400 font-medium text-sm mt-2">
            Ficha de datos comerciales y facturación
          </p>
        </div>
        <button onClick={onCancel} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-all">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          {/* Tipo de Cliente */}
          <div>
            <label className={labelClasses}>Tipo de Cliente</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {Object.values(CustomerType).map((type) => (
                 <button
                   key={type}
                   type="button"
                   onClick={() => setFormData({ ...formData, type })}
                   className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                     formData.type === type 
                       ? 'bg-[#111111] text-[#D9FF66] border-[#111111]' 
                       : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   {type}
                 </button>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
               <label className={labelClasses}>Razón Social / Nombre</label>
               <div className="relative">
                 <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                 <input
                   type="text"
                   required
                   placeholder="Nombre del cliente o empresa"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                   className={`${inputClasses} pl-12 text-lg`}
                 />
               </div>
            </div>

            <div>
               <label className={labelClasses}>CIF / DNI</label>
               <div className="relative">
                 <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                 <input
                   type="text"
                   required
                   placeholder="B-12345678"
                   value={formData.cif}
                   onChange={(e) => setFormData({...formData, cif: e.target.value.toUpperCase()})}
                   className={`${inputClasses} pl-12`}
                 />
               </div>
            </div>

            <div>
               <label className={labelClasses}>Teléfono</label>
               <div className="relative">
                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                 <input
                   type="tel"
                   placeholder="600 000 000"
                   value={formData.phone}
                   onChange={(e) => setFormData({...formData, phone: e.target.value})}
                   className={`${inputClasses} pl-12`}
                 />
               </div>
            </div>

            <div className="md:col-span-2">
               <label className={labelClasses}>Dirección Completa</label>
               <div className="relative">
                 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                 <input
                   type="text"
                   placeholder="C/ Ejemplo 123, Ciudad, Provincia"
                   value={formData.address}
                   onChange={(e) => setFormData({...formData, address: e.target.value})}
                   className={`${inputClasses} pl-12`}
                 />
               </div>
            </div>

            <div className="md:col-span-2">
               <label className={labelClasses}>Correo Electrónico</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                 <input
                   type="email"
                   placeholder="facturacion@cliente.com"
                   value={formData.email}
                   onChange={(e) => setFormData({...formData, email: e.target.value})}
                   className={`${inputClasses} pl-12`}
                 />
               </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!formData.name || !formData.cif}
            className="flex-[2] py-4 rounded-[24px] font-black text-xs uppercase tracking-widest bg-[#D9FF66] text-black hover:bg-[#cbf550] shadow-xl shadow-[#D9FF66]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={18} /> Guardar Cliente
          </button>
        </div>
      </form>
    </div>
  );
};