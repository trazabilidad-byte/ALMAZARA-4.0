import React, { useState } from 'react';
import { LIME_ACCENT } from '../constants';
import { Droplets, ArrowRight, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { signIn, getUserProfile } from '../src/lib/supabase';
import { UserRole, AuthorizedUser } from '../types';

interface AuthScreenProps {
   onLogin: (user: any) => void;
   onRegister?: (companyName: string, email: string) => void;
   authorizedUsers: AuthorizedUser[];
   almazaraId: string;
}

const getUnifiedAlmazaraId = (email: string, originalId: string) => {
   // LISTA BLANCA DE CORREOS QUE DEBEN COMPARTIR LA MISMA ALMAZARA
   const UNIFIED_EMAILS = [
      'dennisdiazdiaz19@gmail.com',
      'trazabilidadobeoliva@gmail.com',
      'dennisdiazdiaz@gmail.com'
   ];

   // ID MAESTRO FIJO PARA ESTOS USUARIOS
   const MASTER_TENANT_ID = '34f0e636-681b-4b10-9017-02e5ca056c01';

   if (UNIFIED_EMAILS.some(e => email.toLowerCase().includes(e.toLowerCase().split('@')[0]))) {
      console.log('🔄 Unificando ID de Almazara para admin:', email);
      return MASTER_TENANT_ID;
   }
   return originalId;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, authorizedUsers, almazaraId }) => {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
         // 1. LOGIN LOCAL (Prioridad Alta)
         console.log('🔐 Intentando login local para:', email);
         const localUser = authorizedUsers?.find(u => u.email.toLowerCase() === email.toLowerCase());

         if (localUser && localUser.password && localUser.password === password) {
            console.log('✅ Login local exitoso:', localUser.name);
            onLogin({
               id: localUser.id,
               email: localUser.email,
               fullName: localUser.name,
               role: localUser.role,
               almazaraId: getUnifiedAlmazaraId(email, almazaraId) // <--- FORZAR ID AQUÍ
            });
            return;
         }

         // 2. FALLBACK A SUPABASE
         console.log('☁️ Intentando login en Supabase...');
         const { data, error } = await signIn(email, password);
         if (error) throw error;

         if (data.user) {
            const { data: profile, error: profileError } = await getUserProfile(data.user.id);

            if (profileError || !profile) {
               // Usuario sin perfil en app_users -> Asignar ID basado en email o default
               const forcedId = getUnifiedAlmazaraId(email, 'unknown');
               onLogin({
                  id: data.user.id,
                  email: data.user.email,
                  fullName: 'Usuario',
                  role: UserRole.OPERATOR,
                  almazaraId: forcedId
               });
            } else {
               // Usuario con perfil -> Verificar si necesita unificación
               const finalId = getUnifiedAlmazaraId(profile.email, profile.almazara_id);
               onLogin({
                  id: profile.id,
                  email: profile.email,
                  fullName: profile.full_name,
                  role: profile.role as UserRole,
                  almazaraId: finalId
               });
            }
         }
      } catch (err: any) {
         setError(err.message || 'Error de autenticación. Verifica tus credenciales.');
      } finally {
         setIsLoading(false);
      }
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
                     Acceso <br />
                     <span style={{ color: LIME_ACCENT }}>Restringido.</span>
                  </h2>
                  <p className="text-gray-400 font-medium">
                     Sistema de gestión exclusiva. <br />Solo personal autorizado.
                  </p>
               </div>
               <div className="absolute -bottom-20 -right-20 opacity-10">
                  <Droplets size={300} />
               </div>
            </div>

            <div className="p-12 md:w-1/2 flex flex-col justify-center bg-white">
               <div className="mb-8">
                  <h3 className="text-3xl font-black text-[#111111] uppercase tracking-tighter mb-2">
                     Iniciar Sesión
                  </h3>
                  <p className="text-gray-400 font-medium flex items-center gap-2">
                     <Lock size={16} /> Acceso seguro
                  </p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Corporativo</label>
                     <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} placeholder="usuario@almazara.com" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                     <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} minLength={6} placeholder="••••••••" />
                  </div>

                  {error && (
                     <div className="text-xs font-bold p-3 rounded-xl bg-red-50 text-red-700 flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                     </div>
                  )}

                  <button
                     type="submit"
                     disabled={isLoading}
                     className="w-full py-5 bg-[#D9FF66] hover:bg-[#cbf550] text-black rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                  >
                     {isLoading ? 'Verificando...' : 'Entrar al Sistema'} <ArrowRight size={16} />
                  </button>


               </form>
            </div>
         </div>
      </div>
   );
};
