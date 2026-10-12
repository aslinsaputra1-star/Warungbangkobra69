export type ProductCategory =
  | 'Makanan'
  | 'Minuman'
  | 'Pop Ice'
  | 'Good Day'
  | 'Chocolatos'
  | 'Hilo'
  | 'Nutrisari'
  | 'Snack'
  | 'Tambahan'
  | 'Lainnya';
export type PaymentMethod = 'Cash' | 'QRIS' | 'Transfer' | 'E-wallet' | 'Lainnya';
export type PaymentStatus = 'MENUNGGU' | 'DIVERIFIKASI' | 'LUNAS' | 'DITOLAK';
export type OnlineOrderStage =
  | 'MENUNGGU'
  | 'DIKONFIRMASI'
  | 'DIPROSES'
  | 'SIAP'
  | 'SELESAI'
  | 'DIBATALKAN';
export type UserRole =
  | 'Owner'
  | 'Admin'
  | 'Kasir'
  | 'Staff'
  | 'Customer'
  | 'ADMIN'
  | 'KASIR';
export type ExpenseCategory = 'Pembelian bahan' | 'Listrik' | 'Gas' | 'Operasional' | 'Gaji' | 'Lainnya';

export interface Product {
  id: string;
  sku: string;
  nama: string;
  kategori: ProductCategory | string;
  harga_modal: number;
  harga_jual: number;
  satuan: string;
  stok: number;
  stok_minimum: number;
  foto: string;
  gambar_url?: string;
  status: 'Aktif' | 'Nonaktif';
  deskripsi?: string;
  varian?: string[];
  is_favorit?: boolean;
  is_terlaris?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  subtotal?: number;
  varian?: string;
  selectedVariant?: string;
  catatan?: string;
}

export interface TransactionDetail {
  id_detail: string;
  id_transaksi: string;
  id_produk: string;
  nama_produk: string;
  varian?: string;
  harga?: number;
  harga_satuan?: number;
  qty: number;
  subtotal: number;
  catatan?: string;
  catatan_item?: string;
  foto_produk?: string;
}

export interface OrderStatusHistoryItem {
  stage?: OnlineOrderStage;
  tahap?: OnlineOrderStage;
  label?: string;
  timestamp?: string;
  waktu?: string;
  actor?: string;
  note?: string;
  catatan?: string;
}

export interface Transaction {
  id_transaksi: string; // e.g. WBK-20261002-0001
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  kasir: string;
  customerId?: string;
  customer_uid?: string;
  nama_pelanggan: string;
  no_whatsapp?: string;
  no_hp_pelanggan?: string;
  email_pelanggan?: string;
  subtotal: number;
  diskon: number;
  biaya?: number;
  ongkir?: number;
  total: number;
  metode_pembayaran: PaymentMethod;
  status_pembayaran?: PaymentStatus;
  bukti_pembayaran_url?: string;
  bukti_pembayaran_at?: string;
  uang_diterima?: number;
  jumlah_bayar?: number;
  kembalian: number;
  status: 'Selesai' | 'Dibatalkan' | 'Pending' | 'Diproses';
  tahap_pesanan?: OnlineOrderStage;
  status_history?: OrderStatusHistoryItem[];
  timeline_status?: Array<{
    tahap: OnlineOrderStage;
    waktu: string;
    catatan?: string;
  }>;
  stok_dikurangi?: boolean;
  idempotency_key?: string;
  items: TransactionDetail[];
  created_at: string;
  updated_at?: string;
  tipe_pesanan?: 'Takeaway' | 'Delivery' | 'Dine In' | 'PO / Acara';
  tanggal_acara?: string;
  waktu_ambil?: string;
  alamat_pengantaran?: string;
  alamat_pengiriman?: string;
  patokan_lokasi?: string;
  catatan_pesanan?: string;
  catatan?: string;
  sumber_pesanan?: string;
}

