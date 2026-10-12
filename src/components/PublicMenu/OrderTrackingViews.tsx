import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Truck,
  Store,
  XCircle,
  ArrowLeft,
  MessageCircle,
  FileText,
  CreditCard,
  Search,
  Package,
  ShieldCheck,
  MapPin,
  Receipt,
  Upload,
} from 'lucide-react';
import { OnlineOrderStage, StoreSettings, Transaction } from '../../types';
import { formatRupiah, formatDateTime, buildWhatsAppUrl } from '../../utils/formatters';

export function resolveOnlineOrderStage(tx: Transaction): OnlineOrderStage {
  if (tx.tahap_pesanan) return tx.tahap_pesanan;
  if (tx.status === 'Dibatalkan') return 'DIBATALKAN';
  if (tx.status === 'Selesai') return 'SELESAI';
  if (tx.status === 'Diproses') return 'DIPROSES';
  return 'MENUNGGU';
}

export function getStageLabel(stage: OnlineOrderStage, tipe?: string): string {
  switch (stage) {
    case 'MENUNGGU':
      return 'Menunggu Konfirmasi';
    case 'DIKONFIRMASI':
      return 'Dikonfirmasi Warung';
    case 'DIPROSES':
      return 'Sedang Diproses Dapur';
    case 'SIAP':
      return tipe === 'Delivery' ? 'Dalam Pengantaran' : 'Siap Diambil';
    case 'SELESAI':
      return 'Pesanan Selesai';
    case 'DIBATALKAN':
      return 'Dibatalkan';
  }
}

export function getStageBadgeStyle(stage: OnlineOrderStage): string {
  switch (stage) {
    case 'MENUNGGU':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'DIKONFIRMASI':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'DIPROSES':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'SIAP':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'SELESAI':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'DIBATALKAN':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
  }
}

// ============================================================================
// 7. HALAMAN PESANAN SAYA (MY ORDERS LIST VIEW)
// ============================================================================
export type MyOrderTab = 'Semua' | 'Menunggu' | 'Diproses' | 'Siap' | 'Selesai' | 'Dibatalkan';

interface MyOrdersListViewProps {
  orders: Transaction[];
  customerPhoneFilter: string;
  onCustomerPhoneFilterChange: (phone: string) => void;
  onSelectOrder: (order: Transaction) => void;
  onStartShopping: () => void;
}

