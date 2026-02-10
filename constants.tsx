
import React from 'react';
import { LayoutDashboard, Users, FileText, Factory, Warehouse, ShoppingCart, Search, Settings, Building2, Package, Boxes } from 'lucide-react';
import { UserRole } from './types';

export const MUNICIPALITIES = [
  'Úbeda', 'Baeza', 'Martos', 'Alcalá la Real', 'Jaén', 'Mancha Real', 'Torredonjimeno', 'Andújar'
];

// Icono personalizado de Aceituna
const OliveIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.5 22c4.694 0 8.5-3.582 8.5-8s-3.806-8-8.5-8S4 9.582 4 14s3.806 8 8.5 8z" />
    <path d="M12.5 6V2" />
    <path d="M12.5 2L15 4.5" />
  </svg>
);

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> }, // Todos
  { id: 'producers', label: 'Productores', icon: <Users size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'customers', label: 'Clientes', icon: <Building2 size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'vales', label: 'Vales', icon: <FileText size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'milling', label: 'Molturación', icon: <Factory size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'cellar', label: 'Bodega', icon: <Warehouse size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'packaging', label: 'Envasadora', icon: <Package size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'auxiliary', label: 'Almacén Auxiliares', icon: <Boxes size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'direct_sales', label: 'Venta de Aceituna Directa', icon: <OliveIcon size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'sales', label: 'Ventas', icon: <ShoppingCart size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'traceability', label: 'Trazabilidad', icon: <Search size={20} /> }, // Todos
  { id: 'config', label: 'Configuración', icon: <Settings size={20} />, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
];

export const LIME_ACCENT = '#D9FF66';
