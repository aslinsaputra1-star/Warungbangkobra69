import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Bell,
  Flame,
  Star,
  Plus,
  Home,
  Receipt,
  User,
  MapPin,
  Clock,
  Phone,
  Sparkles,
  CheckCircle2,
  X,
  ArrowLeft,
  Store,
  ShieldCheck,
  MessageCircle,
  LogIn,
} from 'lucide-react';
import {
  CartItem,
  PaymentMethod,
  Product,
  StoreSettings,
  Transaction,
  TransactionDetail,
} from '../../types';
import { BrandLogo } from '../Common/BrandLogo';
import { formatRupiah, buildWhatsAppUrl } from '../../utils/formatters';
import { generateQRDataUrl } from '../../utils/qrcode';
import { StorageService } from '../../services/storage';
import { HERO_PROMO_IMAGE } from '../../data/initialData';
import {
  auth,
  createOnlineOrderTransaction,
  subscribeToFirebaseOrders,
  subscribeToFirebaseProducts,
  subscribeToFirebaseSettings,
  uploadPaymentProofToFirebase,
  loginWithGoogleFirebase,
} from '../../services/firebase';
import { ProductDetailModal } from './ProductDetailModal';
import { PWAInstallButton } from '../PWAInstallButton';
import {
  OnlineCartView,
  OnlineCheckoutView,
  OnlinePaymentView,
  OnlineOrderSuccessView,
  getCartItemKey,
} from './CartCheckoutPaymentViews';
import {
  MyOrdersListView,
  OrderTrackingDetailView,
  resolveOnlineOrderStage,
  getStageLabel,
} from './OrderTrackingViews';

export type OnlinePage =
  | 'BERANDA'
  | 'KERANJANG'
  | 'CHECKOUT'
  | 'PEMBAYARAN'
  | 'SUKSES'
  | 'PESANAN_SAYA'
  | 'DETAIL_PESANAN'
  | 'PROFIL';

const CUSTOMER_ORDERS_META_KEY = 'wkb_customer_order_ids_v1';
const CUSTOMER_PROFILE_META_KEY = 'wkb_customer_profile_v1';

