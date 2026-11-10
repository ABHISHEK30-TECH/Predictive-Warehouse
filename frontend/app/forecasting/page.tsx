'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Product, Forecast } from '../../types';
import {
  TrendingUp,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [horizonDays, setHorizonDays] = useState<7 | 30 | 90>(30);
  const [method, setMethod] = useState<'SEASONAL' | 'MOVING_AVERAGE'>('SEASONAL');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const prodRes = await api.get('/products');
        const list = prodRes.data.data;
        setProducts(list);
        if (list.length > 0) {
          setSelectedProductId(list[0]._id);
        }
      } catch (err: any) {
        console.error('Error fetching products for forecasting:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch forecast analytics for selected product
  const fetchAnalytics = async (prodId: string, horizon: number, meth: string) => {
    if (!prodId) return;
    setRecalculating(true);
    try {
      // First ensure forecast is generated with selected horizon and method
      await api.post('/forecasts/generate', {
        productId: prodId,
        horizonDays: horizon,
        method: meth,
      });

      const res = await api.get(`/forecasts/${prodId}`);
      setAnalytics(res.data.data);
    } catch (err: any) {
      console.error('Failed to generate forecast:', err);
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchAnalytics(selectedProductId, horizonDays, method);
    }
  }, [selectedProductId, horizonDays, method]);

  // Combine historical demand and predicted demand for unified chart view
  const historical = analytics?.historicalDemand || [];
  const predicted = analytics?.predictedDemand || [];

  const combinedChartData = [
    ...historical.slice(-14).map((h: any) => ({
      date: h.date.substring(5),
      actual: h.quantity,
      predicted: null,
      type: 'Historical Actual',
    })),
    ...predicted.slice(0, horizonDays === 7 ? 7 : 14).map((p: any) => ({
      date: p.date.substring(5),
      actual: null,
      predicted: p.predictedQuantity,
      type: 'Predicted Demand',
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Demand Forecasting Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">
            Predict product consumption trajectories through Moving Average and Seasonal cyclical multipliers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analytics?.summary?.isBaselineFallback ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Limited History: Baseline Fallback</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Confidence Score: {analytics?.summary?.confidenceScore || 90}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel: Product Picker, Horizon, Method */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Product Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Target Product SKU</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Horizon Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Forecasting Horizon Window</label>
          <div className="grid grid-cols-3 gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setHorizonDays(days as any)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                  horizonDays === days
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Algorithm Approach Switch */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Forecasting Engine Methodology</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod('SEASONAL')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                method === 'SEASONAL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seasonal Model</span>
            </button>
            <button
              onClick={() => setMethod('MOVING_AVERAGE')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                method === 'MOVING_AVERAGE'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Moving Avg</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Unified Historical vs Predicted Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Demand Transition: Past 14-Day Actuals &rarr; Next {horizonDays}-Day Predicted Demand
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical consumption telemetry seamlessly joined with algorithmic projection curve.
            </p>
          </div>
          {recalculating && (
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Computing Mathematical Model...</span>
            </div>
          )}
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedChartData}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
              <Area
                type="monotone"
                dataKey="actual"
                name="Historical Actual Sales (Units)"
                stroke="#475569"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#actualGradient)"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                name="Predicted Trajectory (Units)"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#predGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Parameters & Seasonal Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Baseline Daily Demand
          </span>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {analytics?.summary?.baselineDailyDemand || 0}{' '}
            <span className="text-sm font-normal text-slate-500">units/day</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Calculated from rolling 30-day historical warehouse inventory consumption records.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Horizon Consumption
          </span>
          <p className="text-3xl font-bold text-blue-600 tracking-tight">
            {analytics?.summary?.totalPredicted30Days || 0}{' '}
            <span className="text-sm font-normal text-blue-400">units total</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Cumulative stock required to satisfy consumer demand across the {horizonDays}-day runway.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Seasonal Multiplier Effect
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-bold text-indigo-600 tracking-tight">
              {method === 'SEASONAL' ? 'Active' : 'Disabled'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              {method}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Weights day-of-week surges (Mon/Thu high velocity, Sat/Sun rest).
          </p>
        </div>
      </div>
    </div>
  );
}
