import { Transaction } from '../types';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp' + rounded.toLocaleString('id-ID');
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const formatDateTime = formatDateTimeIndo;

export function sanitizeWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const sanitized = sanitizeWhatsAppNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  return sanitized
    ? `https://wa.me/${sanitized}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Format Pesanan Pelanggan via WhatsApp sesuai Format Permintaan Bagian 5:
 *
 * Halo Warung Bang Kobra 👋
 *
 * Saya ingin pesan:
 *
 * 1. Mi Aceh x2 = Rp20.000
 * 2. Es Teh x2 = Rp10.000
 * 3. Es Kopi Gula Aren x1 = Rp10.000
 *
 * Total: Rp40.000
 *
 * Nama: Budi
 * Jam ambil: 16.30
 * Catatan: Sambal dipisah
 *
 * Terima kasih 🙏
 */
export interface OnlineQRCodeOrderPayload {
  orderId: string;
  storeName: string;
  orderType: 'Takeaway' | 'Delivery';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupTime?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryFee?: number;
  discount?: number;
  paymentMethod: string;
  paymentStatus?: string;
  notes?: string;
  items: Array<{ name: string; variant?: string; qty: number; price: number; notes?: string }>;
  subtotal: number;
  total: number;
}

export function buildOnlineQRCodeOrderWhatsAppMessage(
  payload: OnlineQRCodeOrderPayload
): string {
  const isDelivery = payload.orderType === 'Delivery';
  const typeLabel = isDelivery ? '🛵 DELIVERY (PESAN ANTAR - AREA PESANTREN DQM)' : '🥡 TAKEAWAY (AMBIL DI WARUNG)';

  let msg = `*BUKTI PESANAN ONLINE*\n`;
  msg += `*${payload.storeName.toUpperCase()}*\n`;
  msg += `==============================\n`;
  msg += `📋 *No. Pesanan:* ${payload.orderId}\n`;
  msg += `📌 *Jenis Pesanan:* ${typeLabel}\n\n`;

  msg += `👤 *Data Pelanggan:*\n`;
  msg += `• Nama: ${payload.customerName}\n`;
  msg += `• WhatsApp: ${payload.customerPhone}\n`;
  if (payload.customerEmail) {
    msg += `• Email: ${payload.customerEmail}\n`;
  }

  if (isDelivery) {
    if (payload.deliveryAddress) {
      msg += `• Alamat / Titik Antar: ${payload.deliveryAddress}\n`;
    }
    if (payload.deliveryLandmark) {
      msg += `• Patokan Lokasi: ${payload.deliveryLandmark}\n`;
    }
  } else {
    if (payload.pickupTime) {
      msg += `• Jam Ambil: ${payload.pickupTime}\n`;
    }
  }

  msg += `\n🛒 *Daftar Menu Pesanan:*\n`;
  payload.items.forEach((item, idx) => {
    const sub = item.qty * item.price;
    const varLabel = item.variant ? ` (${item.variant})` : '';
    msg += `${idx + 1}. *${item.name}${varLabel}* x${item.qty} = ${formatRupiah(sub)}\n`;
    if (item.notes && item.notes.trim() !== '') {
      msg += `   _Catatan: ${item.notes.trim()}_\n`;
    }
  });

  msg += `\n==============================\n`;
  msg += `Subtotal: ${formatRupiah(payload.subtotal)}\n`;
  if (payload.discount && payload.discount > 0) {
    msg += `Diskon: -${formatRupiah(payload.discount)}\n`;
  }
  if (isDelivery && payload.deliveryFee && payload.deliveryFee > 0) {
    msg += `Ongkos Kirim: ${formatRupiah(payload.deliveryFee)}\n`;
  }
  msg += `*TOTAL PEMBAYARAN: ${formatRupiah(payload.total)}*\n`;
  msg += `💳 *Metode Pembayaran:* ${payload.paymentMethod}\n`;
  if (payload.paymentStatus) {
    msg += `📌 *Status Pembayaran:* ${payload.paymentStatus}\n`;
  }

  if (payload.notes && payload.notes.trim() !== '') {
    msg += `\n📝 *Catatan Pesanan:* ${payload.notes.trim()}\n`;
  }

  msg += `==============================\n`;
  msg += `Halo ${payload.storeName}, mohon konfirmasi dan proses pesanan saya ya. Terima kasih! 🙏`;

  return msg;
}

export function buildWhatsAppOrderMessage(payload: {
  orderId: string;
  storeName: string;
  orderType: 'Takeaway' | 'Delivery' | string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupTime?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  paymentMethod: string;
  items: Array<{
    nama?: string;
    name?: string;
    qty: number;
    harga?: number;
    price?: number;
    catatan?: string;
    notes?: string;
    variant?: string;
  }>;
  subtotal: number;
  shippingFee?: number;
  discount?: number;
  grandTotal: number;
  notes?: string;
}): string {
  return buildOnlineQRCodeOrderWhatsAppMessage({
    orderId: payload.orderId,
    storeName: payload.storeName,
    orderType: payload.orderType === 'Delivery' ? 'Delivery' : 'Takeaway',
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail,
    pickupTime: payload.pickupTime,
    deliveryAddress: payload.deliveryAddress,
    deliveryLandmark: payload.deliveryLandmark,
    deliveryFee: payload.shippingFee,
    discount: payload.discount,
    paymentMethod: payload.paymentMethod,
    notes: payload.notes,
    items: payload.items.map((i) => ({
      name: i.nama || i.name || 'Menu',
      variant: i.variant,
      qty: i.qty,
      price: i.harga ?? i.price ?? 0,
      notes: i.catatan || i.notes,
    })),
    subtotal: payload.subtotal,
    total: payload.grandTotal,
  });
}

export function buildEmailReceiptSubjectAndBody(
  input:
    | Transaction
    | {
        orderId: string;
        storeName: string;
        orderType: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        paymentMethod: string;
        paymentStatus?: string;
        createdAt?: string;
        deliveryAddress?: string;
        items: Array<{
          nama: string;
          variant?: string;
          qty: number;
          harga: number;
          catatan?: string;
        }>;
        subtotal: number;
        shippingFee?: number;
        discount?: number;
        grandTotal: number;
        notes?: string;
      },
  defaultStoreName = 'WARUNG BANG KOBRA'
): { subject: string; body: string } {
  if ('id_transaksi' in input) {
    const tx = input;
    const storeName = defaultStoreName;
    const subject = `Struk Pesanan Online #${tx.id_transaksi} - ${storeName}`;
    let body = `STRUK RESMI PESANAN ONLINE - ${storeName.toUpperCase()}\n`;
    body += `================================================\n`;
    body += `Nomor Pesanan     : ${tx.id_transaksi}\n`;
    body += `Waktu Pemesanan   : ${tx.tanggal} ${tx.jam}\n`;
    body += `Nama Pelanggan    : ${tx.nama_pelanggan}\n`;
    body += `No. WhatsApp      : ${tx.no_hp_pelanggan || tx.no_whatsapp || '-'}\n`;
    if (tx.email_pelanggan) {
      body += `Email Pelanggan   : ${tx.email_pelanggan}\n`;
    }
    body += `Jenis Pesanan     : ${tx.tipe_pesanan || 'Takeaway'}\n`;
    if (tx.alamat_pengiriman || tx.alamat_pengantaran) {
      body += `Alamat Pengantaran: ${tx.alamat_pengiriman || tx.alamat_pengantaran}\n`;
    }
    body += `Status Pesanan    : ${tx.tahap_pesanan || tx.status}\n`;
    body += `Metode Pembayaran : ${tx.metode_pembayaran}\n`;
    body += `Status Pembayaran : ${tx.status_pembayaran || 'MENUNGGU'}\n`;
    body += `================================================\n\n`;
    body += `RINCIAN MENU PESANAN:\n`;
    tx.items.forEach((it, i) => {
      const varStr = it.varian ? ` [Varian: ${it.varian}]` : '';
      const unitPrice = it.harga_satuan ?? it.harga ?? 0;
      body += `${i + 1}. ${it.nama_produk}${varStr} x${it.qty} @ ${formatRupiah(unitPrice)} = ${formatRupiah(it.subtotal)}\n`;
      if (it.catatan_item || it.catatan) {
        body += `   Catatan: ${it.catatan_item || it.catatan}\n`;
      }
    });
    body += `\n------------------------------------------------\n`;
    body += `Subtotal          : ${formatRupiah(tx.subtotal)}\n`;
    if (tx.diskon > 0) {
      body += `Diskon            : -${formatRupiah(tx.diskon)}\n`;
    }
    if ((tx.ongkir || tx.biaya || 0) > 0) {
      body += `Ongkos Kirim      : +${formatRupiah(tx.ongkir || tx.biaya || 0)}\n`;
    }
    body += `TOTAL PEMBAYARAN  : ${formatRupiah(tx.total)}\n`;
    body += `================================================\n\n`;
    if (tx.catatan || tx.catatan_pesanan) {
      body += `Catatan Pesanan: ${tx.catatan || tx.catatan_pesanan}\n\n`;
    }
    body += `Terima kasih telah memesan di ${storeName}!\n`;
    return { subject, body };
  }

  const storeName = input.storeName || defaultStoreName;
  const subject = `Struk Pesanan Online #${input.orderId} - ${storeName}`;
  let body = `STRUK RESMI PESANAN ONLINE - ${storeName.toUpperCase()}\n`;
  body += `================================================\n`;
  body += `Nomor Pesanan     : ${input.orderId}\n`;
  if (input.createdAt) {
    body += `Waktu Pemesanan   : ${input.createdAt}\n`;
  }
  body += `Nama Pelanggan    : ${input.customerName}\n`;
  body += `No. WhatsApp      : ${input.customerPhone}\n`;
  if (input.customerEmail) {
    body += `Email Pelanggan   : ${input.customerEmail}\n`;
  }
  body += `Jenis Pesanan     : ${input.orderType}\n`;
  if (input.deliveryAddress) {
    body += `Alamat Pengantaran: ${input.deliveryAddress}\n`;
  }
  body += `Metode Pembayaran : ${input.paymentMethod}\n`;
  body += `Status Pembayaran : ${input.paymentStatus || 'MENUNGGU'}\n`;
  body += `================================================\n\n`;
  body += `RINCIAN MENU PESANAN:\n`;
  input.items.forEach((it, i) => {
    const varStr = it.variant ? ` [Varian: ${it.variant}]` : '';
    body += `${i + 1}. ${it.nama}${varStr} x${it.qty} @ ${formatRupiah(it.harga)} = ${formatRupiah(
      it.harga * it.qty
    )}\n`;
    if (it.catatan) {
      body += `   Catatan: ${it.catatan}\n`;
    }
  });
  body += `\n------------------------------------------------\n`;
  body += `Subtotal          : ${formatRupiah(input.subtotal)}\n`;
  if ((input.discount || 0) > 0) {
    body += `Diskon            : -${formatRupiah(input.discount || 0)}\n`;
  }
  if ((input.shippingFee || 0) > 0) {
    body += `Ongkos Kirim      : +${formatRupiah(input.shippingFee || 0)}\n`;
  }
  body += `TOTAL PEMBAYARAN  : ${formatRupiah(input.grandTotal)}\n`;
  body += `================================================\n\n`;
  if (input.notes) {
    body += `Catatan Pesanan: ${input.notes}\n\n`;
  }
  body += `Terima kasih telah memesan di ${storeName}!\n`;
  return { subject, body };
}

