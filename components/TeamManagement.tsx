
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Users, Mail, Shield, Plus, X, Trash2 } from 'lucide-react';

interface TeamManagementProps {
  users: User[];
  onInvite: (email: string, role: UserRole) => void;
  onRemove: (userId: string) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ users, onInvite, onRemove }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.OPERATOR);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if(inviteEmail) {
       onInvite(inviteEmail, inviteRole);
       setInviteEmail('');
       setShowInviteForm(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
       <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#F9FAF9]">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#111111] text-white rounded-lg"><Users size={20} /></div>
             <div>
                <h3 className="text-lg font-black uppercase text-[#111111]">Equipo & Accesos</h3>
                <p className="text-xs text-gray-400 font-medium">Gestiona quién puede acceder a tu almazara</p>
             </div>
          </div>
          <button 
             onClick={() => setShowInviteForm(true)}
             className="flex items-center gap-2 bg-[#111111] text-[#D9FF66] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
          >
             <Plus size={16} /> Invitar Usuario
          </button>
       </div>

       {showInviteForm && (
          <div className="p-6 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-top-2">
             <form onSubmit={handleInvite} className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                   <input 
                      type="email" 
                      required
                      placeholder="usuario@empresa.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                   />
                </div>
                <div className="w-40 space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Rol</label>
                   <select 
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                   >
                      <option value={UserRole.ADMIN}>Administrador</option>
                      <option value={UserRole.OPERATOR}>Operario</option>
                      <option value={UserRole.VIEWER}>Solo Lectura</option>
                   </select>
                </div>
                <button type="submit" className="px-6 py-2 bg-black text-white rounded-xl font-bold text-sm h-[38px]">Enviar</button>
                <button type="button" onClick={() => setShowInviteForm(false)} className="p-2 bg-gray-200 rounded-xl h-[38px]"><X size={20} /></button>
             </form>
          </div>
       )}

       <div className="p-4">
          {users.map(user => (
             <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 uppercase">
                      {user.fullName ? user.fullName.charAt(0) : user.email.charAt(0)}
                   </div>
                   <div>
                      <p className="text-sm font-black text-[#111111]">{user.fullName || 'Usuario Sin Nombre'}</p>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1"><Mail size={12} /> {user.email}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                      user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                      user.role === UserRole.OPERATOR ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                   }`}>
                      <Shield size={12} /> {user.role}
                   </span>
                   {user.role !== UserRole.ADMIN && (
                      <button onClick={() => onRemove(user.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                         <Trash2 size={18} />
                      </button>
                   )}
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};
