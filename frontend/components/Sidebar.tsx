'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Truck,
  BarChart3,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigation = [
    { name: 'Executive Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory Management', href: '/inventory', icon: Boxes },
    { name: 'Demand Forecasting', href: '/forecasting', icon: TrendingUp },
    { name: 'Stockout Prediction', href: '/stockout', icon: AlertTriangle, badge: 'AI Risk' },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
    { name: 'Supplier Directory', href: '/suppliers', icon: Truck },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-sm block">STOCKOUT AGENT</span>
          <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase block">Warehouse ERP Intel</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Core Operations
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role / User Badge Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'WH'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-white truncate">{user?.name || 'Authorized User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400 truncate">
                {user?.role || 'Inventory Staff'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
