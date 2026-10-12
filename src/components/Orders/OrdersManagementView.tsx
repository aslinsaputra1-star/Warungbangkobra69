import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  ChefHat,
  Truck,
  Store,
  XCircle,
  Printer,
  MessageCircle,
  Mail,
  Eye,
  Bell,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  QrCode,
  FileText,
  CreditCard,
  X,
  Check,
  Ban,
  Play,
  PackageCheck,
} from 'lucide-react';
import {
  OnlineOrderStage,
  PaymentStatus,
  Product,
  StoreSettings,
  Transaction,
} from '../../types';
import {
  formatRupiah,
  formatDateTime,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  buildEmailReceiptSubjectAndBody,
} from '../../utils/formatters';
import {
  updateOnlineOrderStageInFirebase,
  updateOrderPaymentStatusInFirebase,
} from '../../services/firebase';
import {
  resolveOnlineOrderStage,
  getStageLabel,
  getStageBadgeStyle,
} from '../PublicMenu/OrderTrackingViews';

export type AdminOrderTab =
  | 'PESANAN_MASUK'
  | 'DIPROSES'
  | 'SIAP'
  | 'SELESAI'
  | 'DIBATALKAN'
  | 'SEMUA';

interface OrdersManagementViewProps {
  transactions: Transaction[];
  products: Product[];
  settings: StoreSettings;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onPrintReceipt: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToQR?: () => void;
  onOpenOnlineStorefront?: () => void;
}

