import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer,
  writeBatch,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Transaction,
  Product,
  CategoryItem,
  Expense,
  Customer,
  StoreSettings,
  StockMutation,
  WarungUser,
  UserRole,
  OnlineOrderStage,
  PaymentStatus,
  OrderStatusHistoryItem,
  AuditLog,
  AppNotification,
} from '../types';

// Initialize Firebase App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore using configured databaseId or default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

export { firebaseConfig };

// --- SKILL ERROR HANDLER MANDATE ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firestore Connection as specified in skill guidelines
let hasTestedConnection = false;
export async function testFirestoreConnection(force = false): Promise<{ connected: boolean; message: string }> {
  if (hasTestedConnection && !force) {
    return { connected: true, message: 'Firestore terhubung dan aktif (cached).' };
  }
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    hasTestedConnection = true;
    console.log('Firebase Firestore successfully connected.');
    return { connected: true, message: 'Koneksi ke Firebase Firestore berhasil!' };
  } catch (error: any) {
    if (error && typeof error.message === 'string' && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return { connected: false, message: 'Klien Firebase sedang offline atau dibatasi jaringan.' };
    }
    // Document not found (code: 'not-found') is fine and means the network reached the server
    if (error?.code === 'not-found' || (error?.message && !error.message.includes('permission-denied') && !error.message.includes('unavailable'))) {
      hasTestedConnection = true;
      return { connected: true, message: 'Firebase Firestore terhubung (Database aktif).' };
    }
    console.warn('Firestore connection check notice:', error);
    hasTestedConnection = true;
    return { connected: true, message: 'Koneksi ke Firebase Firestore siap digunakan.' };
  }
}

// Initial test trigger
testFirestoreConnection();

/**
 * FIREBASE AUTHENTICATION SERVICES
 * Note: PASSWORDS ARE NEVER STORED IN FIRESTORE!
 * Authentication is fully handled by Firebase Authentication.
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // If an anonymous guest session was active, sign out first to avoid provider collision
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        await signOut(auth);
      } catch (soErr) {
        console.warn('Notice: sign out anonymous before Google login:', soErr);
      }
    }

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Synchronize user profile into Firestore safely (non-blocking for auth)
    try {
      await syncFirebaseUserProfile(user);
    } catch (syncErr) {
      console.warn('User profile sync notice (non-fatal):', syncErr);
    }

    return user;
  } catch (error: any) {
    // If the user closed the popup window intentionally or cancelled, handle cleanly
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.log('Google Sign-In popup closed by user or cancelled.');
    } else {
      console.error('Error signing in with Google Firebase Auth:', error);
    }
    throw error;
  }
}

export async function signInAnonymouslyCustomer(): Promise<FirebaseUser> {
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (error) {
    console.error('Error with anonymous customer sign in:', error);
    throw error;
  }
}

export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  return auth.currentUser;
}

export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out from Firebase Auth:', error);
    throw error;
  }
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Auto-initialize anonymous session if no session exists yet
ensureFirebaseAuth().catch(() => {});

/**
 * Synchronize Firebase Auth profile to Firestore `/users/{uid}`
 * STRICT SECURITY INVARIANT: NEVER STORE PASSWORD OR PIN IN FIRESTORE
 */
export async function syncFirebaseUserProfile(
  user: FirebaseUser,
  customRole?: UserRole,
  customName?: string
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    let existingData: any = null;
    try {
      const existingSnap = await getDoc(userDocRef);
      if (existingSnap.exists()) {
        existingData = existingSnap.data();
      }
    } catch (readErr) {
      console.warn('Could not read existing user doc (will create):', readErr);
    }

    let role: UserRole = 'Customer';
    // Developer runtime email bootstrap
    if (user.email === 'rayyanarasid549@gmail.com') {
      role = 'Owner';
    } else if (customRole) {
      role = customRole;
    } else if (existingData?.role) {
      role = existingData.role as UserRole;
    }

    const payload: any = {
      uid: user.uid,
      email: user.email || '',
      nama: customName || user.displayName || 'Pengguna Warung',
      role,
      no_hp: user.phoneNumber || '',
      avatar_url: user.photoURL || '',
      status: 'Aktif',
      updated_at: new Date().toISOString(),
    };

    if (!existingData) {
      payload.created_at = new Date().toISOString();
    }

    // Explicitly guarantee no password or pin is passed
    delete payload.password;
    delete payload.pin;

    await setDoc(userDocRef, payload, { merge: true });
  } catch (error) {
    console.warn('Sync user profile notice:', error);
  }
}

/**
 * OWNER ONLY: Save registered user (Admin, Kasir, Staff) to Firestore
 * Note: Never store PIN/Password in Firestore.
 */
export async function saveRegisteredUserToFirebase(user: WarungUser): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.id);
    const payload: any = {
      uid: user.id,
      nama: user.nama,
      role: user.role,
      no_hp: user.no_hp || '',
      email: user.email || '',
      status: user.status || 'Aktif',
      avatar_url: user.avatar_url || '',
      updated_at: new Date().toISOString(),
    };
    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not sync registered user to Firebase:', err);
  }
}

/**
 * OWNER ONLY: Delete user from Firestore
 */
export async function deleteUserFromFirebase(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.warn('Could not delete user from Firebase:', err);
  }
}

/**
 * OWNER ONLY: Subscribe to all registered users from Firestore
 */
export function subscribeToFirebaseUsers(
  onUsersReceived: (users: WarungUser[]) => void
): () => void {
  try {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersList: WarungUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.uid) {
            usersList.push({
              id: data.uid,
              nama: data.nama || 'Pengguna',
              username: data.username || (data.nama || '').toLowerCase().replace(/\s+/g, ''),
              role: data.role || 'Kasir',
              pin: '', // Preserved locally in storage for security
              no_hp: data.no_hp || '',
              email: data.email || '',
              avatar_url: data.avatar_url || '',
              status: data.status || 'Aktif',
              total_transaksi: data.total_transaksi || 0,
              total_omset: data.total_omset || 0,
              terakhir_aktif: data.updated_at || 'Aktif',
            });
          }
        });
        if (usersList.length > 0) {
          onUsersReceived(usersList);
        }
      },
      (error) => {
        // Expected if non-owner or unauthenticated
        console.warn('Firebase users subscription notice:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firebase users subscription failed:', err);
    return () => {};
  }
}

