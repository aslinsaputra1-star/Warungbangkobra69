import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  MessageCircle,
  Printer,
  ChevronRight,
  User,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  X,
  Check,
  Ban,
  PackageCheck,
  CalendarDays,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Transaction, Product, StoreSettings, CartItem } from '../../types';
import {
  formatRupiah,
  formatDateTime,
  formatDateIndo,
  buildWhatsAppUrl,
  openWhatsAppChat,
} from '../../utils/formatters';

interface POOrdersViewProps {
  transactions: Transaction[];
  products: Product[];
  settings: StoreSettings;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onCreatePOOrder: (newTx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const POOrdersView: React.FC<POOrdersViewProps> = ({
  transactions,
  products,
  settings,
  onUpdateTransaction,
  onSelectTransaction,
  onCreatePOOrder,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'MENUNGGU' | 'DIPROSES' | 'SIAP' | 'SELESAI' | 'DIBATALKAN'>('SEMUA');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<Transaction | null>(null);

  // Filter transactions that are Pre-Order / Pesanan Acara
  const poOrders = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.tipe_pesanan === 'PO / Acara' ||
        tx.sumber_pesanan?.toLowerCase().includes('po') ||
        tx.sumber_pesanan?.toLowerCase().includes('acara') ||
        Boolean(tx.tanggal_acara)
    );
  }, [transactions]);

  const filteredPOOrders = useMemo(() => {
    return poOrders.filter((tx) => {
      if (statusFilter !== 'SEMUA') {
        if (statusFilter === 'MENUNGGU' && tx.tahap_pesanan !== 'MENUNGGU' && tx.status !== 'Pending') return false;
        if (statusFilter === 'DIPROSES' && tx.tahap_pesanan !== 'DIPROSES' && tx.tahap_pesanan !== 'DIKONFIRMASI') return false;
        if (statusFilter === 'SIAP' && tx.tahap_pesanan !== 'SIAP') return false;
        if (statusFilter === 'SELESAI' && tx.status !== 'Selesai' && tx.tahap_pesanan !== 'SELESAI') return false;
        if (statusFilter === 'DIBATALKAN' && tx.status !== 'Dibatalkan' && tx.tahap_pesanan !== 'DIBATALKAN') return false;
      }

      if (dateFilter) {
        const matchesEventDate = tx.tanggal_acara === dateFilter;
        const matchesCreatedDate = tx.tanggal === dateFilter;
        if (!matchesEventDate && !matchesCreatedDate) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = tx.id_transaksi.toLowerCase().includes(q);
        const matchName = tx.nama_pelanggan.toLowerCase().includes(q);
        const matchPhone = (tx.no_hp_pelanggan || tx.no_whatsapp || '').toLowerCase().includes(q);
        const matchLocation = (tx.alamat_pengantaran || tx.patokan_lokasi || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchPhone && !matchLocation) return false;
      }

      return true;
    });
  }, [poOrders, statusFilter, dateFilter, search]);

  // Summary counts
  const summary = useMemo(() => {
    const total = poOrders.length;
    const pending = poOrders.filter((t) => t.tahap_pesanan === 'MENUNGGU' || t.status === 'Pending').length;
    const inProgress = poOrders.filter((t) => t.tahap_pesanan === 'DIPROSES' || t.tahap_pesanan === 'DIKONFIRMASI').length;
    const ready = poOrders.filter((t) => t.tahap_pesanan === 'SIAP').length;
    const completed = poOrders.filter((t) => t.status === 'Selesai' || t.tahap_pesanan === 'SELESAI').length;
    const totalNominal = poOrders
      .filter((t) => t.status !== 'Dibatalkan' && t.tahap_pesanan !== 'DIBATALKAN')
      .reduce((sum, t) => sum + t.total, 0);

    return { total, pending, inProgress, ready, completed, totalNominal };
  }, [poOrders]);

  // Form State for Creating PO
  const [poForm, setPoForm] = useState({
    namaPelanggan: '',
    noWhatsapp: '',
    tanggalAcara: '',
    waktuAcara: '10:00',
    jenisLayanan: 'Ambil Sendiri (Takeaway)' as 'Ambil Sendiri (Takeaway)' | 'Antar ke Lokasi (Delivery)',
    alamatAcara: '',
    uangMuka: 0,
    catatanAcara: '',
  });

