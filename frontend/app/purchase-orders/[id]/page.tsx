'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { PurchaseOrder } from '../../../types';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Send,
  PackageCheck,
  Clock,
  ShieldCheck,
  Truck,
  Building,
  Calendar,
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/purchase-orders/${id}`);
      setPo(res.data.data);
    } catch (err: any) {
      console.error('Failed to load PO:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPODetails();
  }, [id]);

  // Workflow Handlers
  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    try {
      await api.post(`/purchase-orders/${id}/submit-for-approval`, {
        comments: 'Purchase order ready for manager authorization',
      });
      await fetchPODetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error submitting for approval');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!hasRole('Admin', 'Warehouse Manager')) {
      alert('Only Admin and Warehouse Manager can approve purchase orders.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/purchase-orders/${id}/approve`, {
        comments: `Authorized by ${user?.name} (${user?.role})`,
      });
      await fetchPODetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error approving order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!hasRole('Admin', 'Warehouse Manager')) {
      alert('Only Admin and Warehouse Manager can reject purchase orders.');
      return;
    }

    if (!rejectReason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/purchase-orders/${id}/reject`, {
        reason: rejectReason,
      });
      setShowRejectModal(false);
      await fetchPODetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error rejecting order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitToSupplier = async () => {
    if (!hasRole('Admin', 'Warehouse Manager')) {
      alert('Only Admin and Warehouse Manager can transmit purchase orders to suppliers.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/purchase-orders/${id}/submit-to-supplier`);
      alert(res.data.message || 'Order transmitted to supplier successfully.');
      await fetchPODetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error transmitting to supplier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveOrder = async () => {
    if (!confirm('Mark all items on this PO as received and replenish warehouse inventory?')) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/purchase-orders/${id}/receive`);
      alert('Inventory replenished successfully.');
      await fetchPODetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error receiving order');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
        <span>Loading purchase order details...</span>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Purchase order not found.</p>
        <Link href="/purchase-orders" className="text-blue-600 underline mt-2 inline-block">
          Return to orders
        </Link>
      </div>
    );
  }

  const supplier = po.supplierId as any;
  const isManagerOrAdmin = hasRole('Admin', 'Warehouse Manager');

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchase Orders</span>
        </Link>

        {/* Status Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{po.purchaseOrderNumber}</h1>
              {po.isAutoRecommended && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  Automated Recommendation
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Created on {new Date(po.createdAt).toLocaleDateString()} by{' '}
              <span className="font-semibold text-slate-700">{po.createdBy?.name || 'Inventory Staff'}</span>
            </p>
          </div>

          {/* Workflow Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Step 1: Submit draft for approval */}
            {(po.status === 'DRAFT' || po.status === 'REJECTED') && (
              <button
                onClick={handleSubmitForApproval}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Submit for Manager Approval</span>
              </button>
            )}

            {/* Step 2: Manager Approve or Reject */}
            {po.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading || !isManagerOrAdmin}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-40"
                  title={!isManagerOrAdmin ? 'Only Admin or Warehouse Manager can approve' : ''}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorize & Approve PO</span>
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading || !isManagerOrAdmin}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                  title={!isManagerOrAdmin ? 'Only Admin or Warehouse Manager can reject' : ''}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject PO</span>
                </button>
              </>
            )}

            {/* Step 3: Transmit Approved PO to Supplier */}
            {po.status === 'APPROVED' && (
              <button
                onClick={handleSubmitToSupplier}
                disabled={actionLoading || !isManagerOrAdmin}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit PO to Supplier Integration</span>
              </button>
            )}

            {/* Step 4: Mark Received */}
            {po.status === 'SUBMITTED' && (
              <button
                onClick={handleReceiveOrder}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Mark Received & Replenish Stock</span>
              </button>
            )}
          </div>
        </div>

        {/* Supplier & Delivery Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Vendor / Supplier</span>
            <p className="font-bold text-slate-900 mt-0.5">{supplier?.name}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{supplier?.email}</p>
            <p className="text-slate-500 text-[11px]">{supplier?.phone}</p>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Supplier Compliance</span>
            <p className="font-medium text-slate-800 mt-0.5">
              Reliability Score: <span className="font-bold text-emerald-600">{supplier?.reliabilityScore}%</span>
            </p>
            <p className="text-slate-500 text-[11px] mt-0.5">Standard Lead Time: {supplier?.leadTimeDays} days</p>
            <p className="text-slate-500 text-[11px]">
              Pre-Approval: {supplier?.approved ? 'Authorized' : 'Unapproved'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Fulfillment Status</span>
            {po.supplierSubmissionRef ? (
              <div className="mt-0.5">
                <p className="font-mono text-purple-700 font-bold text-[11px]">{po.supplierSubmissionRef}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{po.supplierStatus}</p>
              </div>
            ) : (
              <p className="text-slate-500 mt-0.5">Awaiting supplier transmission</p>
            )}
            <p className="text-slate-700 font-medium text-[11px] mt-1">
              Expected Delivery: {new Date(po.expectedDeliveryDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Rejection notice if rejected */}
        {po.status === 'REJECTED' && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Purchase Order Rejected by Manager</p>
              <p className="mt-0.5">{po.rejectionReason || 'No specific reason provided.'}</p>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Reordered Line Items</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{item.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right text-slate-700 uppercase text-[11px]">
                    Total Order Valuation:
                  </td>
                  <td className="py-3 px-4 text-right text-base text-blue-600">
                    ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Audit Log / Approval History */}
        <div className="border-t border-slate-100 pt-5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Workflow Audit Log & Authorization Trail</span>
          </h2>

          <div className="space-y-3">
            {po.auditLogs?.map((log) => {
              const actor = log.performedBy as any;
              return (
                <div key={log._id} className="flex items-start gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {log.action.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {log.action.replace(/_/g, ' ')} by {actor?.name || 'System'} ({actor?.role || 'Service'})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {log.comments && <p className="text-slate-600 mt-1">{log.comments}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-2">Reject Purchase Order</h2>
            <p className="text-xs text-slate-500 mb-4">
              Please enter an explicit business reason for rejecting PO {po.purchaseOrderNumber}.
            </p>

            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Budget ceiling exceeded for Q4 packaging supplies..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