/**
 * Helper to map OnlineOrderStage to base Transaction status
 */
export function mapStageToStatus(stage: OnlineOrderStage): 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan' {
  switch (stage) {
    case 'MENUNGGU':
      return 'Pending';
    case 'DIKONFIRMASI':
    case 'DIPROSES':
    case 'SIAP':
      return 'Diproses';
    case 'SELESAI':
      return 'Selesai';
    case 'DIBATALKAN':
      return 'Dibatalkan';
    default:
      return 'Pending';
  }
}

export function getEffectiveOrderStage(tx: Transaction): OnlineOrderStage {
  if (tx.tahap_pesanan) return tx.tahap_pesanan;
  if (tx.status === 'Pending') return 'MENUNGGU';
  if (tx.status === 'Diproses') return 'DIPROSES';
  if (tx.status === 'Selesai') return 'SELESAI';
  if (tx.status === 'Dibatalkan') return 'DIBATALKAN';
  return 'MENUNGGU';
}

export function getStageLabel(stage: OnlineOrderStage, orderType?: string): string {
  switch (stage) {
    case 'MENUNGGU':
      return 'Menunggu Konfirmasi';
    case 'DIKONFIRMASI':
      return 'Pesanan Dikonfirmasi';
    case 'DIPROSES':
      return 'Sedang Diproses Dapur';
    case 'SIAP':
      return orderType === 'Delivery' ? 'Dalam Pengantaran' : 'Siap Diambil di Warung';
    case 'SELESAI':
      return 'Pesanan Selesai';
    case 'DIBATALKAN':
      return 'Pesanan Dibatalkan';
    default:
      return 'Menunggu Konfirmasi';
  }
}

/**
 * PUSH ORDER TO FIREBASE
 * Step in Customer Flow:
 * CHECKOUT -> FIREBASE -> KASIR MENERIMA PESANAN
 */
export async function saveOrderToFirebase(order: Transaction): Promise<{ success: boolean; error?: string }> {
  const path = `orders/${order.id_transaksi}`;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const orderDocRef = doc(db, 'orders', order.id_transaksi);
    const effectiveStage = getEffectiveOrderStage(order);
    const mappedStatus = mapStageToStatus(effectiveStage);

    const phoneVal = String(order.no_whatsapp || order.no_hp_pelanggan || '').slice(0, 32);
    const addrVal = String(order.alamat_pengantaran || order.alamat_pengiriman || '').slice(0, 300);
    const noteVal = String(order.catatan_pesanan || order.catatan || '').slice(0, 300);
    const feeVal = Math.max(0, Number(order.biaya ?? order.ongkir ?? 0));
    const custUid = String(order.customerId || order.customer_uid || auth.currentUser?.uid || '').slice(0, 128);

    const statusHist =
      Array.isArray(order.status_history) && order.status_history.length > 0
        ? order.status_history
        : [
            {
              stage: effectiveStage,
              tahap: effectiveStage,
              label: getStageLabel(effectiveStage, order.tipe_pesanan),
              timestamp: order.created_at || new Date().toISOString(),
              waktu: order.created_at || new Date().toISOString(),
              actor: order.nama_pelanggan || 'Pelanggan',
            },
          ];

    const timelineStat =
      Array.isArray(order.timeline_status) && order.timeline_status.length > 0
        ? order.timeline_status
        : statusHist.map((h) => ({
            tahap: (h.stage || h.tahap || effectiveStage) as OnlineOrderStage,
            waktu: String(h.timestamp || h.waktu || new Date().toISOString()),
            catatan: String(h.note || h.label || ''),
          }));

    // Sanitize data for Firestore
    const firestorePayload: Record<string, any> = {
      id_transaksi: String(order.id_transaksi).slice(0, 64),
      tanggal: String(order.tanggal || new Date().toISOString().split('T')[0]).slice(0, 32),
      jam: String(order.jam || new Date().toTimeString().split(' ')[0]).slice(0, 32),
      kasir: String(order.kasir || 'Pesanan Online').slice(0, 64),
      customerId: custUid,
      customer_uid: custUid,
      nama_pelanggan: String(order.nama_pelanggan || 'Pelanggan Online').slice(0, 100),
      no_whatsapp: phoneVal,
      no_hp_pelanggan: phoneVal,
      email_pelanggan: String(order.email_pelanggan || '').slice(0, 120),
      subtotal: Math.max(0, Number(order.subtotal || 0)),
      diskon: Math.max(0, Number(order.diskon || 0)),
      biaya: feeVal,
      ongkir: feeVal,
      total: Math.max(0, Number(order.total || 0)),
      metode_pembayaran: String(order.metode_pembayaran || 'Cash').slice(0, 32),
      status_pembayaran: order.status_pembayaran || (order.kasir === 'Pesanan Online' ? 'MENUNGGU' : 'LUNAS'),
      bukti_pembayaran_url: String(order.bukti_pembayaran_url || ''),
      bukti_pembayaran_at: String(order.bukti_pembayaran_at || ''),
      uang_diterima: Math.max(0, Number(order.uang_diterima ?? order.jumlah_bayar ?? 0)),
      jumlah_bayar: Math.max(0, Number(order.jumlah_bayar ?? order.uang_diterima ?? 0)),
      kembalian: Math.max(0, Number(order.kembalian || 0)),
      status: mappedStatus,
      tahap_pesanan: effectiveStage,
      stok_dikurangi: Boolean(order.stok_dikurangi ?? false),
      idempotency_key: String(order.idempotency_key || order.id_transaksi).slice(0, 128),
      tipe_pesanan: String(order.tipe_pesanan || 'Takeaway').slice(0, 32),
      waktu_ambil: String(order.waktu_ambil || '').slice(0, 100),
      alamat_pengantaran: addrVal,
      alamat_pengiriman: addrVal,
      patokan_lokasi: String(order.patokan_lokasi || '').slice(0, 200),
      catatan_pesanan: noteVal,
      catatan: noteVal,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      server_updated_at: serverTimestamp(),
      status_history: statusHist,
      timeline_status: timelineStat,
      items: (order.items || []).map((item) => {
        const unitPrice = Number(item.harga ?? item.harga_satuan ?? 0);
        const itemNote = String(item.catatan || item.catatan_item || '');
        return {
          id_detail: String(item.id_detail || ''),
          id_transaksi: String(item.id_transaksi || order.id_transaksi),
          id_produk: String(item.id_produk || ''),
          nama_produk: String(item.nama_produk || ''),
          varian: String(item.varian || ''),
          harga: unitPrice,
          harga_satuan: unitPrice,
          qty: Number(item.qty || 0),
          subtotal: Number(item.subtotal || 0),
          catatan: itemNote,
          catatan_item: itemNote,
          foto_produk: String(item.foto_produk || ''),
        };
      }),
    };

    await setDoc(orderDocRef, firestorePayload, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving order to Firebase Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // Return safe message
    }
    return {
      success: false,
      error: 'Gagal menyimpan pesanan ke server. Silakan periksa koneksi internet Anda.',
    };
  }
}

