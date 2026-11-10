'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StockoutRisk, RiskLevel } from '../../types';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StockoutPredictionPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<StockoutRisk[]>([]);
  const [summary, setSummary] = useState<any>({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPOId, setGeneratingPOId] = useState<string | null>(null);

  const fetchStockoutRisks = async (recalc = false) => {
    try {
      if (recalc) setRefreshing(true);
      else setLoading(true);

      const res = await api.get('/stockout', {
        params: {
          level: filterLevel || undefined,
          refresh: recalc ? 'true' : 'false',
        },
      });
      setRisks(res.data.data);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load stockout risks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStockoutRisks();
  }, [filterLevel]);

  const handleCreateDraftFromRisk = async (risk: StockoutRisk) => {
    const prod = risk.productId as any;
    if (!prod) return;
    setGeneratingPOId(risk._id);

    try {
      // Find eligible supplier
      const supId = prod.supplierIds?.[0]?._id || prod.supplierIds?.[0];
      if (!supId) {
        alert('No supplier linked to this product. Please assign a supplier first.');
        return;
      }

      const res = await api.post('/purchase-orders', {
        supplierId: supId,
        items: [
          {
            productId: prod._id,
            quantity: risk.recommendedReorderQuantity || prod.safetyStock * 2,
            unitPrice: prod.unitPrice,
          },
        ],
        notes: `Emergency replenishment drafted from Stockout Radar. Reason: ${risk.riskExplanation}`,
      });

      router.push(`/purchase-orders/${res.data.data._id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error generating purchase order draft');
    } finally {
      setGeneratingPOId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stockout Prediction Radar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Predictive lead-time risk scoring, runway depletion modeling, and automated reorder triggers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStockoutRisks(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Recalculate All Risks</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterLevel(filterLevel === 'CRITICAL' ? '' : 'CRITICAL')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterLevel === 'CRITICAL'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase">Critical Risks</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{summary.CRITICAL}</p>
          <span className="text-[10px] text-rose-600 font-medium">Depletion &lt; Lead Time</span>
        </button>

        <button
          onClick={() => setFilterLevel(filterLevel === 'HIGH' ? '' : 'HIGH')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterLevel === 'HIGH'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase">High Risks</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{summary.HIGH}</p>
          <span className="text-[10px] text-amber-600 font-medium">Within Reorder Threshold</span>
        </button>

        <button
          onClick={() => setFilterLevel(filterLevel === 'MEDIUM' ? '' : 'MEDIUM')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterLevel === 'MEDIUM'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase">Moderate Risks</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.MEDIUM}</p>
          <span className="text-[10px] text-blue-600 font-medium">Approaching Buffer Limits</span>
        </button>

        <button
          onClick={() => setFilterLevel(filterLevel === 'LOW' ? '' : 'LOW')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterLevel === 'LOW'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase">Optimal Runway</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{summary.LOW}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Healthy Coverage</span>
        </button>
      </div>

      {/* Main Stockout Predictions List / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
            <span>Evaluating warehouse telemetry & stockout probabilities...</span>
          </div>
        ) : risks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No stockout risks matching the current filter.
          </div>
        ) : (
          risks.map((risk) => {
            const prod = risk.productId as any;
            if (!prod) return null;

            return (
              <div
                key={risk._id}
                className={`bg-white rounded-2xl p-5 border transition shadow-xs ${
                  risk.riskLevel === 'CRITICAL'
                    ? 'border-rose-300 bg-gradient-to-r from-rose-50/40 to-white'
                    : risk.riskLevel === 'HIGH'
                    ? 'border-amber-300 bg-gradient-to-r from-amber-50/30 to-white'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Item Info & Risk Badge */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          risk.riskLevel === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : risk.riskLevel === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : risk.riskLevel === 'MEDIUM'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {risk.riskLevel} RISK
                      </span>
                      <h2 className="text-sm font-bold text-slate-900">{prod.name}</h2>
                      <span className="text-xs font-mono text-slate-400">({prod.sku})</span>
                    </div>

                    {/* Detailed AI Risk Explanation */}
                    <p className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      {risk.riskExplanation}
                    </p>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0 lg:w-96">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">On-Hand</span>
                      <span className="text-sm font-bold text-slate-900">{risk.currentStock}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Runway Days</span>
                      <span
                        className={`text-sm font-bold ${
                          risk.daysUntilStockout <= risk.leadTimeDays ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {risk.daysUntilStockout} d
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Lead Time</span>
                      <span className="text-sm font-bold text-slate-800">{risk.leadTimeDays} d</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Recommended</span>
                      <span className="text-sm font-bold text-blue-600">+{risk.recommendedReorderQuantity}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center justify-end">
                    {risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH' ? (
                      <button
                        onClick={() => handleCreateDraftFromRisk(risk)}
                        disabled={generatingPOId === risk._id}
                        className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{generatingPOId === risk._id ? 'Drafting...' : 'Generate PO Draft'}</span>
                      </button>
                    ) : (
                      <Link
                        href={`/forecasting`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                      >
                        <span>Forecast Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