export const OrdersManagementView: React.FC<OrdersManagementViewProps> = ({
  transactions,
  settings,
  onUpdateTransaction,
  onPrintReceipt,
  showToast,
  onNavigateToQR,
  onOpenOnlineStorefront,
}) => {
  const [activeTab, setActiveTab] = useState<AdminOrderTab>('PESANAN_MASUK');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Transaction | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Count badges per stage
  const stageCounts = useMemo(() => {
    const counts = {
      PESANAN_MASUK: 0,
      DIPROSES: 0,
      SIAP: 0,
      SELESAI: 0,
      DIBATALKAN: 0,
      SEMUA: transactions.length,
    };

    transactions.forEach((tx) => {
      const stage = resolveOnlineOrderStage(tx);
      if (stage === 'MENUNGGU') counts.PESANAN_MASUK += 1;
      else if (stage === 'DIKONFIRMASI' || stage === 'DIPROSES') counts.DIPROSES += 1;
      else if (stage === 'SIAP') counts.SIAP += 1;
      else if (stage === 'SELESAI') counts.SELESAI += 1;
      else if (stage === 'DIBATALKAN') counts.DIBATALKAN += 1;
    });

    return counts;
  }, [transactions]);

  const filteredOrders = useMemo(() => {
    return transactions.filter((tx) => {
      const stage = resolveOnlineOrderStage(tx);

      if (activeTab === 'PESANAN_MASUK' && stage !== 'MENUNGGU') return false;
      if (activeTab === 'DIPROSES' && stage !== 'DIKONFIRMASI' && stage !== 'DIPROSES')
        return false;
      if (activeTab === 'SIAP' && stage !== 'SIAP') return false;
      if (activeTab === 'SELESAI' && stage !== 'SELESAI') return false;
      if (activeTab === 'DIBATALKAN' && stage !== 'DIBATALKAN') return false;

      if (dateFilter && tx.tanggal !== dateFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = tx.id_transaksi.toLowerCase().includes(q);
        const matchName = tx.nama_pelanggan.toLowerCase().includes(q);
        const matchPhone = (tx.no_hp_pelanggan || '').toLowerCase().includes(q);
        const matchEmail = (tx.email_pelanggan || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchPhone && !matchEmail) return false;
      }

      return true;
    });
  }, [transactions, activeTab, dateFilter, searchQuery]);

  // Handle stage transition with atomic stock synchronization
  const handleStageTransition = async (
    tx: Transaction,
    nextStage: OnlineOrderStage,
    note?: string
  ) => {
    setProcessingOrderId(tx.id_transaksi);
    try {
      const res = await updateOnlineOrderStageInFirebase(
        tx.id_transaksi,
        nextStage,
        settings.activeCashier || 'Admin Kasir',
        note
      );
      if (res.success && res.updatedOrder) {
        onUpdateTransaction(res.updatedOrder);
        if (selectedOrderDetail?.id_transaksi === tx.id_transaksi) {
          setSelectedOrderDetail(res.updatedOrder);
        }
        showToast(
          `Status pesanan ${tx.id_transaksi} diperbarui ke ${getStageLabel(
            nextStage,
            tx.tipe_pesanan
          )}!`,
          'success'
        );
      } else {
        showToast(res.error || 'Gagal memperbarui status pesanan', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error memperbarui status pesanan', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Handle payment verification status
  const handleVerifyPayment = async (tx: Transaction, newPaymentStatus: PaymentStatus) => {
    setProcessingOrderId(tx.id_transaksi);
    try {
      const res = await updateOrderPaymentStatusInFirebase(tx.id_transaksi, newPaymentStatus);
      if (res.success) {
        const updated: Transaction = {
          ...tx,
          status_pembayaran: newPaymentStatus,
        };
        onUpdateTransaction(updated);
        if (selectedOrderDetail?.id_transaksi === tx.id_transaksi) {
          setSelectedOrderDetail(updated);
        }
        showToast(
          `Status pembayaran ${tx.id_transaksi} diubah menjadi ${newPaymentStatus}`,
          newPaymentStatus === 'LUNAS' ? 'success' : 'info'
        );
      } else {
        showToast(res.error || 'Gagal mengubah status pembayaran', 'error');
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Send receipt via WhatsApp to Customer
  const handleSendWhatsAppReceipt = (tx: Transaction) => {
    const targetPhone = tx.no_hp_pelanggan || settings.whatsappNumber;
    const msg = buildWhatsAppOrderMessage({
      orderId: tx.id_transaksi,
      storeName: settings.storeName,
      orderType: tx.tipe_pesanan === 'Delivery' ? 'Delivery' : 'Takeaway',
      customerName: tx.nama_pelanggan,
      customerPhone: tx.no_hp_pelanggan || '-',
      customerEmail: tx.email_pelanggan,
      pickupTime: tx.waktu_ambil,
      deliveryAddress: tx.alamat_pengiriman,
      deliveryLandmark: tx.patokan_lokasi,
      paymentMethod: tx.metode_pembayaran,
      items: tx.items.map((i) => ({
        nama: i.nama_produk,
        qty: i.qty,
        harga: i.harga_satuan,
        catatan: i.catatan_item,
        variant: i.varian,
      })),
      subtotal: tx.subtotal,
      shippingFee: tx.ongkir || 0,
      grandTotal: tx.total,
      notes: tx.catatan,
    });

    const url = buildWhatsAppUrl(targetPhone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Send receipt via Email to Customer
  const handleSendEmailReceipt = (tx: Transaction) => {
    if (!tx.email_pelanggan) {
      showToast('Pelanggan tidak mencantumkan alamat email pada pesanan ini.', 'info');
      return;
    }
    const { subject, body } = buildEmailReceiptSubjectAndBody({
      orderId: tx.id_transaksi,
      storeName: settings.storeName,
      orderType: tx.tipe_pesanan,
      customerName: tx.nama_pelanggan,
      customerPhone: tx.no_hp_pelanggan || '-',
      customerEmail: tx.email_pelanggan,
      paymentMethod: tx.metode_pembayaran,
      paymentStatus: tx.status_pembayaran || 'MENUNGGU',
      createdAt: `${tx.tanggal} ${tx.jam}`,
      deliveryAddress: tx.alamat_pengiriman,
      items: tx.items.map((i) => ({
        nama: i.nama_produk,
        variant: i.varian,
        qty: i.qty,
        harga: i.harga_satuan,
        catatan: i.catatan_item,
      })),
      subtotal: tx.subtotal,
      shippingFee: tx.ongkir || 0,
      discount: tx.diskon || 0,
      grandTotal: tx.total,
      notes: tx.catatan,
    });

    const mailtoUrl = `mailto:${encodeURIComponent(tx.email_pelanggan)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const tabs: Array<{ id: AdminOrderTab; label: string; count: number }> = [
    { id: 'PESANAN_MASUK', label: 'Pesanan Masuk', count: stageCounts.PESANAN_MASUK },
    { id: 'DIPROSES', label: 'Diproses', count: stageCounts.DIPROSES },
    { id: 'SIAP', label: 'Siap', count: stageCounts.SIAP },
    { id: 'SELESAI', label: 'Selesai', count: stageCounts.SELESAI },
    { id: 'DIBATALKAN', label: 'Dibatalkan', count: stageCounts.DIBATALKAN },
    { id: 'SEMUA', label: 'Semua', count: stageCounts.SEMUA },
  ];

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-red-500" />
              <span>Dashboard Admin Pesanan Online</span>
            </h2>
            {stageCounts.PESANAN_MASUK > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-red-600 text-white flex items-center gap-1.5 shadow-lg shadow-red-950/60 animate-pulse">
                <Bell className="w-3.5 h-3.5" />
                <span>{stageCounts.PESANAN_MASUK} Pesanan Baru</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-400">
            Kelola pesanan masuk secara realtime, konfirmasi & sinkronkan stok produk, verifikasi pembayaran, dan cetak struk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenOnlineStorefront && (
            <button
              type="button"
              onClick={onOpenOnlineStorefront}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Halaman Pesanan Online</span>
            </button>
          )}
          {onNavigateToQR && (
            <button
              type="button"
              onClick={onNavigateToQR}
              className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-orange-400" />
              <span>QR Standee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar: Search & Date Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor pesanan (WBK-...), nama pelanggan, atau nomor WhatsApp..."
            className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>
        <div className="md:col-span-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Calendar className="w-4 h-4 text-orange-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-bold text-stone-400 hover:text-white cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs: Pesanan Masuk, Diproses, Siap, Selesai, Dibatalkan */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap border flex items-center gap-2 transition cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 border-red-500 text-white shadow-lg shadow-red-950/40'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  active
                    ? 'bg-black/30 text-white'
                    : tab.id === 'PESANAN_MASUK' && tab.count > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center space-y-2">
          <ShoppingBag className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-black text-stone-200">Tidak Ada Pesanan pada Tab Ini</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Pesanan baru dari pelanggan akan langsung muncul secara realtime beserta notifikasi suara.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((tx) => {
            const stage = resolveOnlineOrderStage(tx);
            const isBusy = processingOrderId === tx.id_transaksi;
            const paymentStatus = tx.status_pembayaran || 'MENUNGGU';

            return (
              <div
                key={tx.id_transaksi}
                className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-lg transition"
              >
                <div className="space-y-3.5">
                  {/* Card Header: Order ID, Timestamp, Stage Badge */}
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-stone-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm sm:text-base text-orange-400">
                          {tx.id_transaksi}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                            tx.tipe_pesanan === 'Delivery'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : tx.tipe_pesanan === 'PO / Acara'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {tx.tipe_pesanan === 'Delivery' ? (
                            <Truck className="w-3 h-3" />
                          ) : tx.tipe_pesanan === 'PO / Acara' ? (
                            <Calendar className="w-3 h-3" />
                          ) : (
                            <Store className="w-3 h-3" />
                          )}
                          <span>{tx.tipe_pesanan}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {tx.tanggal} • {tx.jam}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${getStageBadgeStyle(
                        stage
                      )}`}
                    >
                      {getStageLabel(stage, tx.tipe_pesanan)}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800/80">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Nama Pelanggan</span>
                      <span className="font-extrabold text-white">{tx.nama_pelanggan}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Nomor WhatsApp</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {tx.no_hp_pelanggan || '-'}
                      </span>
                    </div>
                    {tx.email_pelanggan && (
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block">Email Pelanggan</span>
                        <span className="font-mono text-stone-200">{tx.email_pelanggan}</span>
                      </div>
                    )}
                    {tx.tipe_pesanan === 'Delivery' && tx.alamat_pengiriman && (
                      <div className="sm:col-span-2 pt-1 border-t border-stone-800">
                        <span className="text-[10px] text-orange-400 font-bold block">
                          Titik Antar (Area Pesantren DQM):
                        </span>
                        <span className="text-stone-200 font-semibold">{tx.alamat_pengiriman}</span>
                        {tx.patokan_lokasi && (
                          <span className="text-stone-400 block text-[11px]">
                            Patokan: {tx.patokan_lokasi}
                          </span>
                        )}
                      </div>
                    )}
                    {tx.tipe_pesanan === 'PO / Acara' && tx.tanggal_acara && (
                      <div className="sm:col-span-2 pt-1 border-t border-stone-800">
                        <span className="text-[10px] text-purple-400 font-bold block">
                          Jadwal Pelaksanaan Acara / PO:
                        </span>
                        <span className="text-purple-200 font-semibold">
                          {tx.tanggal_acara.replace('T', ' ')} WIB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Daftar Menu ({tx.items.reduce((s, i) => s + i.qty, 0)} Item)
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {tx.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 text-xs py-1 border-b border-stone-800/50 last:border-none"
                        >
                          <div>
                            <span className="font-extrabold text-white">
                              {item.qty}x {item.nama_produk}
                            </span>
                            {item.varian && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-600/20 text-orange-300 text-[10px] font-bold">
                                {item.varian}
                              </span>
                            )}
                            {item.catatan_item && (
                              <div className="text-[11px] text-amber-300/90 italic">
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
                  </div>

                  {tx.catatan && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                      <strong>Catatan Pesanan:</strong> {tx.catatan}
                    </div>
                  )}

                  {/* Payment Info & Proof Verification */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-stone-950 border border-stone-800">
                    <div>
                      <div className="text-[10px] text-stone-400">
                        Metode: <strong className="text-white">{tx.metode_pembayaran}</strong> • Status Bayar:{' '}
                        <strong
                          className={
                            paymentStatus === 'LUNAS'
                              ? 'text-emerald-400'
                              : paymentStatus === 'DITOLAK'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }
                        >
                          {paymentStatus}
                        </strong>
                      </div>
                      <div className="text-base font-black text-orange-400 font-mono mt-0.5">
                        Total: {formatRupiah(tx.total)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {tx.bukti_pembayaran_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(tx.bukti_pembayaran_url!)}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Bukti Bayar</span>
                        </button>
                      )}
                      {paymentStatus !== 'LUNAS' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleVerifyPayment(tx, 'LUNAS')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                          title="Tandai Pembayaran Lunas"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Set Lunas</span>
                        </button>
                      )}
                      {paymentStatus === 'DIVERIFIKASI' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleVerifyPayment(tx, 'DITOLAK')}
                          className="px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Tolak Bukti Pembayaran"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Detail, Konfirmasi, Proses, Siap, Selesaikan, Batalkan + Print/WA/Email */}
                <div className="pt-3 border-t border-stone-800 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetail(tx)}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-orange-400" />
                      <span>Detail</span>
                    </button>

                    {stage === 'MENUNGGU' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleStageTransition(
                            tx,
                            'DIKONFIRMASI',
                            'Pesanan dikonfirmasi & stok produk disinkronkan'
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Konfirmasi</span>
                      </button>
                    )}

                    {(stage === 'MENUNGGU' || stage === 'DIKONFIRMASI') && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleStageTransition(
                            tx,
                            'DIPROSES',
                            'Pesanan sedang dimasak / diracik di dapur'
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Proses</span>
                      </button>
                    )}

                    {stage === 'DIPROSES' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleStageTransition(
                            tx,
                            'SIAP',
                            tx.tipe_pesanan === 'Delivery'
                              ? 'Pesanan sedang dalam pengantaran kurir'
                              : 'Pesanan siap diambil pelanggan'
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Siap</span>
                      </button>
                    )}

                    {(stage === 'SIAP' || stage === 'DIPROSES') && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleStageTransition(tx, 'SELESAI', 'Pesanan selesai diterima pelanggan')
                        }
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Selesaikan</span>
                      </button>
                    )}

                    {stage !== 'SELESAI' && stage !== 'DIBATALKAN' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleStageTransition(tx, 'DIBATALKAN', 'Pesanan dibatalkan oleh admin/kasir')
                        }
                        className="px-3 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-700/50 font-bold text-xs flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Batalkan</span>
                      </button>
                    )}
                  </div>

                  {/* Receipt & Share Row: Print, WhatsApp, Email */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(tx)}
                      className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cetak Struk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReceipt(tx)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </button>

                    {tx.email_pelanggan && (
                      <button
                        type="button"
                        onClick={() => handleSendEmailReceipt(tx)}
                        className="px-3 py-1.5 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-700/40 text-sky-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Kirim Email</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Detail Pesanan {selectedOrderDetail.id_transaksi}
                </h3>
                <p className="text-xs text-stone-400">
                  {selectedOrderDetail.tanggal} • {selectedOrderDetail.jam}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-950 p-4 rounded-2xl border border-stone-800">
              <div>
                <span className="text-stone-400 block text-[11px]">Pelanggan</span>
                <span className="font-bold text-white">{selectedOrderDetail.nama_pelanggan}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">No. WhatsApp</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedOrderDetail.no_hp_pelanggan || '-'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Email</span>
                <span className="font-mono text-stone-200">
                  {selectedOrderDetail.email_pelanggan || '-'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Jenis Pesanan</span>
                <span className="font-black text-orange-400 uppercase">
                  {selectedOrderDetail.tipe_pesanan}
                </span>
              </div>
              {selectedOrderDetail.alamat_pengiriman && (
                <div className="col-span-2 pt-2 border-t border-stone-800">
                  <span className="text-orange-400 font-bold block text-[11px]">
                    Alamat Pengantaran:
                  </span>
                  <span className="text-white">{selectedOrderDetail.alamat_pengiriman}</span>
                </div>
              )}
            </div>

            {/* Timeline Riwayat Perubahan Status */}
            {Array.isArray(selectedOrderDetail.timeline_status) &&
              selectedOrderDetail.timeline_status.length > 0 && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                    Riwayat Waktu Perubahan Status
                  </div>
                  <div className="space-y-1.5">
                    {selectedOrderDetail.timeline_status.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-orange-300">{h.tahap}</span>
                        <span className="font-mono text-stone-400 text-[11px]">
                          {formatDateTime(h.waktu)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onPrintReceipt(selectedOrderDetail)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Lightbox Modal */}
      {previewProofUrl && (
        <div
          onClick={() => setPreviewProofUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl p-4 max-w-md w-full space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Bukti Pembayaran Pelanggan
              </h4>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewProofUrl}
              alt="Bukti Pembayaran"
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