  const [poItems, setPoItems] = useState<Array<{ product: Product; qty: number; catatan: string }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemNote, setItemNote] = useState<string>('');

  const handleAddItemToPO = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setPoItems((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id ? { ...i, qty: i.qty + itemQty, catatan: itemNote || i.catatan } : i
        );
      }
      return [...prev, { product: prod, qty: itemQty, catatan: itemNote }];
    });

    setItemQty(10);
    setItemNote('');
    setSelectedProductId('');
  };

  const handleRemoveItem = (prodId: string) => {
    setPoItems((prev) => prev.filter((i) => i.product.id !== prodId));
  };

  const poSubtotal = useMemo(() => {
    return poItems.reduce((sum, item) => sum + item.product.harga_jual * item.qty, 0);
  }, [poItems]);

  const poRemainingBalance = Math.max(0, poSubtotal - poForm.uangMuka);

  const handleSaveNewPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.namaPelanggan.trim()) {
      showToast('Nama pemesan / instansi wajib diisi!', 'error');
      return;
    }
    if (!poForm.noWhatsapp.trim()) {
      showToast('Nomor WhatsApp kontak wajib diisi!', 'error');
      return;
    }
    if (!poForm.tanggalAcara) {
      showToast('Tanggal acara pesanan PO wajib ditentukan!', 'error');
      return;
    }
    if (poItems.length === 0) {
      showToast('Pilih minimal satu menu makanan / minuman untuk pesanan acara!', 'error');
      return;
    }

    const orderId = 'PO-' + Date.now().toString().slice(-6);
    const newTx: Transaction = {
      id_transaksi: orderId,
      tanggal: new Date().toISOString().split('T')[0],
      jam: new Date().toTimeString().split(' ')[0],
      created_at: new Date().toISOString(),
      kasir: settings.activeCashier || 'Admin POS',
      items: poItems.map((item, idx) => ({
        id_detail: `${orderId}-item-${idx + 1}`,
        id_transaksi: orderId,
        id_produk: item.product.id,
        nama_produk: item.product.nama,
        harga_satuan: item.product.harga_jual,
        harga: item.product.harga_jual,
        qty: item.qty,
        subtotal: item.product.harga_jual * item.qty,
        catatan_item: item.catatan,
      })),
      subtotal: poSubtotal,
      diskon: 0,
      biaya: 0,
      ongkir: 0,
      total: poSubtotal,
      uang_diterima: poForm.uangMuka,
      kembalian: 0,
      metode_pembayaran: poForm.uangMuka >= poSubtotal ? 'Cash' : 'Transfer',
      status_pembayaran: poForm.uangMuka >= poSubtotal ? 'LUNAS' : poForm.uangMuka > 0 ? 'DIVERIFIKASI' : 'MENUNGGU',
      status: 'Pending',
      tahap_pesanan: 'MENUNGGU',
      tipe_pesanan: 'PO / Acara',
      nama_pelanggan: poForm.namaPelanggan.trim(),
      no_whatsapp: poForm.noWhatsapp.trim(),
      no_hp_pelanggan: poForm.noWhatsapp.trim(),
      tanggal_acara: poForm.tanggalAcara,
      waktu_ambil: poForm.waktuAcara,
      alamat_pengantaran: poForm.jenisLayanan === 'Antar ke Lokasi (Delivery)' ? poForm.alamatAcara : 'Ambil di Warung Bang Kobra',
      catatan_pesanan: poForm.catatanAcara,
      sumber_pesanan: 'Pre-Order / Pesanan Acara',
    };

    onCreatePOOrder(newTx);
    showToast(`Pesanan Acara / PO ${orderId} berhasil dibuat!`, 'success');
    setIsCreateModalOpen(false);
    // Reset Form
    setPoForm({
      namaPelanggan: '',
      noWhatsapp: '',
      tanggalAcara: '',
      waktuAcara: '10:00',
      jenisLayanan: 'Ambil Sendiri (Takeaway)',
      alamatAcara: '',
      uangMuka: 0,
      catatanAcara: '',
    });
    setPoItems([]);
  };

  const handleUpdateStage = (tx: Transaction, nextStage: any, nextStatus: any) => {
    const updated: Transaction = {
      ...tx,
      tahap_pesanan: nextStage,
      status: nextStatus,
    };
    onUpdateTransaction(updated);
    if (selectedPO?.id_transaksi === tx.id_transaksi) {
      setSelectedPO(updated);
    }
    showToast(`Status PO ${tx.id_transaksi} diperbarui ke "${nextStage}"`, 'success');
  };

  const handleSendWhatsAppPO = (tx: Transaction) => {
    const phone = tx.no_hp_pelanggan || tx.no_whatsapp;
    if (!phone) {
      showToast('Nomor WhatsApp pelanggan tidak tersedia', 'error');
      return;
    }

    const itemsText = tx.items
      .map((i) => `• ${i.nama_produk} x ${i.qty} = ${formatRupiah(i.subtotal || i.harga * i.qty)}`)
      .join('\n');

    const msg = `*KONFIRMASI PESANAN ACARA / PO — WARUNG BANG KOBRA*
------------------------------------------------
No. Pesanan: *#${tx.id_transaksi}*
Pemesan: *${tx.nama_pelanggan}*
Tanggal Acara: *${tx.tanggal_acara ? formatDateIndo(tx.tanggal_acara) : tx.tanggal}*
Waktu: *${tx.waktu_ambil || '10:00'} WIB*
Pengambilan/Pengantaran: *${tx.alamat_pengantaran || 'Warung Bang Kobra'}*

*Menu Pesanan:*
${itemsText}

------------------------------------------------
*Total Tagihan:* *${formatRupiah(tx.total)}*
*Uang Muka (DP):* ${formatRupiah(tx.uang_diterima || 0)}
*Sisa Tagihan:* *${formatRupiah(Math.max(0, tx.total - (tx.uang_diterima || 0)))}*
*Status Pembayaran:* ${tx.status_pembayaran || 'MENUNGGU'}
*Status Pesanan:* ${tx.tahap_pesanan || tx.status}

Catatan:
_${tx.catatan_pesanan || tx.catatan || 'Terima kasih atas pesanan Anda. Kami akan siapkan pesanan Anda dengan kualitas terbaik!'}_

Warung Bang Kobra — DQM Area.`;

    openWhatsAppChat(phone, msg);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-orange-500" />
            <span>Pesanan Acara / Pre-Order (PO)</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Kelola pesanan partai besar, catering syukuran, pesanan santri DQM, dan event khusus.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-orange-950/40 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Pesanan Acara (PO)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
          <div className="text-[11px] font-bold text-stone-400 uppercase">Total Pesanan Acara</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 mt-1">
            {summary.total}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">PO tercatat</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-amber-500/30 shadow-md">
          <div className="text-[11px] font-bold text-amber-400 uppercase">Menunggu / Konfirmasi</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">
            {summary.pending}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Perlu tindak lanjut</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-orange-500/30 shadow-md">
          <div className="text-[11px] font-bold text-orange-400 uppercase">Sedang Dipersiapkan</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-orange-400 mt-1">
            {summary.inProgress + summary.ready}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Dapur & logistik</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-emerald-500/30 shadow-md">
          <div className="text-[11px] font-bold text-emerald-400 uppercase">Total Nilai PO Selesai</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
            {formatRupiah(summary.totalNominal)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">{summary.completed} pesanan rampung</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari PO berdasarkan ID, nama pemesan, no WA, lokasi..."
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-stone-200 focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[10px] text-rose-400 font-bold ml-1 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold no-scrollbar">
            {(['SEMUA', 'MENUNGGU', 'DIPROSES', 'SIAP', 'SELESAI', 'DIBATALKAN'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === st
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List Grid */}
      {filteredPOOrders.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-stone-900/60 border border-stone-800/80 space-y-3">
          <CalendarDays className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-stone-300">Belum Ada Pesanan Acara / PO</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Gunakan tombol "+ Buat Pesanan Acara (PO)" di atas untuk mencatat pesanan catering, event, atau pesanan partai besar dengan uang muka dan jadwal pengambilan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPOOrders.map((tx) => {
            const isCompleted = tx.status === 'Selesai' || tx.tahap_pesanan === 'SELESAI';
            const isCancelled = tx.status === 'Dibatalkan' || tx.tahap_pesanan === 'DIBATALKAN';
            const dp = tx.uang_diterima || 0;
            const remaining = Math.max(0, tx.total - dp);

            return (
              <div
                key={tx.id_transaksi}
                className={`p-5 rounded-3xl bg-stone-900 border transition shadow-xl flex flex-col justify-between space-y-4 ${
                  isCompleted
                    ? 'border-emerald-900/50'
                    : isCancelled
                    ? 'border-stone-800 opacity-60'
                    : 'border-orange-500/30 hover:border-orange-500/60'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Meta */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-orange-400">
                          #{tx.id_transaksi}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-950/60 text-orange-400 border border-orange-800/40">
                          PO / Acara
                        </span>
                      </div>
                      <h3 className="font-extrabold text-stone-100 text-sm mt-1">
                        {tx.nama_pelanggan}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                        tx.tahap_pesanan === 'MENUNGGU'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                          : tx.tahap_pesanan === 'DIPROSES' || tx.tahap_pesanan === 'DIKONFIRMASI'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                          : tx.tahap_pesanan === 'SIAP'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : tx.tahap_pesanan === 'SELESAI'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {tx.tahap_pesanan || tx.status}
                    </span>
                  </div>

                  {/* Schedule & Contact */}
                  <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-stone-300">
                      <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="font-bold">
                        Acara: {tx.tanggal_acara ? formatDateIndo(tx.tanggal_acara) : tx.tanggal}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Jam Ambil / Antar: {tx.waktu_ambil || '10:00'} WIB</span>
                    </div>

                    <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Kontak: {tx.no_hp_pelanggan || tx.no_whatsapp || '-'}</span>
                    </div>

                    {tx.alamat_pengantaran && (
                      <div className="flex items-start gap-2 text-stone-400 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{tx.alamat_pengantaran}</span>
                      </div>
                    )}
                  </div>

                  {/* Items Brief */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-stone-400">Rincian Menu:</div>
                    <div className="space-y-0.5">
                      {tx.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-stone-300">
                          <span className="truncate pr-2">
                            • {item.nama_produk} x {item.qty}
                          </span>
                          <span className="font-mono text-stone-400 shrink-0">
                            {formatRupiah(item.subtotal || item.harga * item.qty)}
                          </span>
                        </div>
                      ))}
                      {tx.items.length > 3 && (
                        <div className="text-[10px] text-stone-500">
                          +{tx.items.length - 3} item menu lainnya
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Balance */}
                  <div className="pt-2 border-t border-stone-800 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-400">Total Biaya PO:</span>
                      <span className="font-mono font-black text-orange-400 text-sm">
                        {formatRupiah(tx.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500">Uang Muka (DP):</span>
                      <span className="font-mono text-emerald-400 font-bold">{formatRupiah(dp)}</span>
                    </div>
                    {remaining > 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-rose-400 font-bold">Sisa Tagihan:</span>
                        <span className="font-mono text-rose-400 font-bold">{formatRupiah(remaining)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  {/* Stage Progress Buttons */}
                  {!isCompleted && !isCancelled && (
                    <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                      {tx.tahap_pesanan === 'MENUNGGU' && (
                        <button
                          onClick={() => handleUpdateStage(tx, 'DIPROSES', 'Diproses')}
                          className="col-span-2 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mulai Persiapkan (Dapur)</span>
                        </button>
                      )}

                      {tx.tahap_pesanan === 'DIPROSES' && (
                        <button
                          onClick={() => handleUpdateStage(tx, 'SIAP', 'Diproses')}
                          className="col-span-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Pesanan Siap Diambil/Kirim</span>
                        </button>
                      )}

                      {tx.tahap_pesanan === 'SIAP' && (
                        <button
                          onClick={() => handleUpdateStage(tx, 'SELESAI', 'Selesai')}
                          className="col-span-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesaikan & Serahkan PO</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendWhatsAppPO(tx)}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      title="Kirim detail ke WhatsApp pemesan"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => onSelectTransaction(tx)}
                      className="py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1 transition"
                      title="Cetak Nota PO"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Nota</span>
                    </button>

                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => handleUpdateStage(tx, 'DIBATALKAN', 'Dibatalkan')}
                        className="py-1.5 px-2.5 rounded-xl bg-rose-950/40 border border-rose-900/40 text-rose-400 hover:bg-rose-900/60 text-xs font-bold transition"
                        title="Batalkan Pesanan PO"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Pesanan Acara / PO Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-100 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-orange-500" />
                  <span>Formulir Pesanan Acara / PO Baru</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Catat pesanan catering atau event dengan jadwal, uang muka, dan rincian menu.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPO} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Data Pemesan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Nama Pemesan / Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    value={poForm.namaPelanggan}
                    onChange={(e) => setPoForm({ ...poForm, namaPelanggan: e.target.value })}
                    placeholder="Contoh: Ust. Hamdan / Panitia DQM"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Nomor WhatsApp Kontak *
                  </label>
                  <input
                    type="text"
                    required
                    value={poForm.noWhatsapp}
                    onChange={(e) => setPoForm({ ...poForm, noWhatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Jadwal Acara */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Tanggal Acara *
                  </label>
                  <input
                    type="date"
                    required
                    value={poForm.tanggalAcara}
                    onChange={(e) => setPoForm({ ...poForm, tanggalAcara: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Jam Selesai / Ambil
                  </label>
                  <input
                    type="time"
                    value={poForm.waktuAcara}
                    onChange={(e) => setPoForm({ ...poForm, waktuAcara: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Jenis Layanan
                  </label>
                  <select
                    value={poForm.jenisLayanan}
                    onChange={(e: any) => setPoForm({ ...poForm, jenisLayanan: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Ambil Sendiri (Takeaway)">Ambil Sendiri (Takeaway)</option>
                    <option value="Antar ke Lokasi (Delivery)">Antar ke Lokasi (Delivery)</option>
                  </select>
                </div>
              </div>

              {poForm.jenisLayanan === 'Antar ke Lokasi (Delivery)' && (
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Alamat / Lokasi Pengantaran Acara
                  </label>
                  <input
                    type="text"
                    value={poForm.alamatAcara}
                    onChange={(e) => setPoForm({ ...poForm, alamatAcara: e.target.value })}
                    placeholder="Contoh: Gedung Asrama Putra DQM Lt. 2"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              {/* Tambah Item Menu ke PO */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Pilih Menu Makanan & Minuman</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="">-- Pilih Produk Menu --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({formatRupiah(p.harga_jual)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      placeholder="Qty Porsi"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddItemToPO}
                      disabled={!selectedProductId}
                      className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold text-xs transition"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>

                {/* Items in PO list */}
                {poItems.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-800">
                    {poItems.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-stone-900 text-xs"
                      >
                        <div>
                          <span className="font-bold text-stone-200">{item.product.nama}</span>
                          <span className="text-stone-400 ml-2">
                            x {item.qty} ({formatRupiah(item.product.harga_jual * item.qty)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 rounded text-[10px]"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Keuangan: Subtotal, DP, Sisa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Uang Muka / DP Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={poForm.uangMuka}
                    onChange={(e) => setPoForm({ ...poForm, uangMuka: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex flex-col justify-center text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Total Biaya PO:</span>
                    <span className="font-bold text-orange-400 font-mono">{formatRupiah(poSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Sisa Tagihan Acara:</span>
                    <span className="font-bold text-rose-400 font-mono">{formatRupiah(poRemainingBalance)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Catatan Acara / Request Khusus
                </label>
                <textarea
                  rows={2}
                  value={poForm.catatanAcara}
                  onChange={(e) => setPoForm({ ...poForm, catatanAcara: e.target.value })}
                  placeholder="Contoh: Kemasan boks terpisah, sambal dipisah, diantar tepat pukul 10:00"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={poItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg transition"
                >
                  Simpan Pesanan Acara (PO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
