
import React, { useState } from 'react';
import { LIME_ACCENT } from '../constants';
import { Droplets, ArrowRight, ShieldCheck, Globe, Info } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string, password?: string) => void;
  onRegister: (companyName: string, email: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('123456');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const inputClasses = "w-full bg-gray-50 border-2 border-gray-100 focus:border-[#111111] rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all text-[#111111] placeholder:text-gray-400";

  return (
    <div className="min-h-screen bg-[#F4F7F4] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row">
        
        <div className="bg-[#111111] text-white p-12 md:w-1/2 flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-black text-xl" style={{ backgroundColor: LIME_ACCENT }}>
                    A4
                 </div>
                 <span className="text-2xl font-bold tracking-tight">ALMAZARA 4.0</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6">
                 Uso Privado <br />
                 <span style={{ color: LIME_ACCENT }}>Asegurado.</span>
              </h2>
           </div>
           <div className="absolute -bottom-20 -right-20 opacity-10">
              <Droplets size={300} />
           </div>
        </div>

        <div className="p-12 md:w-1/2 flex flex-col justify-center bg-white">
           <div className="mb-8">
              <h3 className="text-3xl font-black text-[#111111] uppercase tracking-tighter mb-2">Acceso Privado</h3>
              <p className="text-gray-400 font-medium">Introduce las credenciales de gestión.</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email de Administrador</label>
                 <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                 <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} />
              </div>

              <button type="submit" className="w-full py-5 bg-[#D9FF66] hover:bg-[#cbf550] text-black rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 mt-4">
                 Iniciar Sesión <ArrowRight size={16} />
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};
