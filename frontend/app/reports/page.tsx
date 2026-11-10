'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BarChart3,
  Download,
  DollarSign,
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Calendar,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ReportsPage() {
  const [activeReportTab, setActiveReportTab] = useState<'inventory' | 'stockout' | 'purchaseOrders'>('inventory');
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [stockoutReport, setStockoutReport] = useState<any>(null);
  const [poReport, setPoReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [invRes, stockRes, poRes] = await Promise.all([
        api.get('/reports/inventory'),
        api.get('/reports/stockout'),
        api.get('/reports/purchase-orders'),
      ]);
      setInventoryReport(invRes.data.data);
      setStockoutReport(stockRes.data.data);
      setPoReport(poRes.data.data);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // CSV Export utility
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReportTab === 'inventory') {
      csvContent += 'SKU,Name,Category,Current Stock,Unit Price,Inventory Value,Status\n';
      inventoryReport?.products?.forEach((p: any) => {
        csvContent += `"${p.sku}","${p.name}","${p.category}",${p.currentStock},${p.unitPrice},${p.inventoryValue},"${p.status}"\n`;
      });
    } else if (activeReportTab === 'stockout') {
      csvContent += 'SKU,Product Name,Risk Level,Current Stock,Days Until Stockout,Recommended Reorder Qty,Risk Explanation\n';
      stockoutReport?.riskList?.forEach((r: any) => {
        const prod = r.productId;
        csvContent += `"${prod?.sku}","${prod?.name}","${r.riskLevel}",${r.currentStock},${r.daysUntilStockout},${r.recommendedReorderQuantity},"${r.riskExplanation.replace(/"/g, '""')}"\n`;
      });
    } else if (activeReportTab === 'purchaseOrders') {
      csvContent += 'PO Number,Supplier,Total Amount,Status,Created At,Expected Delivery\n';
      poReport?.orders?.forEach((po: any) => {
        csvContent += `"${po.purchaseOrderNumber}","${po.supplierId?.name}",${po.totalAmount},"${po.status}","${po.createdAt}","${po.expectedDeliveryDate}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeReportTab}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare category valuation bar chart data
  const categoryChartData = Object.entries(inventoryReport?.categoryBreakdown || {}).map(
    ([category, data]: [string, any]) => ({
      category: category.split(' ')[0], // abbreviation for clean labels
      fullName: category,
      value: Math.round(data.value),
      units: data.stock,
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Analytics & Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit inventory valuation, risk velocity distributions, supplier procurement spend, and CSV exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh reports"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Active Report (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('inventory')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeReportTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Inventory Asset Valuation
        </button>
        <button
          onClick={() => setActiveReportTab('stockout')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeReportTab === 'stockout'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Stockout Velocity Audit
        </button>
        <button
          onClick={() => setActiveReportTab('purchaseOrders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeReportTab === 'purchaseOrders'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Procurement Spend & POs
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Compiling enterprise analytical models...</span>
        </div>
      ) : activeReportTab === 'inventory' ? (
        /* Inventory Valuation Report */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Portfolio Asset Value
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${inventoryReport?.summary?.totalValue?.toLocaleString()}
              </p>
              <span className="text-xs text-emerald-600 font-medium">100% current on-shelf inventory</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Cumulative Physical Units
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inventoryReport?.summary?.totalStock?.toLocaleString()} units
              </p>
              <span className="text-xs text-slate-500 font-medium">Across all regional warehouses</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Tracked Product SKUs
              </span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {inventoryReport?.summary?.totalProducts} SKUs
              </p>
              <span className="text-xs text-slate-500 font-medium">Active operational catalog</span>
            </div>
          </div>

          {/* Category Valuation Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Inventory Valuation by Product Category ($)</h2>
            <p className="text-xs text-slate-500 mb-4">Capital allocation across warehouse product groupings</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" name="Valuation ($)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Product Valuation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Current Stock</th>
                    <th className="py-3 px-3 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Extended Value</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryReport?.products?.map((p: any) => (
                    <tr key={p.sku} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.sku}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 text-slate-600">{p.category}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{p.currentStock}</td>
                      <td className="py-3 px-3 text-right text-slate-600">${p.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${p.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Critical Stockout Risk'
                              ? 'bg-rose-100 text-rose-700'
                              : p.status === 'Low Stock'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeReportTab === 'stockout' ? (
        /* Stockout Report */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-rose-600 uppercase">Critical Depletions</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">{stockoutReport?.summary?.critical}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-amber-600 uppercase">High Risk SKUs</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stockoutReport?.summary?.high}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-blue-600 uppercase">Medium Risk</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stockoutReport?.summary?.medium}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Reorder Units Req.</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                +{stockoutReport?.summary?.totalRecommendedReorderUnits} units
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3 text-center">Runway</th>
                    <th className="py-3 px-3 text-center">Lead Time</th>
                    <th className="py-3 px-3 text-center">Recommended Order</th>
                    <th className="py-3 px-3 text-center">Risk Level</th>
                    <th className="py-3 px-4">Root Cause Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockoutReport?.riskList?.map((r: any) => (
                    <tr key={r._id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{r.productId?.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{r.productId?.sku}</p>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{r.daysUntilStockout} days</td>
                      <td className="py-3 px-3 text-center text-slate-600">{r.leadTimeDays} days</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">
                        +{r.recommendedReorderQuantity}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.riskLevel === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700'
                              : r.riskLevel === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {r.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-md">{r.riskExplanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Purchase Orders Report */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total PO Commitment</span>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                ${poReport?.summary?.totalSpend?.toLocaleString()}
              </p>
              <span className="text-xs text-slate-500">Across {poReport?.summary?.totalOrders} total purchase orders</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Orders by State</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(poReport?.summary?.statusBreakdown || {}).map(([st, data]: [string, any]) => (
                  <span
                    key={st}
                    className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    {st}: {data.count} (${data.totalAmount.toLocaleString()})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Created Date</th>
                    <th className="py-3 px-3">Expected Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poReport?.orders?.map((po: any) => (
                    <tr key={po._id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{po.purchaseOrderNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{po.supplierId?.name}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{new Date(po.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