interface PublicMenuCustomerViewProps {
  products: Product[];
  settings: StoreSettings;
  initialOrderType?: 'Takeaway' | 'Delivery';
  onOpenPOS?: () => void;
  onOrderCreated?: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicMenuCustomerView: React.FC<PublicMenuCustomerViewProps> = ({
  products: propProducts,
  settings: propSettings,
  initialOrderType = 'Takeaway',
  onOpenPOS,
  onOrderCreated,
  showToast,
}) => {
  // Live synced state from Firebase Firestore
  const [liveProducts, setLiveProducts] = useState<Product[]>(propProducts);
  const [liveSettings, setLiveSettings] = useState<StoreSettings>(propSettings);
  const [allFirebaseOrders, setAllFirebaseOrders] = useState<Transaction[]>([]);

  useEffect(() => {
    setLiveProducts(propProducts);
  }, [propProducts]);

  useEffect(() => {
    setLiveSettings(propSettings);
  }, [propSettings]);

  // Realtime Firestore listeners
  useEffect(() => {
    const unsubProducts = subscribeToFirebaseProducts((prods) => {
      if (prods && prods.length > 0) {
        StorageService.saveProducts(prods);
        const resolved = StorageService.getProducts();
        setLiveProducts(resolved);
      }
    });
    const unsubSettings = subscribeToFirebaseSettings((cloudSettings) => {
      setLiveSettings((prev) => ({ ...prev, ...cloudSettings }));
    });
    const unsubOrders = subscribeToFirebaseOrders((orders) => {
      setAllFirebaseOrders(orders);
    });
    return () => {
      unsubProducts();
      unsubSettings();
      unsubOrders();
    };
  }, []);

  // Active Navigation Page
  const [activePage, setActivePage] = useState<OnlinePage>('BERANDA');

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Product Detail Modal State
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  // Notification Popover
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Cart & Promo State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  // Customer Profile & Checkout Form State
  const savedProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem(CUSTOMER_PROFILE_META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const [customerName, setCustomerName] = useState<string>(savedProfile.name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(savedProfile.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(savedProfile.email || '');
  const [orderType, setOrderType] = useState<'Takeaway' | 'Delivery'>(initialOrderType);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(savedProfile.address || '');
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>(savedProfile.landmark || '');
  const [pickupTime, setPickupTime] = useState<string>('Sekarang (15 Menit)');
  const [orderNote, setOrderNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');

  // Tracked Order IDs for this customer
  const [myOrderIds, setMyOrderIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOMER_ORDERS_META_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [customerPhoneFilter, setCustomerPhoneFilter] = useState<string>(savedProfile.phone || '');

  // Active Order for Payment / Success / Detail Tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [qrisFallbackDataUrl, setQrisFallbackDataUrl] = useState<string>('');

  // Generate QRIS fallback image
  useEffect(() => {
    generateQRDataUrl(
      `00020101021126570014ID.CO.QRIS.WWW0215ID20260000000015204581253033605802ID5917${liveSettings.storeName.slice(
        0,
        17
      )}6005BOGOR6304KOBR`
    )
      .then(setQrisFallbackDataUrl)
      .catch(() => {});
  }, [liveSettings.storeName]);

  // Categories list required by prompt:
  // Minuman, Makanan, Pop Ice, Good Day, Chocolatos, Hilo, Nutrisari, dan Lainnya
  const categoryTabs = [
    'Semua',
    'Makanan',
    'Minuman',
    'Pop Ice',
    'Good Day',
    'Chocolatos',
    'Hilo',
    'Nutrisari',
    'Lainnya',
  ];

  const activeProducts = useMemo(
    () => liveProducts.filter((p) => p.status === 'Aktif'),
    [liveProducts]
  );

  const favoriteProducts = useMemo(
    () => activeProducts.filter((p) => p.is_favorit),
    [activeProducts]
  );

  const bestsellerProducts = useMemo(
    () => activeProducts.filter((p) => p.is_terlaris),
    [activeProducts]
  );

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      if (selectedCategory !== 'Semua') {
        if (selectedCategory === 'Lainnya') {
          const matchOther =
            product.kategori === 'Lainnya' ||
            product.kategori === 'Snack' ||
            product.kategori === 'Tambahan';
          if (!matchOther) return false;
        } else if (product.kategori !== selectedCategory) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.nama.toLowerCase().includes(q);
        const matchDesc = product.deskripsi?.toLowerCase().includes(q);
        const matchCat = product.kategori.toLowerCase().includes(q);
        const matchVar = product.varian?.some((v) => v.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchCat && !matchVar) return false;
      }

      return true;
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  // Filter orders belonging ONLY to this customer
  const myOrders = useMemo(() => {
    const currentUid = auth.currentUser?.uid;
    const cleanPhone = (customerPhoneFilter || customerPhone || '').replace(/\D/g, '');
    const idSet = new Set(myOrderIds);

    return allFirebaseOrders.filter((order) => {
      if (idSet.has(order.id_transaksi)) return true;
      if (currentUid && order.customer_uid && order.customer_uid === currentUid) return true;
      if (cleanPhone.length >= 9 && order.no_hp_pelanggan) {
        const orderPhone = order.no_hp_pelanggan.replace(/\D/g, '');
        if (orderPhone.endsWith(cleanPhone.slice(-9))) return true;
      }
      return false;
    });
  }, [allFirebaseOrders, myOrderIds, customerPhoneFilter, customerPhone]);

  // Active order resolved live from Firestore
  const activeOrder = useMemo(() => {
    if (!activeOrderId) return myOrders[0] || null;
    return (
      allFirebaseOrders.find((o) => o.id_transaksi === activeOrderId) ||
      myOrders.find((o) => o.id_transaksi === activeOrderId) ||
      null
    );
  }, [activeOrderId, allFirebaseOrders, myOrders]);

  // Cart Calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.harga_jual * item.qty, 0),
    [cart]
  );

  const deliveryFee = useMemo(() => {
    if (orderType !== 'Delivery') return 0;
    return liveSettings.deliveryFee ?? 3000;
  }, [orderType, liveSettings.deliveryFee]);

  const grandTotal = useMemo(
    () => Math.max(0, subtotal + deliveryFee - appliedDiscount),
    [subtotal, deliveryFee, appliedDiscount]
  );

  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  // Add to cart handler
  const handleAddToCart = (
    product: Product,
    qty = 1,
    variant?: string,
    note?: string
  ) => {
    if (product.stok <= 0) {
      showToast(`Maaf, stok ${product.nama} sedang habis.`, 'error');
      return;
    }

    setCart((prev) => {
      const targetKey = `${product.id}__${variant || 'default'}`;
      const existingIndex = prev.findIndex((i) => getCartItemKey(i) === targetKey);

      if (existingIndex >= 0) {
        const currentQty = prev[existingIndex].qty;
        const nextQty = Math.min(product.stok, currentQty + qty);
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: nextQty,
          catatan: note || updated[existingIndex].catatan,
        };
        return updated;
      }

      return [
        ...prev,
        {
          product,
          qty: Math.min(product.stok, qty),
          selectedVariant: variant,
          catatan: note,
        },
      ];
    });

    showToast(
      `${qty}x ${product.nama}${variant ? ` (${variant})` : ''} ditambahkan ke keranjang!`,
      'success'
    );
  };

  const handleQuickProductClick = (product: Product) => {
    if (product.stok <= 0) {
      showToast(`Maaf, ${product.nama} sedang HABIS.`, 'error');
      return;
    }
    setSelectedProductForModal(product);
  };

  const handleUpdateCartQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (getCartItemKey(item) !== cartKey) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.stok) {
            showToast(`Maksimal stok tersedia: ${item.product.stok}`, 'info');
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => getCartItemKey(item) !== cartKey));
  };

  const handleUpdateItemNote = (cartKey: string, note: string) => {
    setCart((prev) =>
      prev.map((item) => (getCartItemKey(item) === cartKey ? { ...item, catatan: note } : item))
    );
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'KOBRAHEMAT' || code === 'WBK2000' || code === 'SANTRIDQM') {
      setAppliedDiscount(2000);
      showToast('Kode promo berhasil diterapkan! Hemat Rp2.000', 'success');
    } else if (!code) {
      setAppliedDiscount(0);
    } else {
      showToast('Kode promo tidak ditemukan. Coba ketik: KOBRAHEMAT', 'error');
    }
  };

