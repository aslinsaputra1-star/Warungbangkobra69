import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Flame,
  Star,
  AlertCircle,
  Check,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, qty: number, variant?: string, note?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (product) {
      const variants = Array.isArray(product.varian) ? product.varian : [];
      setSelectedVariant(variants.length > 0 ? variants[0] : '');
      setQty(1);
      setNote('');
    }
  }, [product]);

  if (!product) return null;

  const isOutOfStock = product.stok <= 0;
  const variants = Array.isArray(product.varian) ? product.varian : [];
  const hasVariants = variants.length > 0;
  const maxQty = Math.max(1, product.stok);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    if (hasVariants && !selectedVariant) return;
    onAddToCart(product, qty, hasVariants ? selectedVariant : undefined, note.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-stone-950 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Product Image Header */}
        <div className="relative h-56 sm:h-64 bg-stone-900 shrink-0 overflow-hidden">
          <img
            src={product.foto}
            alt={product.nama}
            className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/15 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 text-stone-200 border border-white/10 backdrop-blur-md">
              {product.kategori}
            </span>
            {product.is_terlaris && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 shadow-md">
                <Flame className="w-3 h-3 fill-current" />
                Terlaris
              </span>
            )}
            {product.is_favorit && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500 text-stone-950 flex items-center gap-1 shadow-md">
                <Star className="w-3 h-3 fill-current" />
                Favorit
              </span>
            )}
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
              <span className="px-5 py-2 rounded-xl bg-red-600 text-white font-black text-sm tracking-widest uppercase shadow-xl border border-red-400">
                STOK HABIS
              </span>
            </div>
          )}

          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                {product.nama}
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                Stok tersedia: <strong className="text-orange-400">{product.stok} {product.satuan}</strong>
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg sm:text-xl font-black text-orange-400 font-mono">
                {formatRupiah(product.harga_jual)}
              </div>
              <div className="text-[10px] text-stone-400">per {product.satuan}</div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleConfirm} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Description */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 mb-1">
              Deskripsi Menu
            </h4>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              {product.deskripsi || 'Menu spesial olahan segar khas Warung Bang Kobra.'}
            </p>
          </div>

          {/* Flavor / Variant Picker */}
          {hasVariants && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-stone-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Pilih Varian Rasa *</span>
                </label>
                <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  Wajib Pilih 1
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.map((variant) => {
                  const isSelected = selectedVariant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between gap-1.5 border transition cursor-pointer ${
                        isSelected
                          ? 'bg-red-600/20 border-red-500 text-white shadow-sm'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="truncate">{variant}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Item Note */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Catatan Tambahan (Opsional)</span>
            </label>
            <input
              type="text"
              disabled={isOutOfStock}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Pedas sedang, es sedikit, tanpa bawang..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
              <div>
                <div className="text-xs font-extrabold text-white">Jumlah Pesanan</div>
                <div className="text-[11px] text-stone-400">Maksimal {maxQty} {product.satuan}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono font-black text-base text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.min(maxQty, prev + 1))}
                  className="w-9 h-9 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            {isOutOfStock ? (
              <div className="w-full py-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-stone-500 font-extrabold text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Maaf, Produk Ini Sedang Habis</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-950/50 flex items-center justify-between transition active:scale-98 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Tambah ke Keranjang</span>
                </span>
                <span className="font-mono text-sm bg-black/25 px-3 py-1 rounded-lg">
                  {formatRupiah(product.harga_jual * qty)}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
