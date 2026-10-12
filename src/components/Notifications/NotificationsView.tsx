import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingBag,
  AlertTriangle,
  CreditCard,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
  CalendarDays,
} from 'lucide-react';
import { AppNotification, ActiveTab, Product, Transaction } from '../../types';
import { StorageService } from '../../services/storage';
import { markNotificationReadInFirebase } from '../../services/firebase';
import { formatDateTime } from '../../utils/formatters';

interface NotificationsViewProps {
  notifications: AppNotification[];
  products: Product[];
  transactions: Transaction[];
  onNavigate: (tab: ActiveTab) => void;
  onRefreshNotifications: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  products,
  transactions,
  onNavigate,
  onRefreshNotifications,
  showToast,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'order' | 'stock' | 'payment' | 'system'>('ALL');

  // Compute live system alerts on the fly
  const dynamicAlerts = useMemo(() => {
    const list: AppNotification[] = [];

    // 1. Check for products with critical stock
    products.forEach((p) => {
      if (p.stok <= 0) {
        list.push({
          id: `STOCK-EMPTY-${p.id}`,
          timestamp: new Date().toISOString(),
          title: `Stok Habis: ${p.nama}`,
          message: `Stok menu ${p.nama} saat ini 0 ${p.satuan}. Harap segera restok bahan atau nonaktifkan menu.`,
          type: 'stock',
          read: false,
          linkTab: 'stock',
        });
      } else if (p.stok <= p.stok_minimum) {
        list.push({
          id: `STOCK-LOW-${p.id}`,
          timestamp: new Date().toISOString(),
          title: `Stok Menipis: ${p.nama}`,
          message: `Sisa stok ${p.nama} tersisa ${p.stok} ${p.satuan} (batas minimum ${p.stok_minimum}).`,
          type: 'stock',
          read: false,
          linkTab: 'stock',
        });
      }
    });

    // 2. Check for pending orders needing confirmation
    transactions.forEach((tx) => {
      if (tx.tahap_pesanan === 'MENUNGGU' || (!tx.tahap_pesanan && tx.status === 'Pending')) {
        list.push({
          id: `ORDER-PENDING-${tx.id_transaksi}`,
          timestamp: tx.created_at || tx.tanggal,
          title: `Pesanan Baru: #${tx.id_transaksi} (${tx.tipe_pesanan || 'Online'})`,
          message: `Pesanan dari ${tx.nama_pelanggan} senilai Rp ${tx.total.toLocaleString('id-ID')} menunggu konfirmasi dapur kasir.`,
          type: 'order',
          read: false,
          linkTab: 'orders',
        });
      }
    });

    return list;
  }, [products, transactions]);

  // Combine stored notifications and dynamic alerts (deduplicating by ID)
  const allNotifications = useMemo(() => {
    const map = new Map<string, AppNotification>();
    dynamicAlerts.forEach((n) => map.set(n.id, n));
    notifications.forEach((n) => map.set(n.id, n));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [dynamicAlerts, notifications]);

  const filtered = useMemo(() => {
    return allNotifications.filter((n) => {
      if (filterType === 'ALL') return true;
      return n.type === filterType;
    });
  }, [allNotifications, filterType]);

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsRead();
    onRefreshNotifications();
    showToast('Semua notifikasi ditandai telah dibaca.', 'success');
  };

  const handleClearAll = () => {
    StorageService.clearNotifications();
    onRefreshNotifications();
    showToast('Daftar riwayat notifikasi dibersihkan.', 'info');
  };

  const handleItemClick = (n: AppNotification) => {
    StorageService.markNotificationRead(n.id);
    markNotificationReadInFirebase(n.id).catch(() => {});
    onRefreshNotifications();
    if (n.linkTab) {
      onNavigate(n.linkTab);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            <span>Pusat Notifikasi Warung</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                {unreadCount} Baru
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Pantau pesanan masuk, peringatan stok menipis, verifikasi pembayaran, dan status sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Tandai Semua Dibaca</span>
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-rose-400 hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        {[
          { id: 'ALL', label: 'Semua Notifikasi', count: allNotifications.length },
          {
            id: 'order',
            label: 'Pesanan Masuk',
            count: allNotifications.filter((n) => n.type === 'order').length,
          },
          {
            id: 'stock',
            label: 'Peringatan Stok',
            count: allNotifications.filter((n) => n.type === 'stock').length,
          },
          {
            id: 'payment',
            label: 'Pembayaran',
            count: allNotifications.filter((n) => n.type === 'payment').length,
          },
          {
            id: 'system',
            label: 'Sistem',
            count: allNotifications.filter((n) => n.type === 'system').length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === tab.id
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-3">
          <Bell className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-stone-300">Tidak Ada Notifikasi</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Semua operasional warung berjalan lancar. Tidak ada peringatan baru dalam kategori ini.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isOrder = item.type === 'order';
            const isStock = item.type === 'stock';
            const isPayment = item.type === 'payment';

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 rounded-2xl border transition flex items-start gap-3.5 cursor-pointer hover:scale-[1.005] ${
                  !item.read
                    ? isStock
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/10'
                      : isOrder
                      ? 'bg-orange-950/20 border-orange-500/40 shadow-lg shadow-orange-950/10'
                      : 'bg-stone-900 border-amber-500/40'
                    : 'bg-stone-900/60 border-stone-800 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Icon Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isStock
                      ? 'bg-rose-500/20 text-rose-400'
                      : isOrder
                      ? 'bg-orange-500/20 text-orange-400'
                      : isPayment
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {isStock && <AlertTriangle className="w-5 h-5" />}
                  {isOrder && <ShoppingBag className="w-5 h-5" />}
                  {isPayment && <CreditCard className="w-5 h-5" />}
                  {!isStock && !isOrder && !isPayment && <Info className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-stone-100 text-sm flex items-center gap-2">
                      <span>{item.title}</span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
                      )}
                    </h4>
                    <span className="text-[10px] text-stone-500 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(item.timestamp)}</span>
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  {item.linkTab && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400 mt-2 hover:underline">
                      <span>Buka Halaman {item.linkTab.toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