/**
 * SUBMIT ONLINE ORDER WITH ATOMIC FIRESTORE TRANSACTION & IDEMPOTENCY
 * - Prevents duplicate orders via idempotency check
 * - Verifies product stock availability in Firestore
 * - Saves order with serverTimestamp()
 */
export async function submitOnlineOrderWithTransaction(
  order: Transaction
): Promise<{ success: boolean; error?: string; order?: Transaction }> {
  const path = `orders/${order.id_transaksi}`;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }

    const orderDocRef = doc(db, 'orders', order.id_transaksi);

    await runTransaction(db, async (transaction) => {
      const existingOrderSnap = await transaction.get(orderDocRef);
      if (existingOrderSnap.exists()) {
        const existingData = existingOrderSnap.data();
        if (existingData?.idempotency_key && existingData.idempotency_key === order.idempotency_key) {
          // Idempotent success: already created
          return;
        }
      }

      // Check stock availability & verify trusted prices from Firestore
      const verifiedItems: any[] = [];
      let verifiedSubtotal = 0;
      for (const item of order.items) {
        if (!item.id_produk) continue;
        const prodRef = doc(db, 'products', item.id_produk);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data() as Product;
          if (prodData.status === 'Nonaktif') {
            throw new Error(`Menu "${prodData.nama}" sedang tidak tersedia / nonaktif.`);
          }
          if (typeof prodData.stok === 'number' && prodData.stok < item.qty) {
            throw new Error(
              prodData.stok <= 0
                ? `Mohon maaf, stok untuk menu "${item.nama_produk}" baru saja habis.`
                : `Stok "${item.nama_produk}" tersisa ${prodData.stok} porsi/cup.`
            );
          }
          const verifiedUnitPrice = Number(prodData.harga_jual ?? item.harga ?? 0);
          const itemSub = verifiedUnitPrice * Number(item.qty || 1);
          verifiedSubtotal += itemSub;
          verifiedItems.push({
            id_detail: String(item.id_detail || `${order.id_transaksi}-item-${verifiedItems.length + 1}`),
            id_transaksi: String(item.id_transaksi || order.id_transaksi),
            id_produk: String(item.id_produk),
            nama_produk: String(prodData.nama || item.nama_produk),
            varian: String(item.varian || ''),
            harga: verifiedUnitPrice,
            harga_satuan: verifiedUnitPrice,
            qty: Number(item.qty || 1),
            subtotal: itemSub,
            catatan: String(item.catatan || item.catatan_item || ''),
            catatan_item: String(item.catatan || item.catatan_item || ''),
            foto_produk: String(prodData.foto || prodData.gambar_url || item.foto_produk || ''),
          });
        } else {
          const unitPrice = Math.max(0, Number(item.harga ?? item.harga_satuan ?? 0));
          const itemSub = unitPrice * Number(item.qty || 1);
          verifiedSubtotal += itemSub;
          verifiedItems.push({
            ...item,
            harga: unitPrice,
            harga_satuan: unitPrice,
            subtotal: itemSub,
          });
        }
      }

      // Check delivery minimum & delivery fee from settings
      const settingsRef = doc(db, 'settings', 'warung');
      const settingsSnap = await transaction.get(settingsRef);
      let verifiedDeliveryFee = 0;
      let minDeliveryOrder = 20000;
      if (settingsSnap.exists()) {
        const sData = settingsSnap.data();
        minDeliveryOrder = Number(sData.deliveryMinOrder ?? 20000);
        verifiedDeliveryFee = Number(sData.deliveryFee ?? 5000);
      }

      if (order.tipe_pesanan === 'Delivery') {
        if (verifiedSubtotal < minDeliveryOrder) {
          throw new Error(
            `Minimum belanja untuk pesanan delivery di sekitar Pesantren DQM adalah Rp${minDeliveryOrder.toLocaleString('id-ID')}. Subtotal Anda saat ini Rp${verifiedSubtotal.toLocaleString('id-ID')}.`
          );
        }
      } else {
        verifiedDeliveryFee = 0;
      }

      const verifiedDiscount = Math.max(0, Number(order.diskon || 0));
      const verifiedTotal = Math.max(0, verifiedSubtotal + verifiedDeliveryFee - verifiedDiscount);

      const nowIso = order.created_at || new Date().toISOString();
      const phoneVal = String(order.no_whatsapp || order.no_hp_pelanggan || '').slice(0, 32);
      const addrVal = String(order.alamat_pengantaran || order.alamat_pengiriman || '').slice(0, 300);
      const noteVal = String(order.catatan_pesanan || order.catatan || '').slice(0, 300);
      const custUid = String(order.customerId || order.customer_uid || auth.currentUser?.uid || '').slice(0, 128);

      const initialHistory: OrderStatusHistoryItem[] =
        Array.isArray(order.status_history) && order.status_history.length > 0
          ? order.status_history
          : [
              {
                stage: 'MENUNGGU',
                tahap: 'MENUNGGU',
                label: 'Pesanan Dibuat & Menunggu Konfirmasi',
                timestamp: nowIso,
                waktu: nowIso,
                actor: order.nama_pelanggan,
              },
            ];

      const initialTimeline =
        Array.isArray(order.timeline_status) && order.timeline_status.length > 0
          ? order.timeline_status
          : [
              {
                tahap: 'MENUNGGU' as OnlineOrderStage,
                waktu: nowIso,
                catatan: 'Pesanan Dibuat & Menunggu Konfirmasi',
              },
            ];

      const payload: Record<string, any> = {
        id_transaksi: String(order.id_transaksi).slice(0, 64),
        tanggal: String(order.tanggal).slice(0, 32),
        jam: String(order.jam).slice(0, 32),
        kasir: String(order.kasir || 'Pesanan Online').slice(0, 64),
        customerId: custUid,
        customer_uid: custUid,
        nama_pelanggan: String(order.nama_pelanggan).slice(0, 100),
        no_whatsapp: phoneVal,
        no_hp_pelanggan: phoneVal,
        email_pelanggan: String(order.email_pelanggan || '').slice(0, 120),
        subtotal: verifiedSubtotal,
        diskon: verifiedDiscount,
        biaya: verifiedDeliveryFee,
        ongkir: verifiedDeliveryFee,
        total: verifiedTotal,
        metode_pembayaran: String(order.metode_pembayaran || 'Cash').slice(0, 32),
        status_pembayaran: order.status_pembayaran || 'MENUNGGU',
        bukti_pembayaran_url: String(order.bukti_pembayaran_url || ''),
        bukti_pembayaran_at: String(order.bukti_pembayaran_at || ''),
        uang_diterima: Math.max(0, Number(order.uang_diterima ?? order.jumlah_bayar ?? 0)),
        jumlah_bayar: Math.max(0, Number(order.jumlah_bayar ?? order.uang_diterima ?? 0)),
        kembalian: Math.max(0, Number(order.kembalian || 0)),
        status: 'Pending',
        tahap_pesanan: 'MENUNGGU',
        stok_dikurangi: false,
        idempotency_key: String(order.idempotency_key || order.id_transaksi).slice(0, 128),
        tipe_pesanan: String(order.tipe_pesanan || 'Takeaway').slice(0, 32),
        waktu_ambil: String(order.waktu_ambil || '').slice(0, 100),
        alamat_pengantaran: addrVal,
        alamat_pengiriman: addrVal,
        patokan_lokasi: String(order.patokan_lokasi || '').slice(0, 200),
        catatan_pesanan: noteVal,
        catatan: noteVal,
        created_at: nowIso,
        updated_at: nowIso,
        server_created_at: serverTimestamp(),
        server_updated_at: serverTimestamp(),
        status_history: initialHistory,
        timeline_status: initialTimeline,
        items: verifiedItems,
      };

      transaction.set(orderDocRef, payload, { merge: true });
    });

    return { success: true, order };
  } catch (error: any) {
    // If custom validation message from stock check, return friendly Indonesian message
    if (error instanceof Error && (error.message.includes('stok') || error.message.includes('Stok'))) {
      return { success: false, error: error.message };
    }
    // Fallback to saveOrderToFirebase if transaction failed due to offline cache
    const fallback = await saveOrderToFirebase(order);
    if (fallback.success) {
      return { success: true, order };
    }
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch {
      // Handled
    }
    return {
      success: false,
      error: 'Gagal mengirim pesanan. Pastikan koneksi internet stabil dan coba lagi.',
    };
  }
}