export interface StockMutation {
  id: string;
  tanggal: string;
  id_produk: string;
  nama_produk: string;
  jenis: 'in' | 'out' | 'adjustment';
  qty: number;
  stok_sebelum: number;
  stok_sesudah: number;
  keterangan: string;
}

export interface Customer {
  id: string;
  nama: string;
  no_whatsapp: string;
  whatsapp?: string;
  alamat?: string;
  catatan?: string;
  total_transaksi: number;
  total_belanja: number;
  last_order?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  tanggal: string;
  kategori: ExpenseCategory | string;
  keterangan: string;
  jumlah: number;
  catatan?: string;
  diinput_oleh?: string;
  created_at: string;
}

export interface CashRecord {
  id: string;
  tanggal: string;
  jenis: 'Masuk' | 'Keluar';
  keterangan: string;
  nominal: number;
  saldo: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  storeSlogan?: string;
  address: string;
  storeAddress?: string;
  whatsappNumber: string;
  logoUrl: string;
  receiptFooter: string;
  receiptPaperSize?: '58mm' | '80mm';
  currency: string;
  taxPercent: number;
  defaultDiscount: number;
  googleAppsScriptUrl?: string;
  googleSheetsUrl?: string;
  isGoogleSheetsConnected?: boolean;
  lastSyncTime?: string;
  autoSync: boolean;
  stockControl: boolean;
  qrisImageUrl: string;
  activeCashier: string;
  role: UserRole;
  theme: 'dark' | 'light';
  invoicePrefix: string;
  onlineMenuEnabled?: boolean;
  onlineMenuBannerText?: string;
  onlineMenuHours?: string;
  onlineMenuBankInfo?: string;
  ewalletInfo?: string;
  deliveryAreaInfo?: string;
  deliveryMinOrder?: number;
  deliveryFee?: number;
  onlineMenuIsOpen?: boolean;
  onlineMenuAnnouncement?: string;
  onlineMenuMinOrder?: number;
  bannerImageUrl?: string;
  themeColor?: 'orange' | 'amber' | 'emerald' | 'red' | 'stone';
  estimatedPrepTime?: string;
  customerServiceContact?: string;
  storeDescription?: string;
  orderSortBy?: 'terlaris' | 'nama' | 'harga_termurah' | 'harga_termahal';
}

export interface SyncState {
  lastSync: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  syncedCount: number;
  error: string | null;
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'whatsapp_order'
  | 'products'
  | 'categories'
  | 'stock'
  | 'customers'
  | 'po_orders'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'notifications'
  | 'qrcode_order'
  | 'public_menu'
  | 'login'
  | 'settings'
  | 'audit_log'
  | 'ai_bot';

export interface AuditLog {
  id: string;
  timestamp: string;
  user_name: string;
  user_role: string;
  action: 'TAMBAH' | 'EDIT' | 'HAPUS' | 'LOGIN' | 'LOGOUT' | 'STATUS_PESANAN' | 'MUTASI_STOK' | 'PENGATURAN';
  module: 'Produk' | 'Kategori' | 'Pesanan' | 'Pengeluaran' | 'Stok' | 'Pengguna' | 'Pengaturan' | 'Auth' | 'PO';
  description: string;
  details?: Record<string, any>;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'order' | 'stock' | 'system' | 'payment';
  read: boolean;
  linkTab?: ActiveTab;
}

export interface CategoryItem {
  id: string;
  nama: string;
  deskripsi?: string;
  icon?: string;
  urutan?: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface WarungUser {
  id: string;
  nama: string;
  username: string;
  email?: string;
  role: UserRole;
  pin: string;
  no_hp?: string;
  avatar_url?: string;
  status: 'Aktif' | 'Nonaktif';
  total_transaksi?: number;
  total_omset?: number;
  terakhir_aktif?: string;
  created_at?: string;
}

export type AuthUser = WarungUser;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
