import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Phone,
  User,
  Mail,
  FileText,
  CreditCard,
  QrCode,
  Wallet,
  Banknote,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Clock,
  ShieldCheck,
  XCircle,
  Share2,
  Send,
  Copy,
  Check,
  Store,
  Truck,
  Tag,
} from 'lucide-react';
import { CartItem, PaymentMethod, StoreSettings, Transaction } from '../../types';
import {
  formatRupiah,
  formatDateTime,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  buildEmailReceiptSubjectAndBody,
  compressImageFileToDataUrl,
} from '../../utils/formatters';

// ============================================================================
// 3. HALAMAN KERANJANG (ONLINE CART VIEW)
// ============================================================================
interface OnlineCartViewProps {
  cart: CartItem[];
  orderNote: string;
  onOrderNoteChange: (val: string) => void;
  orderType: 'Takeaway' | 'Delivery';
  onOrderTypeChange: (type: 'Takeaway' | 'Delivery') => void;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  appliedDiscount: number;
  onApplyPromo: () => void;
  deliveryFee: number;
  subtotal: number;
  grandTotal: number;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onUpdateItemNote: (cartKey: string, note: string) => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
}

export const getCartItemKey = (item: CartItem): string =>
  `${item.product.id}__${item.selectedVariant || 'default'}`;

export const OnlineCartView: React.FC<OnlineCartViewProps> = ({
  cart,
  orderNote,
  onOrderNoteChange,
  orderType,
  onOrderTypeChange,
  promoCode,
  onPromoCodeChange,
  appliedDiscount,
  onApplyPromo,
  deliveryFee,
  subtotal,
  grandTotal,
  onUpdateQty,
  onRemoveItem,
  onUpdateItemNote,
  onContinueShopping,
  onProceedToCheckout,
}) => {
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-stone-500">
          <ShoppingBag className="w-10 h-10 text-red-500/70" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-white">Keranjang Pesanan Kosong</h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
            Belum ada makanan atau minuman yang dipilih. Yuk pilih menu favoritmu di Warung Bang Kobra!
          </p>
        </div>
        <button
          type="button"
          onClick={onContinueShopping}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-950/50 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lihat Daftar Menu</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-red-500" />
            <span>Keranjang Belanja ({cart.reduce((s, i) => s + i.qty, 0)} Item)</span>
          </h2>
          <p className="text-xs text-stone-400">
            Periksa kembali varian rasa, jumlah, dan catatan sebelum checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={onContinueShopping}
          className="text-xs font-extrabold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Menu</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {cart.map((item) => {
          const key = getCartItemKey(item);
          return (
            <div
              key={key}
              className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-md"
            >
              <div className="flex items-start gap-3.5">
                <img
                  src={item.product.foto}
                  alt={item.product.nama}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover bg-stone-950 border border-stone-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug">
                        {item.product.nama}
                      </h3>
                      {item.selectedVariant && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-600/20 text-orange-300 border border-red-500/30">
                          Varian: {item.selectedVariant}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(key)}
                      className="p-1.5 rounded-lg bg-stone-950 hover:bg-red-950/60 text-stone-400 hover:text-red-400 border border-stone-800 transition cursor-pointer"
                      title="Hapus dari keranjang"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-stone-400">
                        {formatRupiah(item.product.harga_jual)} / {item.product.satuan}
                      </div>
                      <div className="text-sm font-black text-orange-400 font-mono">
                        {formatRupiah(item.product.harga_jual * item.qty)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(key, -1)}
                        className="w-7 h-7 rounded-lg bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center transition cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-mono font-black text-xs text-white">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(key, 1)}
                        className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-item note */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <input
                  type="text"
                  value={item.catatan || ''}
                  onChange={(e) => onUpdateItemNote(key, e.target.value)}
                  placeholder="Catatan item ini (opsional): pedas sedang, es sedikit..."
                  className="w-full bg-transparent text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Type Quick Preview & Global Note */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-stone-300 mb-2 block">
            Estimasi Jenis Pesanan
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onOrderTypeChange('Takeaway')}
              className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                orderType === 'Takeaway'
                  ? 'bg-red-600/15 border-red-500 text-white'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              <Store className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <div className="text-xs font-black">TAKEAWAY</div>
                <div className="text-[10px] text-stone-400">Ambil di Warung (Rp0)</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onOrderTypeChange('Delivery')}
              className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                orderType === 'Delivery'
                  ? 'bg-red-600/15 border-red-500 text-white'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              <Truck className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <div className="text-xs font-black">DELIVERY</div>
                <div className="text-[10px] text-stone-400">Area Pesantren DQM</div>
              </div>
            </button>
          </div>
        </div>

        {/* Promo / Discount Input */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-orange-400" />
            <span>Kode Promo / Diskon (Opsional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
              placeholder="Ketik KOBRAHEMAT untuk diskon Rp2.000"
              className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-red-500"
            />
            <button
              type="button"
              onClick={onApplyPromo}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-400 font-extrabold text-xs transition cursor-pointer"
            >
              Pakai
            </button>
          </div>
        </div>

        {/* Global Order Note */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-stone-300 mb-1.5 block">
            Catatan Pesanan Keseluruhan (Opsional)
          </label>
          <textarea
            rows={2}
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value)}
            placeholder="Contoh: Tolong pisahkan sambal, plastik dipisah..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
          Ringkasan Pembayaran
        </h3>
        <div className="flex justify-between text-xs text-stone-300">
          <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} produk)</span>
          <span className="font-mono font-bold">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-stone-300">
          <span>Ongkos Kirim ({orderType === 'Delivery' ? 'Area Pesantren DQM' : 'Takeaway'})</span>
          <span className="font-mono font-bold">
            {orderType === 'Delivery' ? formatRupiah(deliveryFee) : 'Gratis (Rp0)'}
          </span>
        </div>
        {appliedDiscount > 0 && (
          <div className="flex justify-between text-xs text-emerald-400 font-bold">
            <span>Diskon Promo</span>
            <span className="font-mono">-{formatRupiah(appliedDiscount)}</span>
          </div>
        )}
        <div className="pt-2.5 border-t border-stone-800 flex justify-between items-center">
          <span className="text-sm font-black text-white">Total Pembayaran</span>
          <span className="text-lg font-black text-orange-400 font-mono">
            {formatRupiah(grandTotal)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onProceedToCheckout}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-red-950/50 flex items-center justify-between transition active:scale-98 cursor-pointer"
      >
        <span>Lanjut ke Checkout</span>
        <span className="flex items-center gap-2 font-mono">
          <span>{formatRupiah(grandTotal)}</span>
          <ArrowRight className="w-4 h-4" />
        </span>
      </button>
    </div>
  );
};

