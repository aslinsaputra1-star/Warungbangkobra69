import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Store,
  Globe,
  Share2,
  Copy,
  ExternalLink,
  QrCode,
  Download,
  Printer,
  Smartphone,
  Laptop,
  Check,
  CheckCircle2,
  AlertCircle,
  Save,
  Eye,
  RotateCcw,
  Sparkles,
  Clock,
  CreditCard,
  Send,
  MessageCircle,
  Tag,
  Package,
  Layers,
  Shield,
  Search,
  Filter,
  ArrowUpRight,
  Utensils,
  Coffee,
  Flame,
  X,
  ChevronRight,
  Percent,
  Truck,
  Info,
  SlidersHorizontal,
  Upload,
  Image as ImageIcon,
  CheckSquare,
  Square,
  HelpCircle,
  Phone,
  MapPin,
} from 'lucide-react';
import { Product, StoreSettings, UserRole, WarungUser, CategoryItem, ActiveTab } from '../../types';
import { generateQRCodeDataURL } from '../../utils/qrcode';
import { formatRupiah, sanitizeWhatsAppNumber } from '../../utils/formatters';
import { BrandLogo, DEFAULT_STORE_LOGO } from '../Common/BrandLogo';
import { LogoUploader, PRESET_LOGOS } from '../Settings/LogoUploader';
import { HERO_PROMO_IMAGE, IMG_MAKANAN, IMG_MINUMAN, IMG_SNACK, INITIAL_SETTINGS } from '../../data/initialData';
import { normalizeRole } from '../../utils/rbac';

export interface PublicMenuManagerViewProps {
  products: Product[];
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  onOpenCustomerView: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: WarungUser | null;
  role?: UserRole;
  onUpdateProduct?: (product: Product) => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  categories?: CategoryItem[];
}

type MenuTab = 'identitas' | 'tampilan' | 'produk' | 'pemesanan' | 'informasi';

// Banner presets
const PRESET_BANNERS = [
  {
    id: 'hero-kobra',
    name: 'Spesial Kuliner & Mi Aceh Kobra',
    url: HERO_PROMO_IMAGE,
    desc: 'Banner resmi promosi Warung Bang Kobra dengan tema pedas mantap',
  },
  {
    id: 'aneka-minuman',
    name: 'Aneka Minuman Blender Segar',
    url: IMG_MINUMAN,
    desc: 'Nuansa kesegaran Pop Ice, Good Day, Chocolatos, & Hilo dingin',
  },
  {
    id: 'indomie-lezat',
    name: 'Indomie & Kuliner Nusantara',
    url: IMG_MAKANAN,
    desc: 'Sajian hangat mie goreng, kuah pedas & lauk pauk',
  },
  {
    id: 'snack-camilan',
    name: 'Camilan & Gorengan Renyah',
    url: IMG_SNACK,
    desc: 'Menu pelengkap risoles, gorengan, dan snack santri',
  },
];

// Color theme options
const THEME_OPTIONS: Array<{
  id: 'orange' | 'amber' | 'emerald' | 'red' | 'stone';
  label: string;
  badge: string;
  accentClass: string;
  borderClass: string;
  bgLightClass: string;
}> = [
  {
    id: 'orange',
    label: 'Kobra Orange (Default)',
    badge: 'Spesial Kuliner',
    accentClass: 'from-orange-500 to-amber-600',
    borderClass: 'border-orange-500',
    bgLightClass: 'bg-orange-500/20 text-orange-400',
  },
  {
    id: 'amber',
    label: 'Gold Warmth',
    badge: 'Nuansa Hangat',
    accentClass: 'from-amber-500 to-yellow-600',
    borderClass: 'border-amber-500',
    bgLightClass: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'emerald',
    label: 'Fresh Emerald',
    badge: 'Minuman Segar',
    accentClass: 'from-emerald-500 to-teal-600',
    borderClass: 'border-emerald-500',
    bgLightClass: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'red',
    label: 'Spicy Crimson',
    badge: 'Super Pedas',
    accentClass: 'from-red-600 to-rose-700',
    borderClass: 'border-red-500',
    bgLightClass: 'bg-red-500/20 text-red-400',
  },
  {
    id: 'stone',
    label: 'Modern Dark Slate',
    badge: 'Minimalis Elegan',
    accentClass: 'from-stone-700 to-stone-900',
    borderClass: 'border-stone-600',
    bgLightClass: 'bg-stone-500/20 text-stone-300',
  },
];