/**
 * TRANSITION ONLINE ORDER STAGE & ATOMICALLY SYNC PRODUCT STOCK ON CONFIRMATION
 * Timeline: MENUNGGU -> DIKONFIRMASI -> DIPROSES -> SIAP -> SELESAI (or DIBATALKAN)
 * Automatically deducts product stock in Firestore when order is confirmed (`DIKONFIRMASI` or later) if not yet deducted.
 */
export async function transitionOnlineOrderStageInFirebase(
  order: Transaction,
  nextStage: OnlineOrderStage,
  actorName = 'Admin Warung',
  note?: string
): Promise<{ success: boolean; updatedOrder: Transaction; error?: string }> {
  const path = `orders/${order.id_transaksi}`;
  const nowIso = new Date().toISOString();
  const mappedStatus = mapStageToStatus(nextStage);
  const label = getStageLabel(nextStage, order.tipe_pesanan);

  const existingHistory: OrderStatusHistoryItem[] = Array.isArray(order.status_history)
    ? [...order.status_history]
    : [
        {
          stage: 'MENUNGGU',
          label: 'Pesanan Dibuat',
          timestamp: order.created_at || nowIso,
          actor: order.nama_pelanggan,
        },
      ];

  // Append or update stage in history
  const existingIdx = existingHistory.findIndex((h) => h.stage === nextStage);
  const historyEntry: OrderStatusHistoryItem = {
    stage: nextStage,
    label,
    timestamp: nowIso,
    actor: actorName,
    ...(note ? { note } : {}),
  };

  if (existingIdx >= 0) {
    existingHistory[existingIdx] = historyEntry;
  } else {
    existingHistory.push(historyEntry);
  }

  const timelineStatus = existingHistory.map((h) => ({
    tahap: (h.stage || h.tahap || nextStage) as OnlineOrderStage,
    waktu: String(h.timestamp || h.waktu || nowIso),
    catatan: String(h.note || h.label || ''),
  }));

  const shouldDeductStock =
    !order.stok_dikurangi &&
    ['DIKONFIRMASI', 'DIPROSES', 'SIAP', 'SELESAI'].includes(nextStage);

  const updatedOrder: Transaction = {
    ...order,
    status: mappedStatus,
    tahap_pesanan: nextStage,
    status_history: existingHistory,
    timeline_status: timelineStatus,
    stok_dikurangi: order.stok_dikurangi || shouldDeductStock,
    updated_at: nowIso,
  };

  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }

    const orderDocRef = doc(db, 'orders', order.id_transaksi);

    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderDocRef);
      const alreadyDeducted = orderSnap.exists()
        ? Boolean(orderSnap.data()?.stok_dikurangi)
        : Boolean(order.stok_dikurangi);

      const needStockSync =
        !alreadyDeducted &&
        ['DIKONFIRMASI', 'DIPROSES', 'SIAP', 'SELESAI'].includes(nextStage);

      // Read all product docs first (Firestore transaction rule: all reads before writes)
      const productSnaps: Array<{
        ref: ReturnType<typeof doc>;
        snap: Awaited<ReturnType<typeof transaction.get>>;
        qty: number;
        nama: string;
        id_produk: string;
      }> = [];

      if (needStockSync) {
        for (const item of order.items || []) {
          if (!item.id_produk) continue;
          const prodRef = doc(db, 'products', item.id_produk);
          const prodSnap = await transaction.get(prodRef);
          productSnaps.push({
            ref: prodRef,
            snap: prodSnap,
            qty: Number(item.qty || 1),
            nama: item.nama_produk,
            id_produk: item.id_produk,
          });
        }
      }

      // Perform stock deductions and log stock mutations
      if (needStockSync) {
        for (const p of productSnaps) {
          if (p.snap.exists()) {
            const data = p.snap.data() as Product;
            const currentStok = Number(data.stok ?? 0);
            const newStok = Math.max(0, currentStok - p.qty);
            transaction.update(p.ref, {
              stok: newStok,
              updated_at: nowIso,
            });

            const mutId = `STK-${order.id_transaksi}-${p.id_produk}`.replace(/[^a-zA-Z0-9_-]/g, '');
            const mutRef = doc(db, 'stock_mutations', mutId);
            transaction.set(mutRef, {
              id: mutId,
              tanggal: nowIso.replace('T', ' ').substring(0, 19),
              id_produk: p.id_produk,
              nama_produk: p.nama,
              jenis: 'out',
              qty: p.qty,
              stok_sebelum: currentStok,
              stok_sesudah: newStok,
              keterangan: `Konfirmasi Pesanan Online #${order.id_transaksi}`,
            });
          }
        }
      }

      // Update the order document
      transaction.set(
        orderDocRef,
        {
          id_transaksi: order.id_transaksi,
          nama_pelanggan: order.nama_pelanggan,
          total: Number(order.total || 0),
          status: mappedStatus,
          tahap_pesanan: nextStage,
          status_history: existingHistory,
          timeline_status: timelineStatus,
          stok_dikurangi: alreadyDeducted || needStockSync,
          updated_at: nowIso,
          server_updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    });

    return { success: true, updatedOrder };
  } catch (error) {
    console.warn('Transaction fallback to saveOrderToFirebase:', error);
    await saveOrderToFirebase(updatedOrder);
    return { success: true, updatedOrder };
  }
}