// ============================================================================
// 4. HALAMAN CHECKOUT (ONLINE CHECKOUT VIEW)
// ============================================================================
interface OnlineCheckoutViewProps {
  cart: CartItem[];
  settings: StoreSettings;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (v: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (v: string) => void;
  orderType: 'Takeaway' | 'Delivery';
  onOrderTypeChange: (v: 'Takeaway' | 'Delivery') => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (v: string) => void;
  deliveryLandmark: string;
  onDeliveryLandmarkChange: (v: string) => void;
  pickupTime: string;
  onPickupTimeChange: (v: string) => void;
  orderNote: string;
  onOrderNoteChange: (v: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (v: PaymentMethod) => void;
  subtotal: number;
  deliveryFee: number;
  appliedDiscount: number;
  grandTotal: number;
  isSubmitting: boolean;
  onBackToCart: () => void;
  onSubmitOrder: (e: React.FormEvent) => void;
}

export const OnlineCheckoutView: React.FC<OnlineCheckoutViewProps> = ({
  cart,
  settings,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerEmail,
  onCustomerEmailChange,
  orderType,
  onOrderTypeChange,
  deliveryAddress,
  onDeliveryAddressChange,
  deliveryLandmark,
  onDeliveryLandmarkChange,
  pickupTime,
  onPickupTimeChange,
  orderNote,
  onOrderNoteChange,
  paymentMethod,
  onPaymentMethodChange,
  subtotal,
  deliveryFee,
  appliedDiscount,
  grandTotal,
  isSubmitting,
  onBackToCart,
  onSubmitOrder,
}) => {
  const minDeliveryOrder = settings.deliveryMinOrder || 20000;
  const isDeliveryBelowMinimum = orderType === 'Delivery' && subtotal < minDeliveryOrder;
  const remainingForDelivery = Math.max(0, minDeliveryOrder - subtotal);

  const paymentOptions: Array<{
    id: PaymentMethod;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'Cash',
      label: 'Tunai (Cash)',
      desc: 'Bayar tunai saat pesanan diambil atau diantar',
      icon: <Banknote className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'QRIS',
      label: 'QRIS Resmi',
      desc: 'Scan QRIS Warung Bang Kobra dari semua aplikasi bank/e-wallet',
      icon: <QrCode className="w-4 h-4 text-orange-400" />,
    },
    {
      id: 'Transfer',
      label: 'Transfer Bank',
      desc: settings.onlineMenuBankInfo || 'Transfer rekening bank resmi warung',
      icon: <Building2 className="w-4 h-4 text-sky-400" />,
    },
    {
      id: 'E-wallet',
      label: 'E-Wallet',
      desc: settings.ewalletInfo || 'DANA / GoPay / OVO / ShopeePay',
      icon: <Wallet className="w-4 h-4 text-purple-400" />,
    },
  ];

  return (
    <form onSubmit={onSubmitOrder} className="max-w-3xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToCart}
          className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white">Checkout Pesanan</h2>
          <p className="text-xs text-stone-400">
            Lengkapi data pemesan, metode pengambilan, dan pembayaran.
          </p>
        </div>
      </div>

      {/* Data Pelanggan */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
          <User className="w-4 h-4" />
          <span>1. Informasi Pelanggan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-bold text-stone-200 mb-1 block">
              Nama Lengkap Pelanggan *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Contoh: Ahmad Fauzi / Santri DQM"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-200 mb-1 block">
              Nomor WhatsApp Aktif * (Wajib)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => onCustomerPhoneChange(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
              <span>Alamat Email (Opsional - Tidak Wajib)</span>
              <span className="text-[10px] text-stone-500">Untuk kirim salinan struk</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => onCustomerEmailChange(e.target.value)}
                placeholder="email@contoh.com (boleh dikosongkan)"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pilihan Jenis Pesanan: TAKEAWAY vs DELIVERY */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>2. Jenis Pesanan (Takeaway / Delivery)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onOrderTypeChange('Takeaway')}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
              orderType === 'Takeaway'
                ? 'bg-red-600/15 border-red-500 text-white shadow-md'
                : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-orange-400 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">TAKEAWAY (Ambil Sendiri)</div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Pesanan disiapkan lebih dulu, langsung ambil di Warung Bang Kobra tanpa antre.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOrderTypeChange('Delivery')}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
              orderType === 'Delivery'
                ? 'bg-red-600/15 border-red-500 text-white shadow-md'
                : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">DELIVERY (Pesan Antar)</div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Khusus area sekitar <strong className="text-orange-300">Pesantren DQM</strong>. Minimal belanja Rp20.000.
              </p>
            </div>
          </button>
        </div>

        {/* Validation Banner for Delivery */}
        {orderType === 'Delivery' && (
          <div className="space-y-3 pt-1">
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                isDeliveryBelowMinimum
                  ? 'bg-red-950/60 border-red-500/60 text-red-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {isDeliveryBelowMinimum ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-extrabold">
                  {isDeliveryBelowMinimum
                    ? `Belum Memenuhi Minimal Belanja Delivery (${formatRupiah(minDeliveryOrder)})`
                    : 'Syarat Minimal Belanja Delivery Terpenuhi!'}
                </div>
                <p className="text-[11px] opacity-90">
                  {isDeliveryBelowMinimum
                    ? `Subtotal belanja Anda saat ini ${formatRupiah(subtotal)}. Tambah produk senilai ${formatRupiah(remainingForDelivery)} lagi untuk menggunakan layanan Delivery area Pesantren DQM, atau pilih TAKEAWAY.`
                    : `Layanan pengantaran tersedia khusus untuk area sekitar Pesantren DQM (Asrama, Gedung Sekolah, Pos Satpam, & sekitarnya).`}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-200 mb-1 block">
                Alamat / Titik Pengantaran (Area Sekitar Pesantren DQM) *
              </label>
              <textarea
                rows={2}
                required={orderType === 'Delivery'}
                value={deliveryAddress}
                onChange={(e) => onDeliveryAddressChange(e.target.value)}
                placeholder="Contoh: Gerbang Utama Pesantren DQM / Asrama Putra Gedung B / Pos Satpam DQM..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Patokan Lokasi / Nama Penerima di Titik Antar (Opsional)
              </label>
              <input
                type="text"
                value={deliveryLandmark}
                onChange={(e) => onDeliveryLandmarkChange(e.target.value)}
                placeholder="Contoh: Titip di ustadz piket / dekat koperasi DQM"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        )}

        {orderType === 'Takeaway' && (
          <div>
            <label className="text-xs font-bold text-stone-300 mb-1 block">
              Waktu Pengambilan di Warung
            </label>
            <input
              type="text"
              value={pickupTime}
              onChange={(e) => onPickupTimeChange(e.target.value)}
              placeholder="Contoh: Sekarang (15 menit) / Jam 16:30 sore"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-stone-300 mb-1 block">
            Catatan Pesanan (Opsional)
          </label>
          <input
            type="text"
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value)}
            placeholder="Catatan tambahan untuk dapur / kurir..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Pilihan Metode Pembayaran */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4" />
          <span>3. Metode Pembayaran</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {paymentOptions.map((opt) => {
            const active = paymentMethod === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPaymentMethodChange(opt.id)}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  active
                    ? 'bg-red-600/15 border-red-500 text-white shadow-sm'
                    : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                <div className="mt-0.5 p-2 rounded-lg bg-stone-900 border border-stone-800 shrink-0">
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white flex items-center justify-between">
                    <span>{opt.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-orange-400" />}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringkasan Pesanan & Total Akhir */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
          Ringkasan Pesanan ({cart.reduce((s, i) => s + i.qty, 0)} Item)
        </h3>
        <div className="divide-y divide-stone-800/70 max-h-52 overflow-y-auto pr-1">
          {cart.map((item) => (
            <div key={getCartItemKey(item)} className="py-2 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-white">{item.qty}x {item.product.nama}</span>
                {item.selectedVariant && (
                  <span className="ml-1.5 text-orange-400 font-semibold">({item.selectedVariant})</span>
                )}
                {item.catatan && (
                  <div className="text-[10px] text-stone-400 italic">Catatan: {item.catatan}</div>
                )}
              </div>
              <span className="font-mono font-bold text-stone-200 shrink-0">
                {formatRupiah(item.product.harga_jual * item.qty)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-stone-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-300">
            <span>Subtotal Produk</span>
            <span className="font-mono">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>Ongkos Kirim ({orderType})</span>
            <span className="font-mono">
              {orderType === 'Delivery' ? formatRupiah(deliveryFee) : 'Rp0'}
            </span>
          </div>
          {appliedDiscount > 0 && (
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Diskon</span>
              <span className="font-mono">-{formatRupiah(appliedDiscount)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-stone-800 flex justify-between items-center">
            <span className="text-sm font-black text-white">Total Akhir</span>
            <span className="text-lg font-black text-orange-400 font-mono">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isDeliveryBelowMinimum}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-500 text-white font-black text-sm shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span>Memproses Pesanan ke Server...</span>
        ) : isDeliveryBelowMinimum ? (
          <span>Minimal Belanja Delivery {formatRupiah(minDeliveryOrder)}</span>
        ) : (
          <>
            <span>Pesan Sekarang</span>
            <span>•</span>
            <span className="font-mono">{formatRupiah(grandTotal)}</span>
          </>
        )}
      </button>
    </form>
  );
};

// ============================================================================
// 5. HALAMAN PEMBAYARAN (ONLINE PAYMENT VIEW)
// ============================================================================
interface OnlinePaymentViewProps {
  order: Transaction;
  settings: StoreSettings;
  qrisFallbackDataUrl: string;
  isUploadingProof: boolean;
  onUploadProof: (dataUrl: string) => Promise<void>;
  onContinueToSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OnlinePaymentView: React.FC<OnlinePaymentViewProps> = ({
  order,
  settings,
  qrisFallbackDataUrl,
  isUploadingProof,
  onUploadProof,
  onContinueToSuccess,
  showToast,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const paymentStatus = order.status_pembayaran || 'MENUNGGU';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 900, 0.78);
      await onUploadProof(compressed);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memproses gambar bukti pembayaran', 'error');
    }
  };

  const handleCopyInfo = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(true);
    showToast('Informasi pembayaran berhasil disalin!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const statusBadge = () => {
    switch (paymentStatus) {
      case 'LUNAS':
        return (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                STATUS PEMBAYARAN: LUNAS
              </div>
              <p className="text-[11px]">
                Pembayaran telah dikonfirmasi oleh kasir/admin Warung Bang Kobra.
              </p>
            </div>
          </div>
        );
      case 'DIVERIFIKASI':
        return (
          <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                STATUS PEMBAYARAN: SEDANG DIVERIFIKASI
              </div>
              <p className="text-[11px]">
                Bukti pembayaran sudah diterima dan sedang diperiksa oleh admin/kasir. Pembayaran belum dianggap lunas sebelum dikonfirmasi.
              </p>
            </div>
          </div>
        );
      case 'DITOLAK':
        return (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-red-300">
                STATUS PEMBAYARAN: DITOLAK
              </div>
              <p className="text-[11px]">
                Bukti pembayaran tidak valid atau dana belum masuk. Silakan unggah ulang bukti yang benar atau hubungi warung.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-3.5 rounded-2xl bg-stone-900 border border-orange-500/40 text-stone-200 flex items-center gap-3">
            <Clock className="w-6 h-6 text-orange-400 shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-orange-400">
                STATUS PEMBAYARAN: MENUNGGU KONFIRMASI
              </div>
              <p className="text-[11px] text-stone-400">
                Pembayaran belum dianggap berhasil sebelum dikonfirmasi oleh kasir/admin Warung Bang Kobra.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 py-6 space-y-5">
      <div className="text-center space-y-1">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-600/20 text-orange-400 border border-red-500/30">
          Tahap Pembayaran
        </span>
        <h2 className="text-xl font-black text-white pt-1">Selesaikan Pembayaran</h2>
        <p className="text-xs text-stone-400 font-mono">Nomor Pesanan: {order.id_transaksi}</p>
      </div>

      {/* Payment Status Realtime Banner */}
      {statusBadge()}

      {/* Payment Details Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div>
            <div className="text-[11px] text-stone-400">Metode Pembayaran Dipilih</div>
            <div className="text-base font-black text-white mt-0.5">{order.metode_pembayaran}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-stone-400">Total Tagihan</div>
            <div className="text-lg font-black text-orange-400 font-mono">
              {formatRupiah(order.total)}
            </div>
          </div>
        </div>

        {/* QRIS Display */}
        {order.metode_pembayaran === 'QRIS' && (
          <div className="text-center space-y-3 py-2">
            <div className="inline-block p-4 rounded-2xl bg-white shadow-lg border-4 border-red-600/20">
              <img
                src={settings.qrisImageUrl || qrisFallbackDataUrl}
                alt="QRIS Resmi Warung Bang Kobra"
                className="w-56 h-56 object-contain mx-auto"
              />
              <div className="mt-2 pt-2 border-t border-stone-200 text-stone-900 font-black text-xs">
                {settings.storeName}
              </div>
              <div className="text-[10px] text-stone-500 font-semibold">
                {settings.qrisImageUrl ? 'QRIS Resmi Warung' : 'QRIS Standar Pembayaran'}
              </div>
            </div>
            <p className="text-xs text-stone-300 max-w-sm mx-auto">
              Scan kode QRIS di atas melalui aplikasi Mobile Banking, GoPay, OVO, DANA, atau ShopeePay sesuai nominal{' '}
              <strong className="text-orange-400">{formatRupiah(order.total)}</strong>.
            </p>
          </div>
        )}

        {/* Bank Transfer Display */}
        {order.metode_pembayaran === 'Transfer' && (
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
            <div className="text-xs font-bold text-stone-400">Rekening Tujuan Transfer Bank:</div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white font-mono">
                {settings.onlineMenuBankInfo || 'Bank BSI: 7192837465 a.n Warung Bang Kobra'}
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyInfo(
                    settings.onlineMenuBankInfo || 'Bank BSI: 7192837465 a.n Warung Bang Kobra'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-400 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
        )}

        {/* E-Wallet Display */}
        {order.metode_pembayaran === 'E-wallet' && (
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
            <div className="text-xs font-bold text-stone-400">Nomor E-Wallet Warung Bang Kobra:</div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white font-mono">
                {settings.ewalletInfo || `DANA / GoPay / OVO: ${settings.whatsappNumber}`}
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyInfo(settings.ewalletInfo || settings.whatsappNumber)
                }
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-400 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Cash Display */}
        {order.metode_pembayaran === 'Cash' && (
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
            <div className="text-xs font-extrabold text-emerald-400">
              Pembayaran Tunai (Cash)
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Siapkan uang tunai sebesar <strong className="text-white">{formatRupiah(order.total)}</strong> saat{' '}
              {order.tipe_pesanan === 'Delivery'
                ? 'kurir mengantarkan pesanan ke titik pengantaran Pesantren DQM.'
                : 'Anda mengambil pesanan di kasir Warung Bang Kobra.'}
            </p>
          </div>
        )}

        {/* Upload Payment Proof Section */}
        <div className="pt-3 border-t border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold text-white">
                Unggah Bukti Pembayaran {order.metode_pembayaran === 'Cash' ? '(Opsional)' : ''}
              </h4>
              <p className="text-[11px] text-stone-400">
                Unggah tangkapan layar (screenshot) atau foto bukti transfer/QRIS agar cepat diverifikasi.
              </p>
            </div>
          </div>

          {order.bukti_pembayaran_url && (
            <div className="p-3 rounded-2xl bg-stone-950 border border-emerald-500/40 flex items-center gap-3">
              <img
                src={order.bukti_pembayaran_url}
                alt="Bukti Pembayaran"
                className="w-16 h-16 rounded-xl object-cover border border-stone-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bukti Pembayaran Terunggah</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Status: <strong className="text-amber-300">{paymentStatus}</strong>
                </p>
              </div>
            </div>
          )}

          <label className="w-full py-3 px-4 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-dashed border-stone-700 hover:border-orange-500 text-stone-200 font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
            <Upload className="w-4 h-4 text-orange-400" />
            <span>
              {isUploadingProof
                ? 'Mengunggah Bukti Pembayaran...'
                : order.bukti_pembayaran_url
                ? 'Ganti Foto Bukti Pembayaran'
                : 'Pilih & Unggah Foto Bukti Pembayaran'}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={isUploadingProof}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinueToSuccess}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <span>Lanjut ke Bukti & Rincian Pesanan</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// 6. HALAMAN PESANAN BERHASIL (ONLINE ORDER SUCCESS VIEW)
// ============================================================================
interface OnlineOrderSuccessViewProps {
  order: Transaction;
  settings: StoreSettings;
  onViewOrderDetail: (order: Transaction) => void;
  onBackToHome: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OnlineOrderSuccessView: React.FC<OnlineOrderSuccessViewProps> = ({
  order,
  settings,
  onViewOrderDetail,
  onBackToHome,
  showToast,
}) => {
  const [emailInput, setEmailInput] = useState(order.email_pelanggan || '');

  const handleShareWhatsApp = () => {
    const msg = buildWhatsAppOrderMessage({
      orderId: order.id_transaksi,
      storeName: settings.storeName,
      orderType: order.tipe_pesanan === 'Delivery' ? 'Delivery' : 'Takeaway',
      customerName: order.nama_pelanggan,
      customerPhone: order.no_hp_pelanggan || '-',
      customerEmail: emailInput || order.email_pelanggan,
      pickupTime: order.waktu_ambil,
      deliveryAddress: order.alamat_pengiriman,
      deliveryLandmark: order.patokan_lokasi,
      paymentMethod: order.metode_pembayaran,
      items: order.items.map((i) => ({
        nama: i.nama_produk,
        qty: i.qty,
        harga: i.harga_satuan,
        catatan: i.catatan_item,
        variant: i.varian,
      })),
      subtotal: order.subtotal,
      shippingFee: order.ongkir || 0,
      grandTotal: order.total,
      notes: order.catatan,
    });

    const url = buildWhatsAppUrl(settings.whatsappNumber, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendEmailReceipt = () => {
    const targetEmail = (emailInput || order.email_pelanggan || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('Masukkan alamat email yang valid terlebih dahulu untuk mengirim struk.', 'error');
      return;
    }
    const { subject, body } = buildEmailReceiptSubjectAndBody({
      orderId: order.id_transaksi,
      storeName: settings.storeName,
      orderType: order.tipe_pesanan,
      customerName: order.nama_pelanggan,
      customerPhone: order.no_hp_pelanggan || '-',
      customerEmail: targetEmail,
      paymentMethod: order.metode_pembayaran,
      paymentStatus: order.status_pembayaran || 'MENUNGGU',
      createdAt: `${order.tanggal} ${order.jam}`,
      deliveryAddress: order.alamat_pengiriman,
      items: order.items.map((i) => ({
        nama: i.nama_produk,
        variant: i.varian,
        qty: i.qty,
        harga: i.harga_satuan,
        catatan: i.catatan_item,
      })),
      subtotal: order.subtotal,
      shippingFee: order.ongkir || 0,
      discount: order.diskon || 0,
      grandTotal: order.total,
      notes: order.catatan,
    });

    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showToast(`Membuka aplikasi email untuk mengirim struk ke ${targetEmail}`, 'success');
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 py-6 space-y-5">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Pesanan Tercatat di Sistem
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
            Pesanan Berhasil Dibuat!
          </h2>
          <p className="text-xs text-stone-400">
            Simpan nomor pesanan Anda untuk melacak status pesanan secara realtime.
          </p>
        </div>

        {/* Order Number Highlight */}
        <div className="p-4 rounded-2xl bg-stone-950 border border-red-500/40 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            Nomor Pesanan Otomatis
          </div>
          <div className="text-lg sm:text-xl font-black text-orange-400 font-mono tracking-wider select-all">
            {order.id_transaksi}
          </div>
          <div className="text-[11px] text-stone-400">
            Waktu Pemesanan: {formatDateTime(order.created_at || `${order.tanggal} ${order.jam}`)}
          </div>
        </div>

        {/* Order Breakdown */}
        <div className="text-left bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs pb-2.5 border-b border-stone-800">
            <div>
              <span className="text-stone-400 block text-[11px]">Pelanggan</span>
              <span className="font-bold text-white">{order.nama_pelanggan}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Jenis Pesanan</span>
              <span className="font-black text-orange-400 uppercase">{order.tipe_pesanan}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Metode Pembayaran</span>
              <span className="font-bold text-white">{order.metode_pembayaran}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Status Pembayaran</span>
              <span className="font-extrabold text-amber-400">
                {order.status_pembayaran || 'MENUNGGU'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Rincian Menu Dipesan
            </div>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs text-stone-200">
                <span>
                  {item.qty}x {item.nama_produk}
                  {item.varian ? ` (${item.varian})` : ''}
                </span>
                <span className="font-mono font-bold">{formatRupiah(item.subtotal)}</span>
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
            <div className="flex justify-between items-center pt-1.5 border-t border-stone-800">
              <span className="font-black text-white text-sm">Total Pembayaran</span>
              <span className="font-mono font-black text-base text-orange-400">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Share via WhatsApp & Optional Email Receipt */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Bukti Pesanan via WhatsApp</span>
          </button>

          {/* Optional Email Receipt */}
          <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2 text-left">
            <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-orange-400" />
              <span>Kirim Struk melalui Email (Opsional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Ketik email Anda (tidak wajib)..."
                className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleSendEmailReceipt}
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-400 font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Navigation Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => onViewOrderDetail(order)}
            className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs sm:text-sm transition cursor-pointer"
          >
            Lihat & Lacak Pesanan
          </button>
          <button
            type="button"
            onClick={onBackToHome}
            className="py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-extrabold text-xs sm:text-sm transition cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