export const PublicMenuManagerView: React.FC<PublicMenuManagerViewProps> = ({
  products,
  settings,
  onSaveSettings,
  onOpenCustomerView,
  showToast,
  currentUser,
  role = 'Owner',
  onUpdateProduct,
  onNavigateTab,
  categories = [],
}) => {
  // Effective role check
  const effectiveRole = currentUser ? currentUser.role : role;
  const normalizedUserRole = normalizeRole(effectiveRole);
  const isReadOnly = normalizedUserRole === 'Kasir' || normalizedUserRole === 'Staff';

  // Navigation tab in Menu Toko
  const [activeTab, setActiveTab] = useState<MenuTab>('identitas');

  // Form State initialized from settings
  const [storeName, setStoreName] = useState(settings.storeName || 'WARUNG BANG KOBRA');
  const [tagline, setTagline] = useState(
    settings.storeSlogan || settings.tagline || 'Spesialis Kuliner Pedas & Minuman Segar'
  );
  const [address, setAddress] = useState(
    settings.storeAddress || settings.address || 'Area Sekitar Pesantren DQM (Darul Quran Mulia)'
  );
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber || '6281234567890');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '/icon.svg');
  const [isOpenOnline, setIsOpenOnline] = useState<boolean>(
    settings.onlineMenuIsOpen !== undefined ? settings.onlineMenuIsOpen : true
  );
  const [onlineEnabled, setOnlineEnabled] = useState<boolean>(
    settings.onlineMenuEnabled !== undefined ? settings.onlineMenuEnabled : true
  );
  const [operatingHours, setOperatingHours] = useState(
    settings.onlineMenuHours || '09:00 - 22:00 WIB'
  );
  const [bannerText, setBannerText] = useState(
    settings.onlineMenuBannerText ||
      '🔥 Promo Pesanan Online Warung Bang Kobra! Antar Cepat Sekitar Pesantren DQM.'
  );
  const [bankInfo, setBankInfo] = useState(
    settings.onlineMenuBankInfo || 'BCA 8830192831 a.n Warung Bang Kobra'
  );
  const [ewalletInfo, setEwalletInfo] = useState(
    settings.ewalletInfo || 'DANA / GoPay / OVO: 0812-3456-7890 a.n Warung Bang Kobra'
  );
  const [deliveryArea, setDeliveryArea] = useState(
    settings.deliveryAreaInfo || 'Area sekitar Pesantren DQM (Darul Quran Mulia)'
  );
  const [minOrder, setMinOrder] = useState<number>(settings.deliveryMinOrder || 20000);
  const [deliveryFee, setDeliveryFee] = useState<number>(settings.deliveryFee || 5000);
  const [bannerImage, setBannerImage] = useState<string>(
    settings.bannerImageUrl || HERO_PROMO_IMAGE
  );
  const [themeColor, setThemeColor] = useState<'orange' | 'amber' | 'emerald' | 'red' | 'stone'>(
    settings.themeColor || 'orange'
  );
  const [prepTime, setPrepTime] = useState<string>(settings.estimatedPrepTime || '15 - 25 Menit');
  const [customerService, setCustomerService] = useState<string>(
    settings.customerServiceContact || '0812-3456-7890'
  );
  const [storeDesc, setStoreDesc] = useState<string>(
    settings.storeDescription ||
      'Warung Bang Kobra menyajikan aneka sajian khas nusantara bercita rasa pedas mantap serta aneka minuman racikan segar untuk santapan sehari-hari santri, wali santri, dan warga sekitar Pesantren DQM.'
  );
  const [sortBy, setSortBy] = useState<'terlaris' | 'nama' | 'harga_termurah' | 'harga_termahal'>(
    settings.orderSortBy || 'terlaris'
  );

  // Dirty check: track if user modified any field
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when external settings prop changes (if not dirty)
  useEffect(() => {
    if (!isDirty) {
      setStoreName(settings.storeName || 'WARUNG BANG KOBRA');
      setTagline(settings.storeSlogan || settings.tagline || '');
      setAddress(settings.storeAddress || settings.address || '');
      setWhatsappNumber(settings.whatsappNumber || '6281234567890');
      setLogoUrl(settings.logoUrl || '/icon.svg');
      setIsOpenOnline(settings.onlineMenuIsOpen !== undefined ? settings.onlineMenuIsOpen : true);
      setOnlineEnabled(settings.onlineMenuEnabled !== undefined ? settings.onlineMenuEnabled : true);
      setOperatingHours(settings.onlineMenuHours || '09:00 - 22:00 WIB');
      setBannerText(settings.onlineMenuBannerText || '');
      setBankInfo(settings.onlineMenuBankInfo || '');
      setEwalletInfo(settings.ewalletInfo || '');
      setDeliveryArea(settings.deliveryAreaInfo || '');
      setMinOrder(settings.deliveryMinOrder || 20000);
      setDeliveryFee(settings.deliveryFee || 5000);
      setBannerImage(settings.bannerImageUrl || HERO_PROMO_IMAGE);
      setThemeColor(settings.themeColor || 'orange');
      setPrepTime(settings.estimatedPrepTime || '15 - 25 Menit');
      setCustomerService(settings.customerServiceContact || '0812-3456-7890');
      setStoreDesc(settings.storeDescription || '');
      setSortBy(settings.orderSortBy || 'terlaris');
    }
  }, [settings, isDirty]);

  // Mark dirty on any user edit
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // QR Code State
  const publicMenuUrl = `${
    typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  }?menu=public`;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Confirmation Modal for Resetting to Default
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Product tab filter and search
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('Semua');

  // Generate QR Code on mount or URL change
  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataURL(publicMenuUrl, {
      width: 480,
      margin: 2,
    })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate Public Menu QR:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [publicMenuUrl]);

  // Copy Link Handler
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicMenuUrl);
      setCopiedLink(true);
      showToast('Tautan Menu Online berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Gagal menyalin tautan', 'error');
    }
  };

  // Share via WhatsApp Handler
  const handleShareWhatsApp = () => {
    const text = `🍽️ *Katalog Menu Digital ${storeName}*\n\n${tagline}\n\nPesan kuliner lezat & minuman racikan segar favorit langsung dari HP tanpa antre:\n👉 ${publicMenuUrl}\n\n📍 ${address}\n⏰ Buka: ${operatingHours}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Download QR Code PNG
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-menu-toko-${storeName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Gambar QR Code berhasil diunduh!', 'success');
  };

  // Print Standee Meja QR
  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up terblokir. Izinkan pop-up peramban untuk mencetak standee!', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Standee Meja QR Menu - ${storeName}</title>
          <style>
            @page { size: A5 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 16px;
              color: #1c1917;
              background-color: #fafaf9;
            }
            .card {
              border: 3px solid #ea580c;
              background: #ffffff;
              border-radius: 28px;
              padding: 32px 24px;
              max-width: 420px;
              margin: 0 auto;
              box-shadow: 0 10px 25px rgba(0,0,0,0.06);
            }
            .brand-pill {
              display: inline-block;
              background: #fff7ed;
              color: #c2410c;
              padding: 6px 16px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 12px;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 12px;
              border: 1px solid #fed7aa;
            }
            h1 { font-size: 26px; margin: 0 0 6px 0; color: #1c1917; text-transform: uppercase; font-weight: 900; }
            p.sub { font-size: 13px; color: #57534e; margin: 0 0 20px 0; font-weight: 600; line-height: 1.4; }
            .qr-wrapper {
              background: #ffffff;
              padding: 16px;
              border: 2px dashed #f97316;
              border-radius: 20px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-img { width: 260px; height: 260px; display: block; border-radius: 12px; }
            .badge {
              display: inline-block;
              background: #ea580c;
              color: #ffffff;
              padding: 8px 20px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 14px;
              margin-bottom: 16px;
              box-shadow: 0 4px 10px rgba(234, 88, 12, 0.3);
            }
            .instruction { font-size: 13px; line-height: 1.5; color: #292524; font-weight: 700; max-width: 340px; margin: 0 auto; }
            .meta { font-size: 11px; color: #78716c; margin-top: 20px; border-top: 1px solid #e7e5e4; pt: 12px; padding-top: 12px; }
            .url { font-size: 10px; color: #a8a29e; word-break: break-all; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand-pill">★ WARUNG BANG KOBRA ★</div>
            <h1>${storeName}</h1>
            <p class="sub">${tagline}</p>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" class="qr-img" />
            </div>
            <div>
              <div class="badge">📲 SCAN MENU DIGITAL & PESAN</div>
            </div>
            <p class="instruction">
              Buka kamera HP Anda, arahkan ke QR Code di atas untuk melihat menu lengkap, foto, harga, dan memesan langsung via WhatsApp!
            </p>
            <div class="meta">
              <div>Jam Operasional: <strong>${operatingHours}</strong></div>
              <div>Alamat: ${address}</div>
              <div class="url">${publicMenuUrl}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Revert Changes to currently saved settings
  const handleCancelChanges = () => {
    setStoreName(settings.storeName || 'WARUNG BANG KOBRA');
    setTagline(settings.storeSlogan || settings.tagline || '');
    setAddress(settings.storeAddress || settings.address || '');
    setWhatsappNumber(settings.whatsappNumber || '6281234567890');
    setLogoUrl(settings.logoUrl || '/icon.svg');
    setIsOpenOnline(settings.onlineMenuIsOpen !== undefined ? settings.onlineMenuIsOpen : true);
    setOnlineEnabled(settings.onlineMenuEnabled !== undefined ? settings.onlineMenuEnabled : true);
    setOperatingHours(settings.onlineMenuHours || '09:00 - 22:00 WIB');
    setBannerText(settings.onlineMenuBannerText || '');
    setBankInfo(settings.onlineMenuBankInfo || '');
    setEwalletInfo(settings.ewalletInfo || '');
    setDeliveryArea(settings.deliveryAreaInfo || '');
    setMinOrder(settings.deliveryMinOrder || 20000);
    setDeliveryFee(settings.deliveryFee || 5000);
    setBannerImage(settings.bannerImageUrl || HERO_PROMO_IMAGE);
    setThemeColor(settings.themeColor || 'orange');
    setPrepTime(settings.estimatedPrepTime || '15 - 25 Menit');
    setCustomerService(settings.customerServiceContact || '0812-3456-7890');
    setStoreDesc(settings.storeDescription || '');
    setSortBy(settings.orderSortBy || 'terlaris');
    setIsDirty(false);
    showToast('Perubahan dibatalkan. Pengaturan dikembalikan ke data tersimpan.', 'info');
  };

  // Reset to Initial System Defaults
  const handleRestoreDefaults = () => {
    setStoreName(INITIAL_SETTINGS.storeName);
    setTagline(INITIAL_SETTINGS.tagline);
    setAddress(INITIAL_SETTINGS.address);
    setWhatsappNumber(INITIAL_SETTINGS.whatsappNumber);
    setLogoUrl(INITIAL_SETTINGS.logoUrl);
    setIsOpenOnline(INITIAL_SETTINGS.onlineMenuIsOpen !== undefined ? INITIAL_SETTINGS.onlineMenuIsOpen : true);
    setOnlineEnabled(true);
    setOperatingHours(INITIAL_SETTINGS.onlineMenuHours || '09:00 - 22:00 WIB');
    setBannerText(INITIAL_SETTINGS.onlineMenuBannerText || '');
    setBankInfo(INITIAL_SETTINGS.onlineMenuBankInfo || '');
    setEwalletInfo(INITIAL_SETTINGS.ewalletInfo || '');
    setDeliveryArea(INITIAL_SETTINGS.deliveryAreaInfo || '');
    setMinOrder(INITIAL_SETTINGS.deliveryMinOrder || 20000);
    setDeliveryFee(INITIAL_SETTINGS.deliveryFee || 5000);
    setBannerImage(HERO_PROMO_IMAGE);
    setThemeColor('orange');
    setPrepTime('15 - 25 Menit');
    setCustomerService('0812-3456-7890');
    setStoreDesc(INITIAL_SETTINGS.storeDescription || '');
    setSortBy('terlaris');
    setIsDirty(true);
    setIsResetConfirmOpen(false);
    showToast('Pengaturan dipulihkan ke setelan bawaan. Klik Simpan untuk menerapkan.', 'info');
  };

  // Save Settings to Firebase & Local Storage
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) {
      showToast('Akses dibatasi: Anda login sebagai Kasir. Hanya Owner dan Admin yang dapat menyimpan pengaturan toko.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updated: StoreSettings = {
        ...settings,
        storeName: storeName.trim() || 'WARUNG BANG KOBRA',
        tagline: tagline.trim(),
        storeSlogan: tagline.trim(),
        address: address.trim(),
        storeAddress: address.trim(),
        whatsappNumber: sanitizeWhatsAppNumber(whatsappNumber),
        logoUrl: logoUrl.trim() || '/icon.svg',
        onlineMenuIsOpen: isOpenOnline,
        onlineMenuEnabled: onlineEnabled,
        onlineMenuHours: operatingHours.trim(),
        onlineMenuBannerText: bannerText.trim(),
        onlineMenuBankInfo: bankInfo.trim(),
        ewalletInfo: ewalletInfo.trim(),
        deliveryAreaInfo: deliveryArea.trim(),
        deliveryMinOrder: Number(minOrder) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        bannerImageUrl: bannerImage.trim() || HERO_PROMO_IMAGE,
        themeColor,
        estimatedPrepTime: prepTime.trim() || '15 - 25 Menit',
        customerServiceContact: customerService.trim(),
        storeDescription: storeDesc.trim(),
        orderSortBy: sortBy,
      };

      onSaveSettings(updated);
      setIsDirty(false);
      showToast('Semua perubahan profil & Menu Toko berhasil disimpan ke database!', 'success');
      if (isPreviewModalOpen) {
        setIsPreviewModalOpen(false);
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan pengaturan toko.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle single product availability directly
  const handleToggleProductStatus = (prod: Product) => {
    if (isReadOnly) {
      showToast('Akses dibatasi: Hanya Owner dan Admin yang dapat mengubah status produk.', 'error');
      return;
    }
    const newStatus = prod.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated: Product = {
      ...prod,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (onUpdateProduct) {
      onUpdateProduct(updated);
      showToast(
        `Status menu "${prod.nama}" diubah menjadi ${newStatus === 'Aktif' ? 'Tersedia' : 'Habis / Nonaktif'}!`,
        'success'
      );
    }
  };

  // Product categories list
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    set.add('Semua');
    products.forEach((p) => {
      if (p.kategori) set.add(String(p.kategori));
    });
    categories.forEach((c) => {
      if (c.nama) set.add(c.nama);
    });
    return Array.from(set);
  }, [products, categories]);

  // Filtered Products for Tab C
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase());
      const matchCat =
        selectedProductCategory === 'Semua' || p.kategori === selectedProductCategory;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, selectedProductCategory]);

  const activeProductsCount = products.filter((p) => p.status === 'Aktif').length;
  const outOfStockCount = products.filter((p) => p.status === 'Nonaktif' || p.stok <= 0).length;

  return (
    <div className="p-3.5 sm:p-5 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in pb-20">
      {/* 1. TOP HEADER TOKO — MODERN PREMIUM POS */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Brand Identity Header */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-stone-950 border-2 border-orange-500/50 p-1 flex items-center justify-center overflow-hidden shadow-xl shadow-orange-950/40">
                <BrandLogo
                  logoUrl={logoUrl}
                  storeName={storeName}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-stone-950 ${
                  isOpenOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/40' : 'bg-rose-500 ring-2 ring-rose-500/40'
                }`}
                title={isOpenOnline ? 'Toko Buka' : 'Toko Tutup'}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight uppercase">
                  {storeName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Flame className="w-3 h-3" />
                  <span>Menu Toko POS</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isOpenOnline
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpenOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{isOpenOnline ? 'Buka (Menerima Pesanan)' : 'Tutup Sementara'}</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-stone-300 font-medium mt-1 truncate max-w-xl">
                {tagline}
              </p>

              {/* Quiet unboxed metadata */}
              <div className="flex items-center gap-2 text-xs text-stone-400 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>{operatingHours}</span>
                </span>
                <span aria-hidden="true" className="text-stone-600">·</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono">{whatsappNumber}</span>
                </span>
                <span aria-hidden="true" className="text-stone-600">·</span>
                <span className="flex items-center gap-1 text-stone-400">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hak Akses: {normalizedUserRole}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Top Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
            {/* Live Preview Button */}
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-2xl bg-stone-800 hover:bg-stone-750 border border-stone-700/80 text-stone-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
              title="Pratinjau tampilan toko di HP & Komputer"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Pratinjau Toko</span>
            </button>

            {/* Buka Tampilan Pelanggan */}
            <button
              type="button"
              onClick={onOpenCustomerView}
              className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-2xl bg-stone-800 hover:bg-stone-750 border border-stone-700/80 text-orange-400 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
              title="Buka halaman menu web pelanggan"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Buka Web Pelanggan</span>
              <span className="sm:hidden">Web</span>
            </button>

            {/* Simpan Perubahan Button */}
            <button
              type="button"
              disabled={isSaving || isReadOnly}
              onClick={() => handleSaveAll()}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition cursor-pointer ${
                isReadOnly
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  : isDirty
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 shadow-orange-950/50 ring-2 ring-orange-400/40'
                  : 'bg-orange-500 hover:bg-orange-400 text-stone-950 shadow-orange-950/40'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isDirty ? 'Simpan Perubahan *' : 'Simpan Perubahan'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Readonly Alert for Cashier */}
        {isReadOnly && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Anda login dengan hak akses <strong>{normalizedUserRole}</strong>. Pengaturan Menu Toko dalam mode lihat. Perubahan hanya dapat disimpan oleh akun <strong>Owner</strong> atau <strong>Admin</strong>.
            </span>
          </div>
        )}
      </div>

      {/* 2. SECTION TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 p-1.5 bg-stone-900 border border-stone-800 rounded-2xl overflow-x-auto scrollbar-none shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab('identitas')}
          className={`flex-1 min-w-[130px] min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'identitas'
              ? 'bg-stone-800 text-orange-400 shadow-sm border border-stone-700/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>A. Identitas Toko</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tampilan')}
          className={`flex-1 min-w-[130px] min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'tampilan'
              ? 'bg-stone-800 text-orange-400 shadow-sm border border-stone-700/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>B. Tampilan Toko</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('produk')}
          className={`flex-1 min-w-[140px] min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'produk'
              ? 'bg-stone-800 text-orange-400 shadow-sm border border-stone-700/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>C. Menu Produk ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pemesanan')}
          className={`flex-1 min-w-[140px] min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'pemesanan'
              ? 'bg-stone-800 text-orange-400 shadow-sm border border-stone-700/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>D. Pemesanan & QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('informasi')}
          className={`flex-1 min-w-[130px] min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'informasi'
              ? 'bg-stone-800 text-orange-400 shadow-sm border border-stone-700/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>E. Info & Kontak</span>
        </button>
      </div>

      {/* 3. TAB CONTENT PANELS */}
      <div className="space-y-6">
        {/* ==================== TAB A: IDENTITAS TOKO ==================== */}
        {activeTab === 'identitas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Identity Form */}
            <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-100">Informasi Identitas Toko</h3>
                    <p className="text-[11px] text-stone-400">Identitas utama warung yang tampil di struk kasir dan menu digital pelanggan.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Nama Toko */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Nama Toko / Warung <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value);
                      markDirty();
                    }}
                    placeholder="Contoh: WARUNG BANG KOBRA"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                  />
                </div>

                {/* Slogan Toko */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Slogan / Deskripsi Singkat Toko:
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value);
                      markDirty();
                    }}
                    placeholder="Contoh: Spesialis Kuliner Pedas & Minuman Segar Sekitar Pesantren DQM"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    Muncul di bawah nama toko pada header website dan struk kasir.
                  </span>
                </div>

                {/* Alamat Toko */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Alamat Lengkap Toko:
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReadOnly}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      markDirty();
                    }}
                    placeholder="Contoh: Area Sekitar Pesantren DQM (Darul Quran Mulia), Jl. KH. Ahmad Dahlan..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                  />
                </div>

                {/* WhatsApp & Jam Operasional Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1.5">
                      Nomor WhatsApp Penerima Pesanan <span className="text-rose-400">*</span>:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={whatsappNumber}
                        onChange={(e) => {
                          setWhatsappNumber(e.target.value);
                          markDirty();
                        }}
                        placeholder="Contoh: 6281234567890"
                        className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 font-mono focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                      />
                    </div>
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Gunakan format internasional (awalan 62 atau 08).
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1.5">
                      Jam Operasional Warung:
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={operatingHours}
                        onChange={(e) => {
                          setOperatingHours(e.target.value);
                          markDirty();
                        }}
                        placeholder="09:00 - 22:00 WIB"
                        className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                      />
                    </div>
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Tampil di header info menu dan standee meja.
                    </span>
                  </div>
                </div>

                {/* Status Buka / Tutup Toko */}
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-stone-200">Status Operasional Toko</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isOpenOnline
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isOpenOnline ? 'Buka' : 'Tutup'}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400 mt-0.5 block">
                      {isOpenOnline
                        ? 'Warung aktif menerima pesanan online dan kasir.'
                        : 'Pelanggan dapat melihat menu, namun tombol checkout pesanan akan dinonaktifkan.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      setIsOpenOnline(!isOpenOnline);
                      markDirty();
                    }}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                      isOpenOnline
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700'
                    }`}
                  >
                    {isOpenOnline ? 'Toko Buka (Aktif)' : 'Tutup Sementara'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Preview & Logo Card */}
            <div className="space-y-6">
              {/* Logo Quick Card */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-extrabold text-stone-200 flex items-center justify-between">
                  <span>Logo Toko Saat Ini</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tampilan')}
                    className="text-[11px] text-orange-400 hover:underline cursor-pointer"
                  >
                    Atur di Tab Tampilan →
                  </button>
                </h3>

                <div className="flex items-center gap-4 p-3.5 bg-stone-950 rounded-2xl border border-stone-800">
                  <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 p-1 flex items-center justify-center shrink-0">
                    <BrandLogo logoUrl={logoUrl} storeName={storeName} className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-stone-200 block truncate">{storeName}</span>
                    <span className="text-[11px] text-stone-400 block truncate">{tagline}</span>
                    <span className="text-[10px] text-stone-400 mt-1 block truncate font-mono">{logoUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tampilan')}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-orange-400" />
                    <span>Ubah / Unggah Logo</span>
                  </button>
                </div>
              </div>

              {/* Status Summary */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-3xl p-5 space-y-3 shadow-xl text-xs text-stone-300">
                <span className="font-extrabold text-stone-200 block">Kesiapan Toko Digital:</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Total Menu Terdaftar:</span>
                    <span className="font-extrabold text-stone-100">{products.length} Menu</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Menu Aktif Siap Jual:</span>
                    <span className="font-extrabold text-emerald-400">{activeProductsCount} Menu</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Pemesanan Online:</span>
                    <span className={`font-extrabold ${onlineEnabled ? 'text-emerald-400' : 'text-stone-500'}`}>
                      {onlineEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">QR Code Standee:</span>
                    <span className="font-extrabold text-orange-400">Siap Cetak</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB B: TAMPILAN TOKO ==================== */}
        {activeTab === 'tampilan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Appearance Customizer Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Atur Logo Toko */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-100">Logo Toko</h3>
                      <p className="text-[11px] text-stone-400">Pilih dari logo resmi Bang Kobra, unggah gambar PNG transparan, atau masukkan URL.</p>
                    </div>
                  </div>
                </div>

                <LogoUploader
                  currentLogoUrl={logoUrl}
                  storeName={storeName}
                  onLogoChange={(newLogo) => {
                    setLogoUrl(newLogo);
                    markDirty();
                  }}
                  showToast={showToast}
                />
              </div>

              {/* 2. Banner Gambar Toko */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-100">Gambar Banner Toko</h3>
                      <p className="text-[11px] text-stone-400">Banner visual utama yang memikat selera pelanggan di puncak halaman menu online.</p>
                    </div>
                  </div>
                </div>

                {/* Selected Banner Preview */}
                <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 group">
                  <img
                    src={bannerImage}
                    alt="Banner Warung"
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-stone-950/80 px-2 py-0.5 rounded-md">
                      Banner Aktif
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white mt-1 drop-shadow">
                      {storeName}
                    </h4>
                    <p className="text-xs text-stone-300 line-clamp-1">{tagline}</p>
                  </div>
                </div>

                {/* Preset Banner Selector */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-2">
                    Pilihan Koleksi Banner Kuliner Bang Kobra:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRESET_BANNERS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => {
                          if (!isReadOnly) {
                            setBannerImage(preset.url);
                            markDirty();
                          }
                        }}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                          bannerImage === preset.url
                            ? 'bg-orange-500/10 border-orange-500 shadow-md ring-1 ring-orange-500/40'
                            : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-800"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-extrabold text-stone-200 block truncate">
                            {preset.name}
                          </span>
                          <span className="text-[11px] text-stone-400 block line-clamp-1">
                            {preset.desc}
                          </span>
                          {bannerImage === preset.url && (
                            <span className="text-[10px] font-black text-orange-400 mt-1 inline-flex items-center gap-1">
                              <Check className="w-3 h-3" /> Terpilih
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Banner Image URL */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Atau Masukkan URL Banner Kustom:
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={bannerImage}
                    onChange={(e) => {
                      setBannerImage(e.target.value);
                      markDirty();
                    }}
                    placeholder="https://..."
                    className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 font-mono focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                  />
                </div>
              </div>

              {/* 3. Atur Warna Tema Toko */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-100">Warna Tema Toko</h3>
                      <p className="text-[11px] text-stone-400">Sesuaikan aksen visual tombol dan sorotan sesuai nuansa menu warung.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_OPTIONS.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => {
                        if (!isReadOnly) {
                          setThemeColor(opt.id);
                          markDirty();
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                        themeColor === opt.id
                          ? `${opt.borderClass} bg-stone-950 shadow-md ring-2 ring-orange-500/30`
                          : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-stone-200">{opt.label}</span>
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${opt.accentClass} shadow-xs`} />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md ${opt.bgLightClass} font-bold`}>
                          {opt.badge}
                        </span>
                        {themeColor === opt.id && (
                          <Check className="w-3.5 h-3.5 text-orange-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive Phone Frame Preview on Right */}
            <div className="space-y-4">
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3 sticky top-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                  <span className="text-xs font-black text-stone-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-orange-400" />
                    <span>Pratinjau Mini HP Pelanggan</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDevice('mobile');
                      setIsPreviewModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-orange-400 hover:underline cursor-pointer"
                  >
                    Layar Penuh ↗
                  </button>
                </div>

                {/* Simulated Phone Shell */}
                <div className="w-full max-w-[300px] mx-auto bg-stone-950 border-4 border-stone-800 rounded-3xl overflow-hidden shadow-2xl">
                  {/* Phone Speaker Notch */}
                  <div className="h-4 bg-stone-900 flex items-center justify-center">
                    <div className="w-12 h-1 bg-stone-800 rounded-full" />
                  </div>

                  {/* Top Bar of Store Menu */}
                  <div className="relative h-28 bg-stone-900 overflow-hidden">
                    <img src={bannerImage} alt="Banner" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-stone-950 border border-orange-500/50 p-0.5 shrink-0 overflow-hidden">
                        <BrandLogo logoUrl={logoUrl} storeName={storeName} className="w-full h-full object-contain rounded-lg" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-[11px] font-black text-white truncate uppercase">{storeName}</h5>
                        <p className="text-[9px] text-stone-300 truncate">{tagline}</p>
                      </div>
                    </div>
                  </div>

                  {/* Announcement Banner */}
                  {bannerText && (
                    <div className="bg-orange-500/20 border-b border-orange-500/30 px-3 py-1.5 text-[9px] font-bold text-orange-300 truncate">
                      {bannerText}
                    </div>
                  )}

                  {/* Content Mock */}
                  <div className="p-3 space-y-2 bg-stone-950">
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pb-1 border-b border-stone-900">
                      <span>Status: {isOpenOnline ? '🟢 Buka' : '🔴 Tutup'}</span>
                      <span>Jam: {operatingHours.split(' ')[0]}</span>
                    </div>

                    <div className="flex gap-1 overflow-hidden py-1">
                      <span className="px-2 py-0.5 bg-orange-500 text-stone-950 text-[9px] font-black rounded-md shrink-0">
                        Semua
                      </span>
                      <span className="px-2 py-0.5 bg-stone-900 text-stone-400 text-[9px] font-bold rounded-md shrink-0">
                        Pop Ice
                      </span>
                      <span className="px-2 py-0.5 bg-stone-900 text-stone-400 text-[9px] font-bold rounded-md shrink-0">
                        Makanan
                      </span>
                    </div>

                    {/* 2 Product Cards Mock */}
                    <div className="space-y-1.5 pt-1">
                      {products.slice(0, 2).map((p) => (
                        <div key={p.id} className="p-1.5 bg-stone-900 rounded-xl border border-stone-850 flex items-center gap-2">
                          <img src={p.foto} alt={p.nama} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-stone-200 block truncate">{p.nama}</span>
                            <span className="text-[9px] font-mono font-black text-orange-400">{formatRupiah(p.harga_jual)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Simulated Floating Cart */}
                    <div className="mt-2 p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-stone-950 text-[10px] font-black flex items-center justify-between shadow-lg">
                      <span>1 Pesanan di Keranjang</span>
                      <span>Lihat →</span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDevice('mobile');
                      setIsPreviewModalOpen(true);
                    }}
                    className="min-h-[38px] w-full px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Uji Coba Tampilan Interaktif</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB C: PENGATURAN MENU PRODUK ==================== */}
        {activeTab === 'produk' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Top Toolbar: Search, Category Filter, and Sorting */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div>
                  <h3 className="text-sm font-extrabold text-stone-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-400" />
                    <span>Katalog & Ketersediaan Menu Produk</span>
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Aktifkan atau nonaktifkan ketersediaan menu secara langsung (stok habis/tersedia) untuk pelanggan online.
                  </p>
                </div>

                {/* Quick Navigate to Full Products Management */}
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('products')}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <span>Kelola Produk Lengkap</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
                  </button>
                )}
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari nama menu / SKU..."
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div>
                  <select
                    value={selectedProductCategory}
                    onChange={(e) => setSelectedProductCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {allCategoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        Kategori: {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sorting at Customer View */}
                <div>
                  <select
                    disabled={isReadOnly}
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as any);
                      markDirty();
                    }}
                    className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 cursor-pointer disabled:opacity-60"
                  >
                    <option value="terlaris">Urutan Pelanggan: Menu Terlaris / Favorit</option>
                    <option value="nama">Urutan Pelanggan: Abjad Nama (A - Z)</option>
                    <option value="harga_termurah">Urutan Pelanggan: Harga Termurah</option>
                    <option value="harga_termahal">Urutan Pelanggan: Harga Termahal</option>
                  </select>
                </div>
              </div>

              {/* Category Segmented Quick Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                {allCategoryNames.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedProductCategory(cat)}
                    className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedProductCategory === cat
                        ? 'bg-orange-500 text-stone-950 shadow-sm'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 hover:bg-stone-850 border border-stone-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table / Cards Grid */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs">
                <span className="font-extrabold text-stone-300">
                  Menampilkan {filteredProducts.length} dari {products.length} Menu
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">● {activeProductsCount} Tersedia</span>
                  <span className="text-rose-400 font-bold">● {outOfStockCount} Habis/Nonaktif</span>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-stone-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-stone-600" />
                  <p className="text-xs">Tidak ada menu yang sesuai dengan filter pencarian.</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-800/80">
                  {filteredProducts.map((prod) => {
                    const isAvailable = prod.status === 'Aktif';
                    const hasVariants = Array.isArray(prod.varian) && prod.varian.length > 0;

                    return (
                      <div
                        key={prod.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-850/50 transition"
                      >
                        {/* Left: Product Info & Image */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-950 border border-stone-800 overflow-hidden shrink-0">
                            <img
                              src={prod.foto}
                              alt={prod.nama}
                              className={`w-full h-full object-cover ${
                                !isAvailable ? 'grayscale opacity-60' : ''
                              }`}
                            />
                            {prod.is_terlaris && (
                              <span className="absolute top-1 left-1 bg-amber-500 text-stone-950 text-[8px] font-black px-1.5 py-0.2 rounded-md">
                                Best
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-extrabold text-stone-100 truncate">
                                {prod.nama}
                              </h4>
                              <span className="text-[10px] font-bold text-stone-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
                                {prod.kategori}
                              </span>
                            </div>

                            <p className="text-xs text-stone-400 font-mono mt-0.5">
                              SKU: {prod.sku} · Stok: {prod.stok} {prod.satuan}
                            </p>

                            {/* Variants Display if available */}
                            {hasVariants && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-stone-400">Varian:</span>
                                {prod.varian?.map((v) => (
                                  <span
                                    key={v}
                                    className="text-[10px] font-medium bg-stone-950 text-stone-300 border border-stone-800 px-1.5 py-0.5 rounded"
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Price & Quick Availability Toggle */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
                          <div className="text-left sm:text-right">
                            <span className="text-sm sm:text-base font-black font-mono text-orange-400 block">
                              {formatRupiah(prod.harga_jual)}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              Modal: {formatRupiah(prod.harga_modal)}
                            </span>
                          </div>

                          {/* Instant Availability Switch Button */}
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleToggleProductStatus(prod)}
                            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                              isAvailable
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30'
                                : 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30'
                            }`}
                            title={isAvailable ? 'Klik untuk tandai habis' : 'Klik untuk aktifkan menu'}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAvailable ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span>{isAvailable ? 'Tersedia' : 'Habis'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB D: PENGATURAN PEMESANAN & QR CODE ==================== */}
        {activeTab === 'pemesanan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Column 1: QR Code Card & Sharing */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-orange-400" />
                  <h3 className="text-sm font-extrabold text-stone-200">QR Code Menu Digital</h3>
                </div>
                <p className="text-xs text-stone-400">
                  Cetak standee QR Code ini untuk ditempel di meja warung, kasir, atau pamflet banner.
                </p>
              </div>

              {/* QR Image Box */}
              <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-inner border border-stone-300">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Menu" className="w-48 h-48 sm:w-52 sm:h-52 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-stone-400 text-xs">
                    Memuat QR...
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintQR}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Standee</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Tautan ke Broadcast WhatsApp</span>
                </button>

                <p className="text-[11px] text-center text-stone-400">
                  Mendukung cetak Standee Akrilik Meja ukuran A5 / A6.
                </p>
              </div>
            </div>

            {/* Column 2 & 3: Order Flow & Payment Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tautan URL Box */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xl">
                <h4 className="text-xs font-extrabold text-stone-200">Tautan Web Menu Online</h4>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-800">
                  <div className="flex items-center gap-2 px-2 flex-1 min-w-0">
                    <Globe className="w-4 h-4 text-orange-400 shrink-0" />
                    <input
                      type="text"
                      readOnly
                      value={publicMenuUrl}
                      className="bg-transparent text-xs sm:text-sm font-mono text-stone-300 w-full outline-none select-all truncate"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                    </button>

                    <a
                      href={publicMenuUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-orange-400 text-xs font-bold flex items-center justify-center transition"
                      title="Buka Menu di Tab Baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Pengaturan Pemesanan Form */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-100">Pengaturan Pemesanan & Pembayaran</h3>
                      <p className="text-[11px] text-stone-400">Atur jam penerimaan pesanan, rekening bank, e-wallet, dan estimasi waktu saji.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Toggle Online Ordering */}
                  <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-extrabold text-stone-200 block">Aktifkan Pemesanan Online</span>
                      <span className="text-[11px] text-stone-400">
                        Izinkan pelanggan memasukkan menu ke keranjang dan checkout via WhatsApp/Web.
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        setOnlineEnabled(!onlineEnabled);
                        markDirty();
                      }}
                      className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        onlineEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {onlineEnabled ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  {/* Estimasi Waktu Pesanan & Minimum Order */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5">
                        Estimasi Waktu Pesanan:
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={prepTime}
                          onChange={(e) => {
                            setPrepTime(e.target.value);
                            markDirty();
                          }}
                          placeholder="15 - 25 Menit"
                          className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5">
                        Minimal Pemesanan (Rp):
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={minOrder}
                        onChange={(e) => {
                          setMinOrder(Number(e.target.value));
                          markDirty();
                        }}
                        placeholder="20000"
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 font-mono focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Rekening Bank & E-Wallet */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5">
                        Rekening Bank Transfer:
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={bankInfo}
                          onChange={(e) => {
                            setBankInfo(e.target.value);
                            markDirty();
                          }}
                          placeholder="BCA 8830192831 a.n Warung Bang Kobra"
                          className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5">
                        Informasi E-Wallet:
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={ewalletInfo}
                        onChange={(e) => {
                          setEwalletInfo(e.target.value);
                          markDirty();
                        }}
                        placeholder="DANA / GoPay / OVO: 0812-3456-7890"
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Ongkos Kirim Delivery */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5">
                        Ongkos Kirim Area Pesantren (Rp):
                      </label>
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={deliveryFee}
                        onChange={(e) => {
                          setDeliveryFee(Number(e.target.value));
                          markDirty();
                        }}
                        placeholder="5000"
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 font-mono focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1.5">
                        Cakupan Area Antar:
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deliveryArea}
                        onChange={(e) => {
                          setDeliveryArea(e.target.value);
                          markDirty();
                        }}
                        placeholder="Area sekitar Pesantren DQM"
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB E: INFO & KONTAK ==================== */}
        {activeTab === 'informasi' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-100">Informasi Layanan & Pengumuman</h3>
                    <p className="text-[11px] text-stone-400">Pemberitahuan promo, customer service, dan profil tentang warung.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Announcement Banner */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Teks Banner Promo & Pengumuman Berjalan:
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={bannerText}
                    onChange={(e) => {
                      setBannerText(e.target.value);
                      markDirty();
                    }}
                    placeholder="Contoh: 🔥 Promo Spesial Hari Ini: Gratis Es Teh Manis setiap pesan Mi Rendang!"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    Muncul sebagai marquee / highlight di bagian paling atas halaman menu online pelanggan.
                  </span>
                </div>

                {/* Store Description / Tentang Warung */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Tentang Warung Bang Kobra (Profil Singkat):
                  </label>
                  <textarea
                    rows={4}
                    disabled={isReadOnly}
                    value={storeDesc}
                    onChange={(e) => {
                      setStoreDesc(e.target.value);
                      markDirty();
                    }}
                    placeholder="Tuliskan cerita singkat, keunggulan menu, atau pesan ramah kepada pelanggan..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                  />
                </div>

                {/* Customer Service Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1.5">
                      Kontak Layanan Pelanggan (CS):
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={customerService}
                      onChange={(e) => {
                        setCustomerService(e.target.value);
                        markDirty();
                      }}
                      placeholder="0812-3456-7890"
                      className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 font-mono focus:outline-none focus:border-orange-500 transition disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1.5">
                      Catatan Kaki Struk Kasir:
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={settings.receiptFooter || 'Matur Suwun / Terima kasih sudah memesan 🙏'}
                      readOnly
                      className="w-full text-xs px-3.5 py-2.5 bg-stone-950/60 border border-stone-800 rounded-2xl text-stone-400"
                    />
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Dapat diubah lebih lanjut pada tab Pengaturan Kasir.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Sharing Tips */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl text-xs">
              <h4 className="text-xs font-extrabold text-stone-200 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-orange-400" />
                <span>Tips Pemasaran Menu Warung</span>
              </h4>

              <div className="space-y-3 text-stone-400">
                <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
                  <strong className="text-stone-200 block text-xs">1. Bio Instagram & TikTok</strong>
                  <p className="text-[11px]">
                    Salin tautan menu digital warung dan pasang di tautan bio profil agar pelanggan luar pesantren mudah memesan.
                  </p>
                </div>

                <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
                  <strong className="text-stone-200 block text-xs">2. Broadcast WhatsApp Jam Makan</strong>
                  <p className="text-[11px]">
                    Kirimkan tautan menu saat jam istirahat makan siang (11:30) dan makan malam santri (17:30).
                  </p>
                </div>

                <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
                  <strong className="text-stone-200 block text-xs">3. Standee Meja Akrilik</strong>
                  <p className="text-[11px]">
                    Cetak standee dari tab D dan letakkan di meja makan agar pelanggan langsung scan dan tidak menunggu buku menu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM FLOATING ACTION BAR FOR SAVING / CANCELING */}
      <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs">
          {isDirty ? (
            <span className="text-amber-400 font-extrabold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Ada perubahan yang belum disimpan.</span>
            </span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Semua data Menu Toko tersinkronisasi.</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Batalkan Perubahan */}
          {isDirty && (
            <button
              type="button"
              onClick={handleCancelChanges}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold transition cursor-pointer"
            >
              Batalkan Perubahan
            </button>
          )}

          {/* Pulihkan Pengaturan Bawaan */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => setIsResetConfirmOpen(true)}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="Pulihkan ke setelan bawaan sistem"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            <span>Pulihkan Default</span>
          </button>

          {/* Pratinjau Toko */}
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Pratinjau Toko</span>
          </button>

          {/* Simpan Perubahan */}
          <button
            type="button"
            disabled={isSaving || isReadOnly}
            onClick={() => handleSaveAll()}
            className={`min-h-[40px] px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              isReadOnly
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-400 text-stone-950 shadow-md shadow-orange-950/40'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ==================== 5. LIVE PREVIEW MODAL ==================== */}
      {isPreviewModalOpen && (
        <div
          id="modal-store-preview-backdrop"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreviewModalOpen(false);
          }}
        >
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-100">Pratinjau Langsung Menu Toko</h3>
                  <p className="text-[11px] text-stone-400">
                    Mencerminkan data yang sedang Anda edit sebelum disimpan ke database.
                  </p>
                </div>
              </div>

              {/* Device Simulator Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-stone-900 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-orange-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>HP Android</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-orange-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Komputer</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Simulation Frame */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-stone-950/70 flex-1 flex justify-center items-start">
              {previewDevice === 'mobile' ? (
                /* Mobile Phone Simulator (380px) */
                <div className="w-full max-w-[380px] bg-stone-950 border-4 border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                  {/* Status Bar */}
                  <div className="bg-stone-900 px-4 py-1.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                    <span>09:41</span>
                    <span className="flex items-center gap-1">
                      <span>4G</span>
                      <span>● 100%</span>
                    </span>
                  </div>

                  {/* Header Banner */}
                  <div className="relative h-36 bg-stone-900 overflow-hidden">
                    <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-stone-950 border border-orange-500/60 p-0.5 shrink-0 overflow-hidden shadow-md">
                        <BrandLogo logoUrl={logoUrl} storeName={storeName} className="w-full h-full object-contain rounded-lg" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white uppercase truncate">{storeName}</h4>
                        <p className="text-[10px] text-stone-300 truncate">{tagline}</p>
                        <span className="text-[9px] text-emerald-400 font-bold">
                          {isOpenOnline ? '● Buka (Menerima Pesanan)' : '● Tutup Sementara'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Announcement Banner */}
                  {bannerText && (
                    <div className="bg-orange-500/20 border-b border-orange-500/30 px-3 py-1.5 text-[10px] font-bold text-orange-300 truncate">
                      {bannerText}
                    </div>
                  )}

                  {/* Info Bar */}
                  <div className="p-3 bg-stone-900/60 border-b border-stone-850 flex items-center justify-between text-[10px] text-stone-400">
                    <span>⏰ {operatingHours}</span>
                    <span>🛵 Prep: {prepTime}</span>
                  </div>

                  {/* Products Mock */}
                  <div className="p-3 space-y-2.5 max-h-[350px] overflow-y-auto">
                    <span className="text-[11px] font-extrabold text-stone-200 block">Daftar Menu:</span>
                    <div className="space-y-2">
                      {products.slice(0, 4).map((p) => (
                        <div key={p.id} className="p-2 bg-stone-900 rounded-xl border border-stone-850 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={p.foto} alt={p.nama} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-stone-200 block truncate">{p.nama}</span>
                              <span className="text-[10px] font-mono text-orange-400 font-extrabold">{formatRupiah(p.harga_jual)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-lg bg-orange-500 text-stone-950 text-[10px] font-black shrink-0"
                          >
                            + Tambah
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Bottom Bar */}
                  <div className="p-3 bg-stone-900 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">Total: 0 Item</span>
                    <button
                      type="button"
                      className="px-4 py-1.5 rounded-xl bg-orange-500 text-stone-950 text-xs font-black shadow-md"
                    >
                      Keranjang Pesanan
                    </button>
                  </div>
                </div>
              ) : (
                /* Desktop Simulation (Full Width) */
                <div className="w-full bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                  {/* Desktop Browser Header */}
                  <div className="bg-stone-950 px-4 py-2 border-b border-stone-800 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 bg-stone-900 px-3 py-1 rounded-lg text-xs font-mono text-stone-400 truncate">
                      {publicMenuUrl}
                    </div>
                  </div>

                  {/* Desktop Hero Banner */}
                  <div className="relative h-44 bg-stone-950 overflow-hidden">
                    <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-stone-950 border-2 border-orange-500 p-1 shrink-0 overflow-hidden shadow-xl">
                          <BrandLogo logoUrl={logoUrl} storeName={storeName} className="w-full h-full object-contain rounded-xl" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white uppercase">{storeName}</h3>
                          <p className="text-xs text-stone-300">{tagline}</p>
                          <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                            <span>⏰ {operatingHours}</span>
                            <span>·</span>
                            <span>📍 {address}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          isOpenOnline ? 'bg-emerald-500 text-stone-950' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {isOpenOnline ? 'Menerima Pesanan' : 'Tutup Sementara'}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Grid Preview */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-xs">
                      <span className="font-extrabold text-stone-200">Katalog Menu ({products.length} Menu)</span>
                      <span className="text-stone-400">Estimasi Saji: {prepTime}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {products.slice(0, 6).map((p) => (
                        <div key={p.id} className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex flex-col justify-between">
                          <img src={p.foto} alt={p.nama} className="w-full h-24 object-cover rounded-lg mb-2" />
                          <div>
                            <span className="text-xs font-bold text-stone-200 block truncate">{p.nama}</span>
                            <span className="text-xs font-mono font-black text-orange-400 block mt-1">
                              {formatRupiah(p.harga_jual)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
              <span className="text-xs text-stone-400">
                Mode Pratinjau mencerminkan perubahan formulir secara langsung.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => handleSaveAll()}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-black transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  Simpan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. RESET CONFIRMATION MODAL ==================== */}
      {isResetConfirmOpen && (
        <div
          id="modal-reset-confirm"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-stone-100">
                Pulihkan ke Pengaturan Bawaan?
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Tindakan ini akan mengembalikan nama toko, slogan, banner, dan pengaturan jam ke setelan awal WARUNG BANG KOBRA.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition cursor-pointer shadow-md"
              >
                Ya, Pulihkan Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