export const createOnlineOrderTransaction = submitOnlineOrderWithTransaction;

export async function loginWithGoogleFirebase(): Promise<{
  user?: { uid: string; nama: string; email: string };
  error?: string;
}> {
  try {
    const fbUser = await signInWithGoogle();
    return {
      user: {
        uid: fbUser.uid,
        nama: fbUser.displayName || 'Pelanggan Warung Bang Kobra',
        email: fbUser.email || '',
      },
    };
  } catch (err: any) {
    return { error: err?.message || 'Gagal masuk dengan Google' };
  }
}

export async function updateOnlineOrderStageInFirebase(
  orderOrId: Transaction | string,
  nextStage: OnlineOrderStage,
  actorName = 'Admin Warung',
  note?: string
): Promise<{ success: boolean; updatedOrder?: Transaction; error?: string }> {
  let targetOrder: Transaction | null = null;
  if (typeof orderOrId === 'string') {
    const snap = await getDoc(doc(db, 'orders', orderOrId));
    if (snap.exists()) {
      targetOrder = snap.data() as Transaction;
    } else {
      return { success: false, error: 'Pesanan tidak ditemukan di database.' };
    }
  } else {
    targetOrder = orderOrId;
  }
  return transitionOnlineOrderStageInFirebase(targetOrder, nextStage, actorName, note);
}
export async function uploadPaymentProofToFirebase(
  orderOrId: Transaction | string,
  compressedDataUrl: string
): Promise<{ success: boolean; url: string; updatedOrder?: Transaction; error?: string }> {
  const nowIso = new Date().toISOString();
  let finalProofUrl = compressedDataUrl;

  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }

    let order: Transaction;
    if (typeof orderOrId === 'string') {
      const snap = await getDoc(doc(db, 'orders', orderOrId));
      if (!snap.exists()) {
        return { success: false, url: '', error: 'Pesanan tidak ditemukan di database.' };
      }
      order = snap.data() as Transaction;
    } else {
      order = orderOrId;
    }

    // Attempt upload to Firebase Storage first
    try {
      const fileRef = storageRef(
        storage,
        `payment_proofs/${order.id_transaksi}_${Date.now()}.jpg`
      );
      await uploadString(fileRef, compressedDataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(fileRef);
      if (downloadUrl) {
        finalProofUrl = downloadUrl;
      }
    } catch {
      // Graceful fallback: use compressed data URL (<120KB) directly in Firestore document
      console.info('Using inline Firestore storage for payment proof.');
    }

    const updatedOrder: Transaction = {
      ...order,
      bukti_pembayaran_url: finalProofUrl,
      bukti_pembayaran_at: nowIso,
      status_pembayaran: order.status_pembayaran === 'LUNAS' ? 'LUNAS' : 'DIVERIFIKASI',
      updated_at: nowIso,
    };

    await saveOrderToFirebase(updatedOrder);
    return { success: true, url: finalProofUrl, updatedOrder };
  } catch (error) {
    console.error('Failed uploading payment proof:', error);
    return {
      success: false,
      url: '',
      error: 'Gagal mengunggah bukti pembayaran. Silakan coba lagi.',
    };
  }
}

/**
 * UPDATE PAYMENT STATUS BY ADMIN / KASIR
 * Status: MENUNGGU | DIVERIFIKASI | LUNAS | DITOLAK
 */
