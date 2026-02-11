import React, { useState } from 'react';
import { Producer, ProducerStatus } from '../types';
import { X, User, FileText, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';

interface ProducerFormProps {
  onSave: (producer: Producer) => void;
  onCancel: () => void;
  initialData?: Producer | null;
}

export const ProducerForm: React.FC<ProducerFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Producer>>({
    name: initialData?.name || '',
    nif: initialData?.nif || '',
    municipality: initialData?.municipality || '',
    province: initialData?.province || '',
    zipCode: initialData?.zipCode || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.nif) {
      onSave({
        id: initialData?.id || '',
        almazaraId: initialData?.almazaraId || 'unknown',
        name: formData.name,
        nif: formData.nif,
        municipality: formData.municipality || '',
        province: formData.province,
        zipCode: formData.zipCode,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        status: initialData?.status || ProducerStatus.ACTIVE
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
            {initialData ? 'Editar Socio' : 'Nuevo Productor'}
          </h2>
          <p className="text-gray-400 font-medium text-sm mt-2">
            Ficha de datos maestros del agricultor
          </p>
        </div>
        <button onClick={onCancel} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-all">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          {/* Datos Identificativos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={labelClasses}>Razón Social / Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Ej: Agrícola Hermanos Pérez S.L."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`${inputClasses} pl-12 text-lg`}
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>NIF / CIF</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  required
                  placeholder="B-12345678"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value.toUpperCase() })}
                  className={`${inputClasses} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Teléfono de Contacto</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="tel"
                  placeholder="600 000 000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`${inputClasses} pl-12`}
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-5">
            <h3 className="text-xs font-black text-[#111111] uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} /> Datos de Localización
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-3">
                <label className={labelClasses}>Dirección Postal</label>
                <input
                  type="text"
                  placeholder="C/ Mayor, 45"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Municipio</label>
                <input
                  type="text"
                  placeholder="Úbeda"
                  value={formData.municipality}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Provincia</label>
                <input
                  type="text"
                  placeholder="Jaén"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>C. Postal</label>
                <input
                  type="text"
                  placeholder="23400"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Correo Electrónico (Para notificaciones)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                placeholder="contacto@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`${inputClasses} pl-12`}
              />
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
            disabled={!formData.name || !formData.nif}
            className="flex-[2] py-4 rounded-[24px] font-black text-xs uppercase tracking-widest bg-[#D9FF66] text-black hover:bg-[#cbf550] shadow-xl shadow-[#D9FF66]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={18} /> Guardar Ficha
          </button>
        </div>
      </form>
    </div>
  );
};