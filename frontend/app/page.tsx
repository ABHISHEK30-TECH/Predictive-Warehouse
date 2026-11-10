'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardStats, AlertItem } from '../types';
import {
  Boxes,
  DollarSign,
  AlertTriangle,
  Clock,
  Truck,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/alerts'),
      ]);
      setData(statsRes.data.data);
      setAlerts(alertsRes.data.data);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const health = data?.inventoryHealth;

  const healthChartData = [
    { name: 'Optimal Stock', value: health?.healthy || 0, color: '#10b981' },
    { name: 'Reorder Warning', value: health?.warning || 0, color: '#f59e0b' },
    { name: 'Critical Risk', value: health?.critical || 0, color: '#ef4444' },
  ];

  // Prepare demand forecasting comparison chart data from sample forecasts
  const sampleForecast = data?.sampleForecasts?.[0];
  const forecastChartData = sampleForecast?.dailyPredictions?.slice(0, 14).map((p) => ({
    date: p.date.substring(5, 10),
    predicted: p.predictedQuantity,
    baseline: sampleForecast.baselineDemand,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Telemetry Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ERP warehouse inventory status, stockout prediction horizons, and purchase order workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            href="/stockout"
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md shadow-rose-600/20 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stockout Radar</span>
          </Link>
        </div>
      </div>

      {/* Critical System Alert Banner if any exist */}
      {alerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                Active Supply Chain Attention Required ({alerts.length} Flagged)
              </h2>
              <p className="text-xs text-rose-800 mt-0.5 line-clamp-1">{alerts[0].message}</p>
            </div>
          </div>
          <Link
            href={alerts[0].actionUrl}
            className="shrink-0 text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 mt-1"
          >
            {alerts[0].actionText} &rarr;
          </Link>
        </div>
      )}

      {/* 6 Key Enterprise KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Catalog SKUs</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpis?.totalProducts || 0}</p>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Monitored 24/7
          </span>
        </div>

        {/* Total Inventory Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Asset Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            ${(kpis?.totalInventoryValue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Active on-shelf value</span>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 tracking-tight">{kpis?.lowStockProducts || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">≤ Reorder Point</span>
        </div>

        {/* Predicted Stockouts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">At Risk Items</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 tracking-tight">{kpis?.predictedStockouts || 0}</p>
          <span className="text-[11px] text-rose-500 font-medium mt-1 block">
            {kpis?.criticalStockouts || 0} Critical / Emergency
          </span>
        </div>

        {/* Pending POs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Pending POs</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 tracking-tight">{kpis?.pendingPurchaseOrders || 0}</p>
          <Link href="/purchase-orders" className="text-[11px] text-blue-600 font-medium hover:underline mt-1 block">
            Review Approval &rarr;
          </Link>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pre-Approved Vendors</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpis?.activeSuppliers || 0}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Roster verified</span>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demand Forecasting & Actuals Curve (2 Cols) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">14-Day Demand Forecast vs Baseline Horizon</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic seasonal multiplier curve for top velocity SKU ({sampleForecast ? (sampleForecast.productId as any)?.name : 'Warehouse Demand'})
              </p>
            </div>
            <Link href="/forecasting" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Explore All Forecasts <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastChartData}>
                <defs>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted Daily Demand"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPredicted)"
                />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  name="Flat Baseline Demand"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Health Ratio (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Inventory Health Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time distribution across safety thresholds</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {healthChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {healthChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} SKUs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Critical Stockout Radar + Recent PO Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stockout Risks Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Critical Stockout Radar</h2>
              <p className="text-xs text-slate-500 mt-0.5">Products facing impending stock depletion</p>
            </div>
            <Link href="/stockout" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              View All &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">SKU & Item</th>
                  <th className="pb-3 text-center">On-Hand</th>
                  <th className="pb-3 text-center">Runway</th>
                  <th className="pb-3 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.topRisks?.map((risk) => {
                  const prod = risk.productId as any;
                  return (
                    <tr key={risk._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[180px]">{prod?.name || 'Product'}</p>
                        <p className="text-[10px] text-slate-400">{prod?.sku}</p>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">{risk.currentStock}</td>
                      <td className="py-3 text-center font-medium text-slate-600">
                        {risk.daysUntilStockout <= 0 ? 'Depleted' : `${risk.daysUntilStockout} days`}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            risk.riskLevel === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : risk.riskLevel === 'HIGH'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {risk.riskLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Purchase Orders & Approval Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Purchase Orders</h2>
              <p className="text-xs text-slate-500 mt-0.5">Authorization status and supplier transmission</p>
            </div>
            <Link href="/purchase-orders" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              Manage Orders &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">PO Number</th>
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3 text-center">Amount</th>
                  <th className="pb-3 text-right">Workflow State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.recentPurchaseOrders?.map((po) => {
                  const sup = po.supplierId as any;
                  return (
                    <tr key={po._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <Link
                          href={`/purchase-orders/${po._id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {po.purchaseOrderNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-700 truncate max-w-[140px]">{sup?.name || 'Assigned Vendor'}</td>
                      <td className="py-3 text-center font-bold text-slate-800">
                        ${po.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            po.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-700'
                              : po.status === 'SUBMITTED'
                              ? 'bg-purple-100 text-purple-700'
                              : po.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-700'
                              : po.status === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