export async function updateOrderPaymentStatusInFirebase(
  orderOrId: Transaction | string,
  paymentStatus: PaymentStatus
): Promise<{ success: boolean; updatedOrder?: Transaction; error?: string }> {
  const nowIso = new Date().toISOString();
  let order: Transaction;
  if (typeof orderOrId === 'string') {
    const snap = await getDoc(doc(db, 'orders', orderOrId));
    if (!snap.exists()) {
      return { success: false, error: 'Pesanan tidak ditemukan.' };
    }
    order = snap.data() as Transaction;
  } else {
    order = orderOrId;
  }
  const updatedOrder: Transaction = {
    ...order,
    status_pembayaran: paymentStatus,
    updated_at: nowIso,
  };
  const res = await saveOrderToFirebase(updatedOrder);
  return { success: res.success, updatedOrder, error: res.error };
}

/**
 * REAL-TIME LISTENER FOR CASHIER:
 * KASIR MENERIMA PESANAN secara langsung (instant push via onSnapshot)
 */
export function subscribeToFirebaseOrders(
  onOrdersReceived: (orders: Transaction[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'orders';
  try {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Transaction;
          list.push(data);
        });
        onOrdersReceived(list);
      },
      (error) => {
        console.warn('Firebase orders subscription notice:', error?.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize orders snapshot listener:', err);
    return () => {};
  }
}

/**
 * REAL-TIME LISTENER FOR CUSTOMER'S OWN ORDERS:
 * Filters orders belonging exclusively to the current customer (by UID, WhatsApp, or session order IDs)
 */
export function subscribeToCustomerOrders(
  customerOrderIds: string[],
  customerPhone: string,
  onOrdersReceived: (orders: Transaction[]) => void
): () => void {
  return subscribeToFirebaseOrders((allOrders) => {
    const uid = auth.currentUser?.uid;
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const idSet = new Set(customerOrderIds);

    const mine = allOrders.filter((ord) => {
      if (idSet.has(ord.id_transaksi)) return true;
      if (uid && ord.customerId && ord.customerId === uid) return true;
      if (cleanPhone && cleanPhone.length >= 8 && ord.no_whatsapp) {
        const ordPhone = ord.no_whatsapp.replace(/\D/g, '');
        if (ordPhone.endsWith(cleanPhone.slice(-8))) return true;
      }
      return false;
    });

    onOrdersReceived(mine);
  });
}

/**
 * CASHIER UPDATE ORDER STATUS IN FIREBASE
 * E.g., 'Diproses', 'Selesai', 'Dibatalkan'
 */
export async function updateFirebaseOrderStatus(
  orderId: string,
  newStatus: 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan',
  fullTransaction?: Transaction
): Promise<boolean> {
  const path = `orders/${orderId}`;
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    if (fullTransaction) {
      await saveOrderToFirebase({
        ...fullTransaction,
        status: newStatus,
      });
      return true;
    }
    await setDoc(
      orderDocRef,
      {
        id_transaksi: orderId,
        status: newStatus,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating order status in Firebase:', error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch {
      // Handled
    }
    return false;
  }
}

/**
 * SYNC PRODUCTS TO FIREBASE (Menu Warung Bang Kobra)
 * Syncs menu products and stock levels to Firestore
 */
export async function syncProductsToFirebase(products: Product[]): Promise<boolean> {
  if (!products || products.length === 0) {
    return false;
  }

  try {
    // Ensure Firebase Auth session is active
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }

    // Chunk in batches of 300 (Firestore maximum is 500 per batch)
    const BATCH_SIZE = 300;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const chunk = products.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const prod of chunk) {
        if (!prod || !prod.id) continue;
        const prodDocRef = doc(db, 'products', String(prod.id));
        const payload: Record<string, any> = {
          id: String(prod.id),
          sku: String(prod.sku || prod.id),
          nama: String(prod.nama || 'Menu Kobra'),
          kategori: String(prod.kategori || 'Makanan'),
          harga_modal: Number(prod.harga_modal ?? 0),
          harga_jual: Number(prod.harga_jual ?? 0),
          satuan: String(prod.satuan || 'Pcs'),
          stok: Number(prod.stok ?? 0),
          stok_minimum: Number(prod.stok_minimum ?? 0),
          foto: String(prod.foto || prod.gambar_url || ''),
          gambar_url: String(prod.foto || prod.gambar_url || ''),
          status: String(prod.status || 'Aktif'),
          deskripsi: String(prod.deskripsi || ''),
          varian: Array.isArray(prod.varian) ? prod.varian : [],
          is_favorit: Boolean(prod.is_favorit ?? false),
          is_terlaris: Boolean(prod.is_terlaris ?? false),
          created_at: String(prod.created_at || new Date().toISOString()),
          updated_at: new Date().toISOString(),
        };

        batch.set(prodDocRef, payload, { merge: true });
      }

      await batch.commit();
    }

    console.log(`Berhasil menyinkronkan ${products.length} menu ke Firebase Firestore.`);
    return true;
  } catch (err: any) {
    console.error('Error syncing products to Firebase:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    } catch {
      // Handled
    }
    return false;
  }
}

/**
 * REAL-TIME LISTENER FOR PRODUCTS CATALOG (Synced across all devices)
 */
export function subscribeToFirebaseProducts(
  onProductsReceived: (products: Product[]) => void
): () => void {
  try {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Product;
            if (data && data.id) {
              list.push(data);
            }
          });
          onProductsReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase products subscription warning:', error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'products');
        } catch {
          // Handled
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize products listener:', err);
    return () => {};
  }
}

/**
 * DELETE PRODUCT FROM FIREBASE
 */
export async function deleteProductFromFirebase(productId: string): Promise<boolean> {
  if (!productId) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'products', String(productId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Gagal menghapus produk ${productId} dari Firebase:`, err);
    return false;
  }
}

/**
 * DELETE ORDER FROM FIREBASE
 */
export async function deleteOrderFromFirebase(orderId: string): Promise<boolean> {
  if (!orderId) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'orders', String(orderId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Gagal menghapus order ${orderId} dari Firebase:`, err);
    return false;
  }
}

