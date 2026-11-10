'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PurchaseOrder, POStatus, Supplier, Product } from '../../types';
import {
  ShoppingCart,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  PackageCheck,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function PurchaseOrdersPage() {
  const { user, hasRole } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // New PO Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(50);
  const [poNotes, setPoNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchase-orders', {
        params: { status: statusFilter || undefined },
      });
      setOrders(res.data.data);
    } catch (err: any) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [statusFilter]);

  const handleOpenCreateModal = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers', { params: { approved: true, active: true } }),
        api.get('/products'),
      ]);
      setSuppliers(supRes.data.data);
      setProducts(prodRes.data.data);
      if (supRes.data.data.length > 0) setSelectedSupplierId(supRes.data.data[0]._id);
      if (prodRes.data.data.length > 0) setSelectedProductId(prodRes.data.data[0]._id);
      setShowCreateModal(true);
    } catch (err: any) {
      alert('Failed to load suppliers/products');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !selectedProductId) return;

    setIsSubmitting(true);
    try {
      const prod = products.find((p) => p._id === selectedProductId);
      await api.post('/purchase-orders', {
        supplierId: selectedSupplierId,
        items: [
          {
            productId: selectedProductId,
            quantity: Number(orderQuantity),
            unitPrice: prod?.unitPrice || 10,
          },
        ],
        notes: poNotes,
      });

      setShowCreateModal(false);
      fetchPurchaseOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Order Operations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reorder recommendation drafts, multi-tiered manager approval authorizations, and supplier electronic EDI submission.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPurchaseOrders}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Draft New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { label: 'All Orders', value: '' },
          { label: 'Drafts', value: 'DRAFT' },
          { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
          { label: 'Approved', value: 'APPROVED' },
          { label: 'Submitted to Supplier', value: 'SUBMITTED' },
          { label: 'Received / Replenished', value: 'RECEIVED' },
          { label: 'Rejected', value: 'REJECTED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-xl font-semibold border transition shrink-0 ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">PO Identifier</th>
                <th className="py-3 px-4">Target Supplier</th>
                <th className="py-3 px-3">Order Items</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Created By</th>
                <th className="py-3 px-3">Expected Fulfillment</th>
                <th className="py-3 px-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading purchase order queue...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No purchase orders in this status category.
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const sup = po.supplierId as any;
                  const creator = po.createdBy as any;
                  return (
                    <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/purchase-orders/${po._id}`}
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          <span>{po.purchaseOrderNumber}</span>
                          {po.isAutoRecommended && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-200">
                              AUTO
                            </span>
                          )}
                        </Link>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {sup?.name || 'Assigned Supplier'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {po.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 text-sm">
                        ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            po.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : po.status === 'SUBMITTED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : po.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : po.status === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : po.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {creator?.name || 'Staff User'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/purchase-orders/${po._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Workflow</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual PO Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Draft Purchase Order
            </h2>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pre-Approved Supplier *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Reliability: {s.reliabilityScore}%, Lead Time: {s.leadTimeDays}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item to Reorder *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} - {p.name} (On-hand: {p.currentStock}, ${p.unitPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Procurement Notes</label>
                <textarea
                  rows={3}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Justification for order..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  {isSubmitting ? 'Creating Draft...' : 'Create PO Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