  // Submit Checkout Order to Firestore via Atomic Transaction
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Keranjang belanja Anda masih kosong!', 'error');
      return;
    }
    if (!customerName.trim()) {
      showToast('Nama pelanggan wajib diisi!', 'error');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 9) {
      showToast('Nomor WhatsApp aktif wajib diisi dengan benar!', 'error');
      return;
    }

    const minDelivery = liveSettings.deliveryMinOrder || 20000;
    if (orderType === 'Delivery') {
      if (subtotal < minDelivery) {
        showToast(
          `Minimal belanja untuk layanan Delivery adalah ${formatRupiah(minDelivery)}!`,
          'error'
        );
        return;
      }
      if (!deliveryAddress.trim()) {
        showToast('Alamat atau titik pengantaran area Pesantren DQM wajib diisi!', 'error');
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      const now = new Date();
      const tanggal = now.toISOString().split('T')[0];
      const jam = now.toTimeString().slice(0, 5);
      const orderId = StorageService.generateInvoiceNumber('WBK', 4);

      const items: TransactionDetail[] = cart.map((item) => ({
        id_detail: `DTL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id_transaksi: orderId,
        id_produk: item.product.id,
        nama_produk: item.product.nama,
        varian: item.selectedVariant,
        harga_satuan: item.product.harga_jual,
        qty: item.qty,
        subtotal: item.product.harga_jual * item.qty,
        catatan_item: item.catatan,
      }));

      const newOrder: Transaction = {
        id_transaksi: orderId,
        tanggal,
        jam,
        nama_pelanggan: customerName.trim(),
        no_hp_pelanggan: customerPhone.trim(),
        email_pelanggan: customerEmail.trim() || undefined,
        customer_uid: auth.currentUser?.uid || undefined,
        tipe_pesanan: orderType,
        waktu_ambil: orderType === 'Takeaway' ? pickupTime : undefined,
        alamat_pengiriman: orderType === 'Delivery' ? deliveryAddress.trim() : undefined,
        patokan_lokasi: orderType === 'Delivery' ? deliveryLandmark.trim() : undefined,
        ongkir: deliveryFee,
        kasir: 'Pesanan Online',
        subtotal,
        diskon: appliedDiscount,
        total: grandTotal,
        metode_pembayaran: paymentMethod,
        status_pembayaran: 'MENUNGGU',
        jumlah_bayar: grandTotal,
        kembalian: 0,
        status: 'Pending',
        tahap_pesanan: 'MENUNGGU',
        stok_dikurangi: false,
        timeline_status: [
          {
            tahap: 'MENUNGGU',
            waktu: now.toISOString(),
            catatan: 'Pesanan online dibuat oleh pelanggan',
          },
        ],
        sumber_pesanan: 'Online',
        catatan: orderNote.trim() || undefined,
        items,
        created_at: now.toISOString(),
        idempotency_key: `IDEMP-${orderId}`,
      };

      const res = await createOnlineOrderTransaction(newOrder);
      if (!res.success) {
        showToast(res.error || 'Gagal membuat pesanan. Silakan coba lagi.', 'error');
        setIsSubmittingOrder(false);
        return;
      }

      // Save customer profile & tracked order ID for this device
      const nextOrderIds = [orderId, ...myOrderIds.filter((id) => id !== orderId)];
      setMyOrderIds(nextOrderIds);
      setCustomerPhoneFilter(customerPhone.trim());
      try {
        localStorage.setItem(CUSTOMER_ORDERS_META_KEY, JSON.stringify(nextOrderIds));
        localStorage.setItem(
          CUSTOMER_PROFILE_META_KEY,
          JSON.stringify({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim(),
            address: deliveryAddress.trim(),
            landmark: deliveryLandmark.trim(),
          })
        );
      } catch {
        // ignore storage quota errors
      }

      // Also sync with parent state
      const currentTxs = StorageService.getTransactions();
      StorageService.saveTransactions([newOrder, ...currentTxs]);
      onOrderCreated?.(newOrder);

      // Clear cart and navigate to Halaman Pembayaran
      setCart([]);
      setAppliedDiscount(0);
      setPromoCode('');
      setActiveOrderId(orderId);
      setActivePage('PEMBAYARAN');
      showToast(`Pesanan ${orderId} berhasil dibuat!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan saat memproses pesanan.', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Upload payment proof handler
  const handleUploadPaymentProof = async (dataUrl: string) => {
    if (!activeOrder) return;
    setIsUploadingProof(true);
    try {
      const res = await uploadPaymentProofToFirebase(activeOrder.id_transaksi, dataUrl);
      if (res.success) {
        showToast(
          'Bukti pembayaran berhasil diunggah! Status pembayaran: DIVERIFIKASI.',
          'success'
        );
      } else {
        showToast(res.error || 'Gagal mengunggah bukti pembayaran', 'error');
      }
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Render Reusable Product Card
  const renderProductCard = (product: Product, compact = false) => {
    const isOutOfStock = product.stok <= 0;
    const hasVariants = Array.isArray(product.varian) && product.varian.length > 0;
    const inCartQty = cart
      .filter((i) => i.product.id === product.id)
      .reduce((s, i) => s + i.qty, 0);

    return (
      <div
        key={product.id}
        onClick={() => handleQuickProductClick(product)}
        className={`group bg-stone-900 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 ${
          isOutOfStock
            ? 'border-stone-800/80 opacity-65 cursor-not-allowed'
            : 'border-stone-800 hover:border-red-500/60 hover:shadow-xl hover:shadow-red-950/20 cursor-pointer'
        }`}
      >
        <div>
          <div className={`relative ${compact ? 'h-32 sm:h-36' : 'h-36 sm:h-44'} bg-stone-950 overflow-hidden`}>
            <img
              src={product.foto}
              alt={product.nama}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-black/30" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-black/75 text-stone-200 border border-white/10 backdrop-blur-sm truncate">
                {product.kategori}
              </span>
              {product.is_terlaris && !isOutOfStock && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-600 text-white flex items-center gap-0.5 shadow">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  Lariss
                </span>
              )}
            </div>

            {/* HABIS Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center">
                <span className="px-3.5 py-1 rounded-lg bg-red-600 text-white font-black text-xs tracking-widest uppercase border border-red-400 shadow-lg">
                  HABIS
                </span>
              </div>
            )}

            {/* Variant Pill Indicator */}
            {hasVariants && !isOutOfStock && (
              <div className="absolute bottom-2 left-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 backdrop-blur-sm">
                  {product.varian!.length} Pilihan Rasa
                </span>
              </div>
            )}

            {inCartQty > 0 && (
              <div className="absolute bottom-2 right-2.5 px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] shadow">
                {inCartQty}x di Keranjang
              </div>
            )}
          </div>

          <div className="p-3 sm:p-3.5 space-y-1">
            <h3 className="font-extrabold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-orange-400 transition">
              {product.nama}
            </h3>
            <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
              {product.deskripsi || `Menu segar ${product.kategori} khas Warung Bang Kobra`}
            </p>
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 pt-1 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs sm:text-sm font-black text-orange-400 font-mono">
              {formatRupiah(product.harga_jual)}
            </div>
            <div className="text-[10px] text-stone-500">
              {isOutOfStock ? 'Stok Kosong' : `Stok: ${product.stok}`}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              handleQuickProductClick(product);
            }}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition ${
              isOutOfStock
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-md shadow-red-950/40 active:scale-95 cursor-pointer'
            }`}
          >
            {isOutOfStock ? (
              <span>HABIS</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col pb-24 sm:pb-16 selection:bg-red-600 selection:text-white">
      {/* =====================================================================
          MODERN STICKY HEADER (Logo, Nama Warung, Keranjang, Notifikasi)
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-xl border-b border-stone-800/90">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Warung Brand Logo + Name */}
          <div
            onClick={() => setActivePage('BERANDA')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <BrandLogo
              logoUrl={liveSettings.logoUrl}
              storeName={liveSettings.storeName}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white truncate">
                  {liveSettings.storeName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Buka
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                Pesan Online • Takeaway & Delivery Pesantren DQM
              </p>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setActivePage('BERANDA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activePage === 'BERANDA'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Beranda & Menu
            </button>
            <button
              type="button"
              onClick={() => setActivePage('PESANAN_SAYA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                activePage === 'PESANAN_SAYA' || activePage === 'DETAIL_PESANAN'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <span>Pesanan Saya</span>
              {myOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-500 text-stone-950 font-black">
                  {myOrders.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActivePage('KERANJANG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activePage === 'KERANJANG' || activePage === 'CHECKOUT'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Keranjang ({totalCartItems})
            </button>
            <button
              type="button"
              onClick={() => setActivePage('PROFIL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activePage === 'PROFIL'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Profil
            </button>
          </nav>

          {/* Right Icons: Notification, Cart, Back to POS (if opened from Admin) */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 transition cursor-pointer"
                aria-label="Notifikasi Pesanan"
              >
                <Bell className="w-4 h-4 text-orange-400" />
                {myOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                    {myOrders.length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-3.5 z-50 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                    <span className="text-xs font-black text-white">Status Pesanan Realtime</span>
                    <button
                      type="button"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-stone-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {myOrders.length === 0 ? (
                    <p className="text-xs text-stone-400 py-3 text-center">
                      Belum ada notifikasi pesanan aktif.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {myOrders.slice(0, 5).map((o) => {
                        const stage = resolveOnlineOrderStage(o);
                        return (
                          <div
                            key={o.id_transaksi}
                            onClick={() => {
                              setActiveOrderId(o.id_transaksi);
                              setActivePage('DETAIL_PESANAN');
                              setIsNotifOpen(false);
                            }}
                            className="p-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 cursor-pointer transition"
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="font-mono text-orange-400">{o.id_transaksi}</span>
                              <span className="text-[10px] text-emerald-400">
                                {getStageLabel(stage, o.tipe_pesanan)}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5 truncate">
                              {o.items.map((i) => `${i.qty}x ${i.nama_produk}`).join(', ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PWA Install Button for Android / Desktop */}
            <PWAInstallButton variant="compact" className="hidden sm:flex" />

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setActivePage('KERANJANG')}
              className="relative p-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-md shadow-red-950/40 transition cursor-pointer flex items-center gap-1.5"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartItems > 0 && (
                <span className="font-mono font-black text-xs px-1">{totalCartItems}</span>
              )}
            </button>

            {onOpenPOS && (
              <button
                type="button"
                onClick={onOpenPOS}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold transition cursor-pointer"
                title="Kembali ke Dashboard Kasir/Admin"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
                <span>Mode Kasir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN PAGE ROUTER
         ===================================================================== */}
      <main className="flex-1">
        {activePage === 'BERANDA' && (
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu favorit: Mi Rendang, Pop Ice, Good Day, Indomie, Nutrisari..."
                className="w-full bg-stone-900 border border-stone-800 focus:border-red-500 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder:text-stone-500 shadow-inner focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 p-1 rounded-lg text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Promotional Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden border border-red-500/30 shadow-2xl bg-stone-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[220px] sm:min-h-[260px]">
                <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-center space-y-3 z-10 bg-gradient-to-r from-stone-950 via-stone-950/95 to-stone-950/60 lg:to-transparent">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-orange-300 text-[11px] font-black uppercase tracking-wider w-fit">
                    <Flame className="w-3.5 h-3.5 text-red-500 fill-current" />
                    <span>Promo Spesial Warung Bang Kobra</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">
                    Pedasnya Nendang, Segarnya Bikin Ketagihan!
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                    {liveSettings.onlineMenuBannerText ||
                      'Pesan online sekarang untuk Takeaway tanpa antre atau Delivery langsung ke area sekitar Pesantren DQM (Minimal belanja Rp20.000).'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <span className="px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-700 text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      <span>{liveSettings.onlineMenuHours || '09:00 - 22:00 WIB'}</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30 text-xs font-extrabold text-orange-300">
                      Kode Promo: KOBRAHEMAT
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-5 relative h-48 sm:h-60 lg:h-auto">
                  <img
                    src={liveSettings.bannerImageUrl || HERO_PROMO_IMAGE}
                    alt="Promo Makanan dan Minuman Warung Bang Kobra"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-stone-950 via-stone-950/30 to-transparent" />
                </div>
              </div>
            </div>

            {/* Store Closed Banner if onlineMenuIsOpen is false */}
            {liveSettings.onlineMenuIsOpen === false && (
              <div className="bg-rose-950/70 border border-rose-500/40 rounded-2xl p-4 flex items-center gap-3 text-rose-200 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <strong className="block font-black text-rose-100 text-sm">Warung Tutup Sementara</strong>
                  <span>Saat ini warung sedang tidak menerima pesanan baru. Anda tetap dapat menjelajahi daftar menu dan jam operasional ({liveSettings.onlineMenuHours || '09:00 - 22:00 WIB'}).</span>
                </div>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-stone-300">
                  Kategori Menu
                </h3>
                <span className="text-[11px] text-stone-400">
                  Menampilkan {filteredProducts.length} menu
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                {categoryTabs.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 border-red-500 text-white shadow-lg shadow-red-950/50 scale-[1.02]'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Terlaris & Menu Favorit Showcase (Shown when viewing 'Semua' and no search query) */}
            {selectedCategory === 'Semua' && !searchQuery.trim() && (
              <div className="space-y-6">
                {/* Menu Terlaris */}
                {bestsellerProducts.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <Flame className="w-4 h-4 text-red-500 fill-current" />
                        <span>Menu Terlaris Paling Dicari</span>
                      </h3>
                      <span className="text-[11px] font-bold text-orange-400">Best Seller</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {bestsellerProducts.slice(0, 4).map((p) => renderProductCard(p, true))}
                    </div>
                  </section>
                )}

                {/* Menu Favorit */}
                {favoriteProducts.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <Star className="w-4 h-4 text-orange-400 fill-current" />
                        <span>Menu Favorit Pelanggan</span>
                      </h3>
                      <span className="text-[11px] font-bold text-stone-400">Rekomendasi Kobra</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {favoriteProducts.slice(0, 4).map((p) => renderProductCard(p, true))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Daftar Menu Lengkap */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>
                    {selectedCategory === 'Semua'
                      ? 'Daftar Semua Menu'
                      : `Kategori: ${selectedCategory}`}
                  </span>
                </h3>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-stone-300">
                    Tidak ada menu yang cocok dengan pencarian "{searchQuery}"
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Semua');
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Tampilkan Semua Menu
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map((product) => renderProductCard(product))}
                </div>
              )}
            </section>
          </div>
        )}

        {activePage === 'KERANJANG' && (
          <OnlineCartView
            cart={cart}
            orderNote={orderNote}
            onOrderNoteChange={setOrderNote}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            promoCode={promoCode}
            onPromoCodeChange={setPromoCode}
            appliedDiscount={appliedDiscount}
            onApplyPromo={handleApplyPromo}
            deliveryFee={deliveryFee}
            subtotal={subtotal}
            grandTotal={grandTotal}
            onUpdateQty={handleUpdateCartQty}
            onRemoveItem={handleRemoveCartItem}
            onUpdateItemNote={handleUpdateItemNote}
            onContinueShopping={() => setActivePage('BERANDA')}
            onProceedToCheckout={() => setActivePage('CHECKOUT')}
          />
        )}

        {activePage === 'CHECKOUT' && (
          <OnlineCheckoutView
            cart={cart}
            settings={liveSettings}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhone}
            customerEmail={customerEmail}
            onCustomerEmailChange={setCustomerEmail}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            deliveryLandmark={deliveryLandmark}
            onDeliveryLandmarkChange={setDeliveryLandmark}
            pickupTime={pickupTime}
            onPickupTimeChange={setPickupTime}
            orderNote={orderNote}
            onOrderNoteChange={setOrderNote}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            appliedDiscount={appliedDiscount}
            grandTotal={grandTotal}
            isSubmitting={isSubmittingOrder}
            onBackToCart={() => setActivePage('KERANJANG')}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {activePage === 'PEMBAYARAN' && activeOrder && (
          <OnlinePaymentView
            order={activeOrder}
            settings={liveSettings}
            qrisFallbackDataUrl={qrisFallbackDataUrl}
            isUploadingProof={isUploadingProof}
            onUploadProof={handleUploadPaymentProof}
            onContinueToSuccess={() => setActivePage('SUKSES')}
            showToast={showToast}
          />
        )}

        {activePage === 'SUKSES' && activeOrder && (
          <OnlineOrderSuccessView
            order={activeOrder}
            settings={liveSettings}
            onViewOrderDetail={(ord) => {
              setActiveOrderId(ord.id_transaksi);
              setActivePage('DETAIL_PESANAN');
            }}
            onBackToHome={() => setActivePage('BERANDA')}
            showToast={showToast}
          />
        )}

        {activePage === 'PESANAN_SAYA' && (
          <MyOrdersListView
            orders={myOrders}
            customerPhoneFilter={customerPhoneFilter}
            onCustomerPhoneFilterChange={setCustomerPhoneFilter}
            onSelectOrder={(ord) => {
              setActiveOrderId(ord.id_transaksi);
              setActivePage('DETAIL_PESANAN');
            }}
            onStartShopping={() => setActivePage('BERANDA')}
          />
        )}

        {activePage === 'DETAIL_PESANAN' && activeOrder && (
          <OrderTrackingDetailView
            order={activeOrder}
            settings={liveSettings}
            onBack={() => setActivePage('PESANAN_SAYA')}
            onOpenPaymentPage={(ord) => {
              setActiveOrderId(ord.id_transaksi);
              setActivePage('PEMBAYARAN');
            }}
          />
        )}

        {activePage === 'PROFIL' && (
          <div className="max-w-xl mx-auto px-3 sm:px-6 py-6 space-y-5">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3.5 pb-4 border-b border-stone-800">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                  {(customerName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-white truncate">
                    {customerName || 'Pelanggan Warung Bang Kobra'}
                  </h2>
                  <p className="text-xs text-stone-400 font-mono">
                    {customerPhone || 'Nomor WhatsApp belum disimpan'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 mb-1 block">
                    Nama Default Pemesan
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-300 mb-1 block">
                    Nomor WhatsApp Aktif
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setCustomerPhoneFilter(e.target.value);
                    }}
                    placeholder="081234567890"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-300 mb-1 block">
                    Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-300 mb-1 block">
                    Alamat Pengantaran Default (Area Sekitar Pesantren DQM)
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Contoh: Asrama Putra Pesantren DQM Gedung B"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        CUSTOMER_PROFILE_META_KEY,
                        JSON.stringify({
                          name: customerName.trim(),
                          phone: customerPhone.trim(),
                          email: customerEmail.trim(),
                          address: deliveryAddress.trim(),
                          landmark: deliveryLandmark.trim(),
                        })
                      );
                    } catch {
                      // ignore
                    }
                    showToast('Profil pemesan berhasil disimpan!', 'success');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  Simpan Data Pemesan
                </button>
              </div>

              {/* Install PWA Mobile Card */}
              <div className="pt-2 border-t border-stone-800">
                <PWAInstallButton variant="full" />
              </div>
            </div>

            {/* Info Warung & Kontak */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3 text-xs">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-400" />
                <span>Informasi {liveSettings.storeName}</span>
              </h3>
              <div className="space-y-2 text-stone-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{liveSettings.storeAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Jam Operasional: {liveSettings.onlineMenuHours || '09:00 - 22:00 WIB'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{liveSettings.whatsappNumber}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = buildWhatsAppUrl(
                      liveSettings.whatsappNumber,
                      `Halo *${liveSettings.storeName}*, saya ingin bertanya mengenai menu pesanan online.`
                    );
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi Warung via WhatsApp</span>
                </button>

                {!auth.currentUser && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await loginWithGoogleFirebase();
                      if (res.user) {
                        if (!customerName) setCustomerName(res.user.nama);
                        if (!customerEmail) setCustomerEmail(res.user.email);
                        showToast(`Terhubung dengan akun Google ${res.user.nama}`, 'success');
                      }
                    }}
                    className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-orange-400" />
                    <span>Tautkan Akun Google</span>
                  </button>
                )}

                {onOpenPOS && (
                  <button
                    type="button"
                    onClick={onOpenPOS}
                    className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-400 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Buka Dashboard Admin / Kasir</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          FLOATING STICKY CART BAR ON BERANDA
         ===================================================================== */}
      {activePage === 'BERANDA' && totalCartItems > 0 && (
        <div className="fixed bottom-18 md:bottom-5 left-3 right-3 z-30 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setActivePage('KERANJANG')}
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-600 to-orange-600 text-white shadow-2xl shadow-red-950/80 border border-orange-400/30 flex items-center justify-between gap-3 transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black/25 flex items-center justify-center font-mono font-black text-sm">
                {totalCartItems}
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wide">
                  Lihat Keranjang & Checkout
                </div>
                <div className="text-[11px] text-orange-100">
                  {cart.length} jenis menu dipilih
                </div>
              </div>
            </div>
            <div className="font-mono font-black text-sm sm:text-base bg-black/25 px-3.5 py-1.5 rounded-xl">
              {formatRupiah(subtotal)}
            </div>
          </button>
        </div>
      )}

      {/* =====================================================================
          MOBILE BOTTOM NAVIGATION BAR: Beranda, Pesanan, Keranjang, Profil
         ===================================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800 px-2 py-1.5">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActivePage('BERANDA')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activePage === 'BERANDA' ? 'text-red-500 font-black' : 'text-stone-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('PESANAN_SAYA')}
            className={`relative py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activePage === 'PESANAN_SAYA' || activePage === 'DETAIL_PESANAN'
                ? 'text-red-500 font-black'
                : 'text-stone-400'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px]">Pesanan</span>
            {myOrders.length > 0 && (
              <span className="absolute top-1 right-5 w-4 h-4 rounded-full bg-orange-500 text-stone-950 text-[9px] font-black flex items-center justify-center">
                {myOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePage('KERANJANG')}
            className={`relative py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activePage === 'KERANJANG' || activePage === 'CHECKOUT'
                ? 'text-red-500 font-black'
                : 'text-stone-400'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px]">Keranjang</span>
            {totalCartItems > 0 && (
              <span className="absolute top-1 right-4 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePage('PROFIL')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activePage === 'PROFIL' ? 'text-red-500 font-black' : 'text-stone-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profil</span>
          </button>
        </div>
      </nav>

      {/* Product Detail & Variant Picker Modal */}
      <ProductDetailModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};