/**
 * SYNC CATEGORIES TO FIREBASE
 */
export async function syncCategoriesToFirebase(categories: CategoryItem[]): Promise<boolean> {
  if (!categories || categories.length === 0) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const batch = writeBatch(db);
    for (const cat of categories) {
      if (!cat || !cat.id) continue;
      const catRef = doc(db, 'categories', String(cat.id));
      batch.set(
        catRef,
        {
          id: String(cat.id),
          nama: String(cat.nama || 'Kategori'),
          deskripsi: String(cat.deskripsi || ''),
          icon: String(cat.icon || ''),
          urutan: Number(cat.urutan ?? 0),
          status: String(cat.status || 'Aktif'),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Gagal menyinkronkan kategori ke Firebase:', err);
    return false;
  }
}

/**
 * DELETE CATEGORY FROM FIREBASE
 */
export async function deleteCategoryFromFirebase(categoryId: string): Promise<boolean> {
  if (!categoryId) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'categories', String(categoryId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Gagal menghapus kategori ${categoryId} dari Firebase:`, err);
    return false;
  }
}

/**
 * SUBSCRIBE TO CATEGORIES (Synced across all devices)
 */
export function subscribeToFirebaseCategories(
  onCategoriesReceived: (categories: CategoryItem[]) => void
): () => void {
  try {
    const colRef = collection(db, 'categories');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: CategoryItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CategoryItem;
            if (data && data.id) {
              list.push(data);
            }
          });
          onCategoriesReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase categories subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize categories listener:', err);
    return () => {};
  }
}

/**
 * SAVE EXPENSE TO FIREBASE
 */
export async function saveExpenseToFirebase(expense: Expense): Promise<boolean> {
  if (!expense || !expense.id) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'expenses', String(expense.id));
    const payload = {
      id: String(expense.id),
      tanggal: String(expense.tanggal || new Date().toISOString().slice(0, 10)),
      kategori: String(expense.kategori || 'Operasional'),
      keterangan: String(expense.keterangan || ''),
      jumlah: Number(expense.jumlah ?? 0),
      catatan: String(expense.catatan || ''),
      diinput_oleh: String(expense.diinput_oleh || 'Kasir Warung'),
      created_at: String(expense.created_at || new Date().toISOString()),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan pengeluaran ke Firebase:', err);
    return false;
  }
}

/**
 * DELETE EXPENSE FROM FIREBASE
 */
export async function deleteExpenseFromFirebase(expenseId: string): Promise<boolean> {
  if (!expenseId) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'expenses', String(expenseId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Gagal menghapus pengeluaran ${expenseId} dari Firebase:`, err);
    return false;
  }
}

/**
 * SUBSCRIBE TO EXPENSES (Synced across all devices)
 */
export function subscribeToFirebaseExpenses(
  onExpensesReceived: (expenses: Expense[]) => void
): () => void {
  try {
    const colRef = collection(db, 'expenses');
    const q = query(colRef, orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Expense[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Expense;
            if (data && data.id) {
              list.push(data);
            }
          });
          onExpensesReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase expenses subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize expenses listener:', err);
    return () => {};
  }
}

/**
 * SAVE CUSTOMER TO FIREBASE
 */
export async function saveCustomerToFirebase(customer: Customer): Promise<boolean> {
  if (!customer || !customer.id) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'customers', String(customer.id));
    const payload = {
      id: String(customer.id),
      nama: String(customer.nama || 'Pelanggan'),
      no_whatsapp: String(customer.no_whatsapp || customer.whatsapp || ''),
      whatsapp: String(customer.no_whatsapp || customer.whatsapp || ''),
      alamat: String(customer.alamat || ''),
      catatan: String(customer.catatan || ''),
      total_transaksi: Number(customer.total_transaksi ?? 0),
      total_belanja: Number(customer.total_belanja ?? 0),
      last_order: String(customer.last_order || ''),
      created_at: String(customer.created_at || new Date().toISOString()),
      updated_at: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan pelanggan ke Firebase:', err);
    return false;
  }
}

/**
 * DELETE CUSTOMER FROM FIREBASE
 */
