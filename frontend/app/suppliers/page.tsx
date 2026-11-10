'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Supplier } from '../../types';
import {
  Truck,
  Plus,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    approved: true,
    active: true,
    leadTimeDays: 4,
    reliabilityScore: 95,
    supportedCategories: 'Packaging & Shipping, Industrial Hardware',
    rating: 4.8,
    notes: '',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      setSuppliers(res.data.data);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      approved: true,
      active: true,
      leadTimeDays: 4,
      reliabilityScore: 95,
      supportedCategories: 'Packaging & Shipping',
      rating: 4.8,
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setFormData({
      name: sup.name,
      email: sup.email,
      phone: sup.phone,
      address: sup.address,
      approved: sup.approved,
      active: sup.active,
      leadTimeDays: sup.leadTimeDays,
      reliabilityScore: sup.reliabilityScore,
      supportedCategories: sup.supportedCategories?.join(', ') || '',
      rating: sup.rating || 4.5,
      notes: sup.notes || '',
    });
    setShowEditModal(true);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', {
        ...formData,
        supportedCategories: formData.supportedCategories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });
      setShowAddModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating supplier');
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      await api.put(`/suppliers/${selectedSupplier._id}`, {
        ...formData,
        supportedCategories: formData.supportedCategories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });
      setShowEditModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating supplier');
    }
  };

  const toggleApprovalStatus = async (sup: Supplier) => {
    if (!hasRole('Admin', 'Warehouse Manager')) {
      alert('Only Admin and Warehouse Manager can toggle supplier approval rosters.');
      return;
    }

    try {
      await api.put(`/suppliers/${sup._id}`, {
        approved: !sup.approved,
      });
      fetchSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Industrial Supplier Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pre-approved vendor catalog, reliability scoring, contractual lead times, and fulfillment telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSuppliers}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {hasRole('Admin', 'Warehouse Manager') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* Supplier Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
            <span>Loading industrial suppliers...</span>
          </div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup._id}
              className={`bg-white rounded-2xl p-5 border shadow-xs space-y-4 transition ${
                sup.approved ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{sup.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sup.approved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {sup.approved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pre-Approved
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-amber-600" /> Pending Audit
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">★ {sup.rating} / 5.0</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit supplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Reliability</span>
                  <span className="text-sm font-bold text-emerald-600">{sup.reliabilityScore}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Lead Time</span>
                  <span className="text-sm font-bold text-slate-800">{sup.leadTimeDays} Business Days</span>
                </div>
              </div>

              {/* Categories */}
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase mb-1">
                  Authorized Categories
                </span>
                <div className="flex flex-wrap gap-1">
                  {sup.supportedCategories?.map((cat, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.address}</span>
                </div>
              </div>

              {/* Approval status toggle button for managers */}
              {hasRole('Admin', 'Warehouse Manager') && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleApprovalStatus(sup)}
                    className={`w-full py-1.5 text-xs font-semibold rounded-lg border transition ${
                      sup.approved
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {sup.approved ? 'Revoke Pre-Approval' : 'Authorize Supplier Roster'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {showAddModal ? 'Enroll Industrial Supplier' : `Edit: ${formData.name}`}
            </h2>

            <form onSubmit={showAddModal ? handleCreateSupplier : handleUpdateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Time (Business Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reliability Score (0-100%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.reliabilityScore}
                    onChange={(e) => setFormData({ ...formData, reliabilityScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supported Categories (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.supportedCategories}
                  onChange={(e) => setFormData({ ...formData, supportedCategories: e.target.value })}
                  placeholder="Packaging & Shipping, Safety & PPE"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.approved}
                    onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="font-semibold text-slate-700">Pre-Approved for Automated POs</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
