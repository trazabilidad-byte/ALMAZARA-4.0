
import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Check, ArrowRight, Layout, Database, Sliders, Building2, Droplets } from 'lucide-react';

interface OnboardingWizardProps {
  initialConfig: AppConfig;
  onComplete: (config: AppConfig, tanksCount: number) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ initialConfig, onComplete }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [tanksCount, setTanksCount] = useState(12); // Default 12 tanks

  const nextStep = () => setStep(step + 1);
  
  const handleFinish = () => {
    onComplete(config, tanksCount);
  };

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-6 text-white">
       <div className="w-full max-w-3xl">
          {/* PROGRESS */}
          <div className="flex justify-between mb-12 relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -z-0"></div>
             {[1, 2, 3].map(s => (
                <div key={s} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${step >= s ? 'bg-[#D9FF66] text-black scale-110' : 'bg-[#222] text-gray-500 border border-white/10'}`}>
                   {step > s ? <Check size={16} /> : s}
                </div>
             ))}
          </div>

          <div className="bg-[#1a1a1a] p-10 rounded-[40px] border border-white/5 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
             
             {/* STEP 1: IDENTITY */}
             {step === 1 && (
                <div className="space-y-6">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/10 rounded-xl"><Building2 size={24} className="text-[#D9FF66]" /></div>
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-tighter">Identidad Corporativa</h2>
                         <p className="text-gray-400 text-sm">Configura los datos fiscales básicos.</p>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div>
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Razón Social</label>
                         <input 
                            type="text" 
                            value={config.companyName}
                            onChange={e => setConfig({...config, companyName: e.target.value})}
                            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 font-bold outline-none focus:border-[#D9FF66]"
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">CIF / NIF</label>
                            <input 
                               type="text" 
                               value={config.cif}
                               onChange={e => setConfig({...config, cif: e.target.value})}
                               className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 font-bold outline-none focus:border-[#D9FF66]"
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Teléfono</label>
                            <input 
                               type="text" 
                               value={config.phone}
                               onChange={e => setConfig({...config, phone: e.target.value})}
                               className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 font-bold outline-none focus:border-[#D9FF66]"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dirección Completa</label>
                         <input 
                            type="text" 
                            value={config.address}
                            onChange={e => setConfig({...config, address: e.target.value})}
                            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 font-bold outline-none focus:border-[#D9FF66]"
                         />
                      </div>
                   </div>
                   <button onClick={nextStep} className="w-full py-4 bg-white text-black font-black uppercase rounded-2xl mt-4 hover:bg-[#D9FF66] transition-colors">Continuar</button>
                </div>
             )}

             {/* STEP 2: INFRASTRUCTURE */}
             {step === 2 && (
                <div className="space-y-6">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/10 rounded-xl"><Database size={24} className="text-[#D9FF66]" /></div>
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-tighter">Infraestructura Inicial</h2>
                         <p className="text-gray-400 text-sm">Configura tu bodega automáticamente.</p>
                      </div>
                   </div>

                   <div className="bg-black p-6 rounded-3xl border border-white/10 text-center space-y-6">
                      <Droplets size={48} className="mx-auto text-gray-600" />
                      <div>
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">¿Cuántos Depósitos tiene tu bodega?</label>
                         <div className="flex items-center justify-center gap-4">
                            <button onClick={() => setTanksCount(Math.max(1, tanksCount - 1))} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl font-black hover:bg-white/20">-</button>
                            <span className="text-5xl font-black text-[#D9FF66] tabular-nums w-24">{tanksCount}</span>
                            <button onClick={() => setTanksCount(tanksCount + 1)} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl font-black hover:bg-white/20">+</button>
                         </div>
                      </div>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                         El sistema creará automáticamente {tanksCount} depósitos (D.01 a D.{tanksCount < 10 ? '0'+tanksCount : tanksCount}) con capacidad 0 para que los configures más tarde.
                      </p>
                   </div>

                   <button onClick={nextStep} className="w-full py-4 bg-white text-black font-black uppercase rounded-2xl mt-4 hover:bg-[#D9FF66] transition-colors">Generar Estructura</button>
                </div>
             )}

             {/* STEP 3: CONFIRM */}
             {step === 3 && (
                <div className="space-y-6 text-center">
                   <div className="w-24 h-24 bg-[#D9FF66] rounded-full flex items-center justify-center mx-auto mb-6 text-black shadow-[0_0_40px_rgba(217,255,102,0.3)]">
                      <Check size={48} strokeWidth={3} />
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">¡Todo Listo!</h2>
                   <p className="text-gray-400 max-w-md mx-auto">
                      Hemos configurado tu entorno aislado. Ya puedes empezar a gestionar tu almazara de forma segura y eficiente.
                   </p>
                   
                   <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mt-8 bg-black p-4 rounded-2xl border border-white/5">
                      <div>
                         <p className="text-[9px] text-gray-500 uppercase font-black">Empresa</p>
                         <p className="font-bold">{config.companyName}</p>
                      </div>
                      <div>
                         <p className="text-[9px] text-gray-500 uppercase font-black">Infraestructura</p>
                         <p className="font-bold">{tanksCount} Depósitos</p>
                      </div>
                   </div>

                   <button onClick={handleFinish} className="w-full py-5 bg-[#D9FF66] text-black font-black uppercase rounded-2xl mt-8 hover:scale-105 transition-all shadow-xl">
                      Entrar al Dashboard
                   </button>
                </div>
             )}

          </div>
       </div>
    </div>
  );
};