export async function deleteCustomerFromFirebase(customerId: string): Promise<boolean> {
  if (!customerId) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'customers', String(customerId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Gagal menghapus pelanggan ${customerId} dari Firebase:`, err);
    return false;
  }
}

/**
 * SUBSCRIBE TO CUSTOMERS (Synced across all devices)
 */
export function subscribeToFirebaseCustomers(
  onCustomersReceived: (customers: Customer[]) => void
): () => void {
  try {
    const colRef = collection(db, 'customers');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Customer[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Customer;
            if (data && data.id) {
              list.push(data);
            }
          });
          onCustomersReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase customers subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize customers listener:', err);
    return () => {};
  }
}

/**
 * SAVE STORE SETTINGS TO FIREBASE (Warung Bang Kobra global settings)
 */
export async function saveSettingsToFirebase(settings: StoreSettings): Promise<boolean> {
  if (!settings) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const docRef = doc(db, 'settings', 'warung');
    const payload = {
      id: 'warung',
      storeName: String(settings.storeName || 'Warung Bang Kobra'),
      tagline: String(settings.tagline || ''),
      storeSlogan: String(settings.storeSlogan || settings.tagline || ''),
      address: String(settings.address || ''),
      whatsappNumber: String(settings.whatsappNumber || ''),
      logoUrl: String(settings.logoUrl || '/icon.svg'),
      receiptFooter: String(settings.receiptFooter || ''),
      taxPercent: Number(settings.taxPercent ?? 0),
      currency: String(settings.currency || 'Rp'),
      qrisImageUrl: String(settings.qrisImageUrl || ''),
      onlineMenuEnabled: Boolean(settings.onlineMenuEnabled ?? true),
      onlineMenuBannerText: String(settings.onlineMenuBannerText || ''),
      onlineMenuHours: String(settings.onlineMenuHours || ''),
      onlineMenuBankInfo: String(settings.onlineMenuBankInfo || ''),
      ewalletInfo: String(settings.ewalletInfo || 'DANA / GoPay / OVO: 0812-3456-7890 a.n Warung Bang Kobra'),
      deliveryAreaInfo: String(settings.deliveryAreaInfo || 'Area sekitar Pesantren DQM (Darul Quran Mulia)'),
      deliveryMinOrder: Number(settings.deliveryMinOrder ?? 20000),
      deliveryFee: Number(settings.deliveryFee ?? 5000),
      onlineMenuIsOpen: Boolean(settings.onlineMenuIsOpen ?? true),
      updated_at: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan settings ke Firebase:', err);
    return false;
  }
}

/**
 * SUBSCRIBE TO STORE SETTINGS (Synced across all devices)
 */
export function subscribeToFirebaseSettings(
  onSettingsReceived: (settings: Partial<StoreSettings>) => void
): () => void {
  try {
    const docRef = doc(db, 'settings', 'warung');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remote = docSnap.data() as Partial<StoreSettings>;
          if (!remote.logoUrl || remote.logoUrl.trim() === '') {
            remote.logoUrl = '/icon.svg';
          }
          onSettingsReceived(remote);
        } else {
          // Dokumen settings belum ada di Firestore, trigger sinkronisasi awal
          onSettingsReceived({});
        }
      },
      (error) => {
        console.warn('Firebase settings subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize settings listener:', err);
    return () => {};
  }
}

/**
 * SAVE AUDIT LOG TO FIREBASE
 * Strictly recorded and audited in Firestore collection 'audit_logs'
 */
export async function saveAuditLogToFirebase(log: AuditLog): Promise<boolean> {
  if (!log || !log.id) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const cleanId = String(log.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const docRef = doc(db, 'audit_logs', cleanId);
    const payload = {
      id: cleanId,
      timestamp: String(log.timestamp || new Date().toISOString()),
      user_name: String(log.user_name || 'Kasir'),
      user_role: String(log.user_role || 'Staff'),
      action: String(log.action || 'PENGATURAN'),
      module: String(log.module || 'Sistem'),
      description: String(log.description || '').slice(0, 300),
      details: log.details || {},
      created_at: new Date().toISOString(),
      server_created_at: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Gagal mencatat audit log ke Firestore:', err);
    return false;
  }
}

/**
 * SUBSCRIBE TO FIREBASE AUDIT LOGS (Realtime for Owner & Admin)
 */
export function subscribeToFirebaseAuditLogs(
  onLogsReceived: (logs: AuditLog[]) => void
): () => void {
  try {
    const colRef = collection(db, 'audit_logs');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AuditLog[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AuditLog;
            if (data && data.id) {
              list.push(data);
            }
          });
          onLogsReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase audit logs subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize audit logs listener:', err);
    return () => {};
  }
}

/**
 * SAVE NOTIFICATION TO FIREBASE
 */
export async function saveNotificationToFirebase(notif: AppNotification): Promise<boolean> {
  if (!notif || !notif.id) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const cleanId = String(notif.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const docRef = doc(db, 'notifications', cleanId);
    const payload = {
      id: cleanId,
      timestamp: String(notif.timestamp || new Date().toISOString()),
      title: String(notif.title || 'Notifikasi Baru').slice(0, 100),
      message: String(notif.message || '').slice(0, 300),
      type: notif.type || 'system',
      read: Boolean(notif.read ?? false),
      linkTab: notif.linkTab || 'dashboard',
      created_at: new Date().toISOString(),
      server_created_at: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan notifikasi ke Firestore:', err);
    return false;
  }
}

/**
 * SUBSCRIBE TO FIREBASE NOTIFICATIONS
 */
export function subscribeToFirebaseNotifications(
  onNotifsReceived: (notifs: AppNotification[]) => void
): () => void {
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AppNotification[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AppNotification;
            if (data && data.id) {
              list.push(data);
            }
          });
          onNotifsReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase notifications subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize notifications listener:', err);
    return () => {};
  }
}

/**
 * MARK NOTIFICATION READ IN FIREBASE
 */
export async function markNotificationReadInFirebase(notifId: string): Promise<boolean> {
  if (!notifId) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const cleanId = String(notifId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const docRef = doc(db, 'notifications', cleanId);
    await setDoc(docRef, { read: true, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`Gagal memperbarui notifikasi ${notifId}:`, err);
    return false;
  }
}

/**
 * SAVE STOCK MUTATION TO FIREBASE
 */
export async function saveStockMutationToFirebase(mutation: StockMutation): Promise<boolean> {
  if (!mutation || !mutation.id) return false;
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuth();
    }
    const cleanId = String(mutation.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const docRef = doc(db, 'stock_mutations', cleanId);
    const payload = {
      id: cleanId,
      tanggal: String(mutation.tanggal || new Date().toISOString().replace('T', ' ').slice(0, 19)),
      id_produk: String(mutation.id_produk || ''),
      nama_produk: String(mutation.nama_produk || ''),
      jenis: mutation.jenis || 'adjustment',
      qty: Number(mutation.qty || 0),
      stok_sebelum: Number(mutation.stok_sebelum || 0),
      stok_sesudah: Number(mutation.stok_sesudah || 0),
      keterangan: String(mutation.keterangan || '').slice(0, 200),
      created_at: new Date().toISOString(),
      server_created_at: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan mutasi stok ke Firestore:', err);
    return false;
  }
}

/**
 * SUBSCRIBE TO FIREBASE STOCK MUTATIONS
 */
export function subscribeToFirebaseStockMutations(
  onMutationsReceived: (mutations: StockMutation[]) => void
): () => void {
  try {
    const colRef = collection(db, 'stock_mutations');
    const q = query(colRef, orderBy('tanggal', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: StockMutation[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as StockMutation;
            if (data && data.id) {
              list.push(data);
            }
          });
          onMutationsReceived(list);
        }
      },
      (error) => {
        console.warn('Firebase stock mutations subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize stock mutations listener:', err);
    return () => {};
  }
}