export const MyOrdersListView: React.FC<MyOrdersListViewProps> = ({
  orders,
  customerPhoneFilter,
  onCustomerPhoneFilterChange,
  onSelectOrder,
  onStartShopping,
}) => {
  const [activeTab, setActiveTab] = useState<MyOrderTab>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: MyOrderTab[] = ['Semua', 'Menunggu', 'Diproses', 'Siap', 'Selesai', 'Dibatalkan'];

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const stage = resolveOnlineOrderStage(order);

      // Tab filter
      if (activeTab === 'Menunggu' && stage !== 'MENUNGGU') return false;
      if (activeTab === 'Diproses' && stage !== 'DIKONFIRMASI' && stage !== 'DIPROSES')
        return false;
      if (activeTab === 'Siap' && stage !== 'SIAP') return false;
      if (activeTab === 'Selesai' && stage !== 'SELESAI') return false;
      if (activeTab === 'Dibatalkan' && stage !== 'DIBATALKAN') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = order.id_transaksi.toLowerCase().includes(q);
        const matchItems = order.items.some((i) => i.nama_produk.toLowerCase().includes(q));
        if (!matchId && !matchItems) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-500" />
            <span>Pesanan Saya</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Realtime
            </span>
          </h2>
          <p className="text-xs text-stone-400">
            Status pesanan diperbarui otomatis dari sistem kasir Warung Bang Kobra.
          </p>
        </div>
      </div>

      {/* Search & Phone Verification Bar so Customer only sees their own orders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor pesanan (WBK-...) atau menu"
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <input
            type="tel"
            value={customerPhoneFilter}
            onChange={(e) => onCustomerPhoneFilterChange(e.target.value)}
            placeholder="Filter No. WhatsApp Anda (contoh: 0812...)"
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Status Tabs: Semua, Menunggu, Diproses, Siap, Selesai, Dibatalkan */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition cursor-pointer ${
                isActive
                  ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Order Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-10 text-center space-y-4">
          <Package className="w-12 h-12 text-stone-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">Belum Ada Pesanan</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Belum ada riwayat pesanan pada kategori ini. Pesanan yang Anda buat akan muncul secara realtime di sini.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartShopping}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-extrabold text-xs shadow-md cursor-pointer"
          >
            <span>Pesan Makanan & Minuman Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const stage = resolveOnlineOrderStage(order);
            const stageLabel = getStageLabel(stage, order.tipe_pesanan);
            const badgeStyle = getStageBadgeStyle(stage);

            return (
              <div
                key={order.id_transaksi}
                className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-4 space-y-3 transition shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs sm:text-sm text-orange-400">
                        {order.id_transaksi}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-stone-800 text-stone-200">
                        {order.tipe_pesanan}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {order.tanggal} • {order.jam}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${badgeStyle}`}
                  >
                    {stageLabel}
                  </span>
                </div>

                {/* Product List Summary */}
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-stone-200">
                      <span className="truncate">
                        <strong className="text-white">{item.qty}x</strong> {item.nama_produk}
                        {item.varian ? (
                          <span className="text-orange-400"> ({item.varian})</span>
                        ) : null}
                      </span>
                      <span className="font-mono text-stone-300 shrink-0">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-stone-400 block">
                      Total ({order.metode_pembayaran} • {order.status_pembayaran || 'MENUNGGU'})
                    </span>
                    <span className="text-sm sm:text-base font-black text-white font-mono">
                      {formatRupiah(order.total)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                  >
                    Lihat Detail & Lacak
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 8. DETAIL DAN PELACAKAN PESANAN (ORDER TRACKING DETAIL VIEW)
// ============================================================================
interface OrderTrackingDetailViewProps {
  order: Transaction;
  settings: StoreSettings;
  onBack: () => void;
  onOpenPaymentPage: (order: Transaction) => void;
}

export const OrderTrackingDetailView: React.FC<OrderTrackingDetailViewProps> = ({
  order,
  settings,
  onBack,
  onOpenPaymentPage,
}) => {
  const currentStage = resolveOnlineOrderStage(order);
  const isCancelled = currentStage === 'DIBATALKAN';

  const timelineSteps: Array<{
    stage: OnlineOrderStage;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      stage: 'MENUNGGU',
      title: 'MENUNGGU',
      subtitle: 'Pesanan diterima sistem & menunggu konfirmasi kasir',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      stage: 'DIKONFIRMASI',
      title: 'DIKONFIRMASI',
      subtitle: 'Pesanan telah dikonfirmasi & stok disiapkan',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      stage: 'DIPROSES',
      title: 'DIPROSES',
      subtitle: 'Makanan & minuman sedang dimasak / diracik di dapur',
      icon: <ChefHat className="w-4 h-4" />,
    },
    {
      stage: 'SIAP',
      title: order.tipe_pesanan === 'Delivery' ? 'DALAM PENGANTARAN' : 'SIAP DIAMBIL',
      subtitle:
        order.tipe_pesanan === 'Delivery'
          ? 'Kurir sedang mengantar pesanan ke area Pesantren DQM'
          : 'Pesanan sudah siap diambil di kasir Warung Bang Kobra',
      icon: order.tipe_pesanan === 'Delivery' ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />,
    },
    {
      stage: 'SELESAI',
      title: 'SELESAI',
      subtitle: 'Pesanan telah selesai diterima pelanggan. Terima kasih!',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ];

  const stageOrder: OnlineOrderStage[] = [
    'MENUNGGU',
    'DIKONFIRMASI',
    'DIPROSES',
    'SIAP',
    'SELESAI',
  ];
  const currentStepIndex = stageOrder.indexOf(currentStage);

  const findStageTimestamp = (stage: OnlineOrderStage): string | null => {
    const history = Array.isArray(order.timeline_status) ? order.timeline_status : [];
    const found = history.find((h) => h.tahap === stage);
    if (found && found.waktu) {
      return formatDateTime(found.waktu);
    }
    if (stage === 'MENUNGGU') {
      return `${order.tanggal} ${order.jam}`;
    }
    return null;
  };

  const handleContactWarung = () => {
    const message = `Halo *${settings.storeName}*, saya *${order.nama_pelanggan}* ingin menanyakan status pesanan saya dengan Nomor Pesanan: *${order.id_transaksi}* (${order.tipe_pesanan} - Total ${formatRupiah(order.total)}). Terima kasih!`;
    const url = buildWhatsAppUrl(settings.whatsappNumber, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pesanan Saya</span>
        </button>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Live Pelacakan
        </span>
      </div>

      {/* Header Order Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-stone-800">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Nomor Pesanan
            </div>
            <h2 className="text-lg sm:text-xl font-black text-orange-400 font-mono">
              {order.id_transaksi}
            </h2>
            <div className="text-xs text-stone-400 mt-0.5">
              Dipesan pada: {order.tanggal} • {order.jam}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-red-600/20 text-orange-300 border border-red-500/30 flex items-center gap-1.5">
              {order.tipe_pesanan === 'Delivery' ? (
                <Truck className="w-3.5 h-3.5" />
              ) : (
                <Store className="w-3.5 h-3.5" />
              )}
              <span>{order.tipe_pesanan.toUpperCase()}</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${getStageBadgeStyle(
                currentStage
              )}`}
            >
              {getStageLabel(currentStage, order.tipe_pesanan)}
            </span>
          </div>
        </div>

        {/* Timeline Pelacakan Status */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-300">
            Timeline Status Pesanan
          </h3>

          {isCancelled ? (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40 flex items-start gap-3 text-red-200">
              <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-red-300">
                  PESANAN DIBATALKAN
                </div>
                <p className="text-xs mt-0.5">
                  Pesanan ini telah dibatalkan. Hubungi Warung Bang Kobra melalui WhatsApp jika Anda membutuhkan bantuan.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative pl-3 space-y-4 before:content-[''] before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-800">
              {timelineSteps.map((step, index) => {
                const isCompleted = currentStepIndex >= index;
                const isCurrent = currentStepIndex === index;
                const timestamp = findStageTimestamp(step.stage);

                return (
                  <div key={step.stage} className="relative flex items-start gap-3.5">
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition ${
                        isCurrent
                          ? 'bg-red-600 border-orange-400 text-white shadow-lg shadow-red-950 ring-4 ring-red-500/20'
                          : isCompleted
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-stone-950 border-stone-800 text-stone-500'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span
                          className={`text-xs font-black tracking-wide ${
                            isCurrent
                              ? 'text-orange-400'
                              : isCompleted
                              ? 'text-white'
                              : 'text-stone-500'
                          }`}
                        >
                          {step.title}
                        </span>
                        {timestamp && (
                          <span className="text-[10px] font-mono text-stone-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                            {timestamp}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isCompleted ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Customer & Delivery / Takeaway Info */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-orange-400" />
          <span>Informasi Pengambilan / Pengantaran</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-stone-400 block text-[11px]">Nama Pelanggan</span>
            <span className="font-bold text-white">{order.nama_pelanggan}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Nomor WhatsApp</span>
            <span className="font-mono font-bold text-white">{order.no_hp_pelanggan || '-'}</span>
          </div>
          {order.email_pelanggan && (
            <div className="sm:col-span-2">
              <span className="text-stone-400 block text-[11px]">Email Pelanggan</span>
              <span className="font-mono text-stone-200">{order.email_pelanggan}</span>
            </div>
          )}
          {order.tipe_pesanan === 'Delivery' ? (
            <div className="sm:col-span-2 p-3 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-orange-400 font-bold block text-[11px]">
                Alamat Pengantaran (Area Pesantren DQM):
              </span>
              <p className="text-white font-semibold mt-0.5">{order.alamat_pengiriman || '-'}</p>
              {order.patokan_lokasi && (
                <p className="text-stone-400 text-[11px] mt-0.5">
                  Patokan: {order.patokan_lokasi}
                </p>
              )}
            </div>
          ) : (
            <div className="sm:col-span-2 p-3 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-orange-400 font-bold block text-[11px]">
                Lokasi Ambil Sendiri (TAKEAWAY):
              </span>
              <p className="text-white font-semibold mt-0.5">{settings.storeAddress}</p>
              {order.waktu_ambil && (
                <p className="text-stone-400 text-[11px] mt-0.5">
                  Waktu Ambil: {order.waktu_ambil}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items & Payment Status */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            <span>Rincian Menu & Pembayaran</span>
          </h3>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-stone-950 text-amber-400 border border-stone-800">
            {order.metode_pembayaran} • {order.status_pembayaran || 'MENUNGGU'}
          </span>
        </div>

        <div className="divide-y divide-stone-800/70">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2 flex justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-white">
                  {item.qty}x {item.nama_produk}
                </span>
                {item.varian && (
                  <span className="ml-1.5 text-orange-400 font-semibold">({item.varian})</span>
                )}
                {item.catatan_item && (
                  <div className="text-[11px] text-stone-400 italic">
                    Catatan: {item.catatan_item}
                  </div>
                )}
              </div>
              <span className="font-mono font-bold text-stone-200 shrink-0">
                {formatRupiah(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2.5 border-t border-stone-800 space-y-1 text-xs">
          <div className="flex justify-between text-stone-400">
            <span>Subtotal</span>
            <span className="font-mono">{formatRupiah(order.subtotal)}</span>
          </div>
          {(order.ongkir || 0) > 0 && (
            <div className="flex justify-between text-stone-400">
              <span>Ongkos Kirim</span>
              <span className="font-mono">{formatRupiah(order.ongkir || 0)}</span>
            </div>
          )}
          {(order.diskon || 0) > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Diskon</span>
              <span className="font-mono">-{formatRupiah(order.diskon || 0)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-stone-800">
            <span className="font-black text-white text-sm">Total Pembayaran</span>
            <span className="font-mono font-black text-base text-orange-400">
              {formatRupiah(order.total)}
            </span>
          </div>
        </div>

        {/* Action to open payment / upload proof */}
        {order.status_pembayaran !== 'LUNAS' && !isCancelled && (
          <button
            type="button"
            onClick={() => onOpenPaymentPage(order)}
            className="w-full py-3 px-4 rounded-xl bg-stone-950 hover:bg-stone-800 border border-orange-500/40 text-orange-400 font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Lihat Instruksi Pembayaran / Unggah Bukti Bayar</span>
          </button>
        )}
      </div>

      {/* Contact Warung via WhatsApp */}
      <button
        type="button"
        onClick={handleContactWarung}
        className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Hubungi Warung melalui WhatsApp</span>
      </button>
    </div>
  );
};
