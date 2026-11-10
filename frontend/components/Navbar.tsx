'use client';

import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, LogOut, Sparkles, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunReorderSweep = async () => {
    setIsReordering(true);
    setReorderSuccessMsg(null);
    try {
      const res = await api.post('/purchase-orders/auto-recommend');
      setReorderSuccessMsg(res.data.message || 'Auto-reordering analysis finished.');
      fetchNotifications();
      setTimeout(() => setReorderSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error executing automated reordering sweep');
    } finally {
      setIsReordering(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Title & Live Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Telemetry Engine Active
          </span>
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500 font-medium">Enterprise Warehouse ERP Suite</span>
      </div>

      {/* Right Action Icons & Controls */}
      <div className="flex items-center gap-3">
        {/* Instant Auto-Reorder recommendation trigger */}
        <button
          onClick={handleRunReorderSweep}
          disabled={isReordering}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all shadow-xs disabled:opacity-50"
          title="Run instantaneous inventory scan and generate PO draft recommendations"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isReordering ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
          <span>{isReordering ? 'Evaluating Inventory...' : 'Trigger Reorder Scan'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-800">System Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No recent notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-3 text-xs transition-colors ${
                        n.read ? 'bg-white' : 'bg-blue-50/50 font-medium'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'ALERT' ? (
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-slate-800 font-semibold text-xs">{n.title}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => setShowNotifications(false)}
                              className="text-blue-600 hover:underline text-[11px] font-semibold mt-1 inline-block"
                            >
                              Review &rarr;
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">{user?.name}</span>
            <span className="text-[10px] text-slate-500 block leading-tight">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating feedback toast */}
      {reorderSuccessMsg && (
        <div className="fixed bottom-6 right-6 max-w-md bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{reorderSuccessMsg}</span>
        </div>
      )}
    </header>
  );
};