export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 720,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(ev.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function buildCustomerWhatsAppOrderMessage(
  storeName: string,
  customerName: string,
  pickupTime: string,
  notes: string,
  paymentMethod: string,
  items: Array<{ name: string; qty: number; price: number; notes?: string }>,
  total: number
): string {
  let message = `Halo ${storeName} 👋\n\nSaya ingin pesan:\n\n`;

  items.forEach((item, index) => {
    const sub = item.qty * item.price;
    message += `${index + 1}. ${item.name} x${item.qty} = ${formatRupiah(sub)}`;
    if (item.notes && item.notes.trim() !== '') {
      message += ` (${item.notes})`;
    }
    message += `\n`;
  });

  message += `\nTotal: ${formatRupiah(total)}\n\n`;
  message += `Nama: ${customerName || 'Pelanggan'}\n`;
  if (pickupTime && pickupTime.trim() !== '') {
    message += `Jam ambil: ${pickupTime}\n`;
  }
  if (paymentMethod && paymentMethod.trim() !== '') {
    message += `Metode Pembayaran: ${paymentMethod}\n`;
  }
  if (notes && notes.trim() !== '') {
    message += `Catatan: ${notes}\n`;
  }
  message += `\nTerima kasih 🙏`;

  return message;
}

/**
 * Format Pesanan Struk Kasir ke WhatsApp sesuai Format Permintaan Bagian 6:
 *
 * WARUNG BANG KOBRA
 * ====================
 * No: WKB-20260908-001
 *
 * Pesanan:
 * Mi Aceh x2       Rp20.000
 * Es Teh x2        Rp10.000
 * Es Kopi Aren x1  Rp10.000
 *
 * Total: Rp40.000
 * Pembayaran: CASH
 * ====================
 *
 * Terima kasih sudah membeli di
 * WARUNG BANG KOBRA 🙏
 */
export function buildCashierReceiptWhatsAppMessage(
  tx: Transaction,
  storeName = 'WARUNG BANG KOBRA'
): string {
  let text = `${storeName.toUpperCase()}\n`;
  text += `====================\n`;
  text += `No: ${tx.id_transaksi}\n`;
  text += `Tanggal: ${tx.tanggal} ${tx.jam}\n`;
  text += `Kasir: ${tx.kasir}\n\n`;
  text += `Pesanan:\n`;

  tx.items.forEach((item) => {
    const lineSub = formatRupiah(item.subtotal || item.harga * item.qty);
    const itemLabel = `${item.nama_produk} x${item.qty}`;
    // Simple monospace alignment simulation
    text += `${itemLabel.padEnd(16, ' ')} ${lineSub}\n`;
    if (item.catatan) {
      text += `  *${item.catatan}*\n`;
    }
  });

  text += `\nSubtotal: ${formatRupiah(tx.subtotal)}\n`;
  if (tx.diskon > 0) {
    text += `Diskon: -${formatRupiah(tx.diskon)}\n`;
  }
  if (tx.biaya > 0) {
    text += `Biaya Tambahan: +${formatRupiah(tx.biaya)}\n`;
  }
  text += `Total: ${formatRupiah(tx.total)}\n`;
  text += `Pembayaran: ${tx.metode_pembayaran.toUpperCase()}\n`;
  if (tx.metode_pembayaran === 'Cash' && tx.uang_diterima) {
    text += `Bayar: ${formatRupiah(tx.uang_diterima)}\n`;
    text += `Kembali: ${formatRupiah(tx.kembalian)}\n`;
  }
  text += `====================\n\n`;
  text += `Terima kasih sudah membeli di\n${storeName.toUpperCase()} 🙏`;

  return text;
}

export function openWhatsAppChat(phoneNumber: string, message: string): void {
  const sanitized = sanitizeWhatsAppNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  const url = sanitized
    ? `https://wa.me/${sanitized}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, '_blank');
}

/**
 * Format nomor antrian Takeaway ringkas (misal: TK-01, TK-02)
 */
export function getTakeawayQueueNumber(tx: { id_transaksi: string; created_at?: string }): string {
  if (!tx || !tx.id_transaksi) return 'TK-01';
  const parts = tx.id_transaksi.split('-');
  const lastPart = parts[parts.length - 1];
  const num = parseInt(lastPart, 10);
  if (!isNaN(num)) {
    return `TK-${String(num).padStart(2, '0')}`;
  }
  const digits = tx.id_transaksi.replace(/\D/g, '').slice(-2);
  return `TK-${digits || '01'}`;
}

/**
 * Mainkan nada lonceng antrian yang jernih (Web Audio API)
 */
export function playQueueChimeSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Ding-dong chime sequence
    playTone(659.25, now, 0.4); // E5
    playTone(523.25, now + 0.15, 0.6); // C5
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

/**
 * Panggil nomor antrian menggunakan suara bahasa Indonesia (SpeechSynthesis)
 */
export function callTakeawayQueueVoice(queueNo: string, customerName?: string): void {
  if (typeof window === 'undefined') return;

  playQueueChimeSound();

  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const cleanQueue = queueNo.replace('-', ' ');
    const namePart = customerName && customerName.trim() && customerName !== 'Pelanggan Umum'
      ? `atas nama ${customerName.trim()}, `
      : '';
    const text = `Nomor antrian ${cleanQueue}, ${namePart}pesanan bungkus sudah siap diambil di kasir. Terima kasih.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    // Wait slightly for chime to finish
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 450);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Format pesan WhatsApp konfirmasi pesanan takeaway siap diambil
 */
export function buildTakeawayReadyWhatsAppMessage(
  customerName: string,
  queueNo: string,
  storeName: string
): string {
  const name = customerName && customerName !== 'Pelanggan Umum' ? customerName : 'Kak';
  return (
    `Halo ${name} 👋\n\n` +
    `Kabar gembira! Pesanan Takeaway (Bungkus) Anda dengan *Nomor Antrian: ${queueNo}* di *${storeName}* SUDAH SIAP DIAMBIL di meja kasir. 🥡✨\n\n` +
    `Silakan tunjukkan pesan ini atau sebutkan nomor antrian Anda ke kasir.\n` +
    `Terima kasih dan selamat menikmati hidangan kami! 🙏`
  );
}

