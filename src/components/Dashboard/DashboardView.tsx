import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Package,
  DollarSign,
  AlertTriangle,
  MessageCircle,
  PlusCircle,
  Layers,
  BarChart2,
  Calendar,
  ArrowUpRight,
  ArrowRight,
  QrCode,
  Bike,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Percent,
} from 'lucide-react';
import { Transaction, Product, Expense, ActiveTab } from '../../types';
import { formatRupiah, formatDateIndo, formatDateTime } from '../../utils/formatters';

interface DashboardViewProps {
  transactions: Transaction[];
  products: Product[];
  expenses?: Expense[];
  onNavigate: (tab: ActiveTab) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  products,
  expenses = [],
  onNavigate,
  onSelectTransaction,
}) => {
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Filter transactions based on active date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (customDate) {
        return tx.tanggal === customDate;
      }
      if (dateRange === 'today') {
        return tx.tanggal === todayStr;
      }
      if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return tx.tanggal >= d.toISOString().split('T')[0];
      }
      if (dateRange === 'month') {
        return tx.tanggal.startsWith(currentMonthStr);
      }
      return true;
    });
  }, [transactions, dateRange, customDate, todayStr, currentMonthStr]);

  // Completed Transactions in range
  const completedTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => tx.status === 'Selesai');
  }, [filteredTransactions]);

  // Total Sales in range
  const totalSales = useMemo(() => {
    return completedTransactions.reduce((sum, tx) => sum + tx.total, 0);
  }, [completedTransactions]);

  // Total Items Sold in range
  const totalItemsSold = useMemo(() => {
    return completedTransactions.reduce(
      (sum, tx) => sum + tx.items.reduce((s, i) => s + i.qty, 0),
      0
    );
  }, [completedTransactions]);

  // Pending Incoming Orders (Not yet completed)
  const incomingOrders = useMemo(() => {
    return filteredTransactions.filter(
      (tx) => tx.tahap_pesanan === 'MENUNGGU' || (!tx.tahap_pesanan && tx.status === 'Pending')
    );
  }, [filteredTransactions]);

  // Filter expenses based on date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      if (customDate) {
        return ex.tanggal === customDate;
      }
      if (dateRange === 'today') {
        return ex.tanggal === todayStr;
      }
      if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return ex.tanggal >= d.toISOString().split('T')[0];
      }
      if (dateRange === 'month') {
        return ex.tanggal.startsWith(currentMonthStr);
      }
      return true;
    });
  }, [expenses, dateRange, customDate, todayStr, currentMonthStr]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, ex) => sum + ex.jumlah, 0);
  }, [filteredExpenses]);

  // Gross Profit: (Selling Price - Modal Price) * Qty
  const grossProfit = useMemo(() => {
    let profit = 0;
    completedTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.id_produk || p.nama === item.nama_produk);
        const modal = prod ? prod.harga_modal : item.harga * 0.5;
        profit += (item.harga - modal) * item.qty;
      });
    });
    return Math.max(0, profit);
  }, [completedTransactions, products]);

  // Net Profit: Gross Profit - Expenses
  const netProfit = grossProfit - totalExpense;

  // Products with Stock <= 0 (Habis)
  const emptyStockProducts = useMemo(() => {
    return products.filter((p) => p.stok <= 0);
  }, [products]);

  // Products with Stock <= minimum (Menipis)
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stok > 0 && p.stok <= p.stok_minimum);
  }, [products]);

  // Payment Breakdown (Real calculation from DB)
  const paymentBreakdown = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {
      Cash: { count: 0, total: 0 },
      QRIS: { count: 0, total: 0 },
      Transfer: { count: 0, total: 0 },
      'E-wallet': { count: 0, total: 0 },
    };

    completedTransactions.forEach((tx) => {
      const method = tx.metode_pembayaran || 'Cash';
      const key = summary[method] ? method : 'Cash';
      summary[key].count += 1;
      summary[key].total += tx.total;
    });

    return summary;
  }, [completedTransactions]);

  // Top Selling Products in range
  const topSellingProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; total: number; foto: string }> = {};
    completedTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!counts[item.nama_produk]) {
          const prod = products.find((p) => p.id === item.id_produk || p.nama === item.nama_produk);
          counts[item.nama_produk] = {
            name: item.nama_produk,
            qty: 0,
            total: 0,
            foto: prod?.foto || '',
          };
        }
        counts[item.nama_produk].qty += item.qty;
        counts[item.nama_produk].total += item.subtotal || item.harga * item.qty;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedTransactions, products]);

  // 7 Days Trend Data for Chart
  const salesChartData = useMemo(() => {
    const days: Array<{ date: string; label: string; total: number; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayTxs = transactions.filter((tx) => tx.tanggal === dStr && tx.status === 'Selesai');
      const total = dayTxs.reduce((s, tx) => s + tx.total, 0);
      days.push({
        date: dStr,
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        total,
        count: dayTxs.length,
      });
    }
    return days;
  }, [transactions]);

  const maxSales = Math.max(...salesChartData.map((d) => d.total), 50000);

  // Recent 6 Transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 6);
  }, [transactions]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Quick Action & Time Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <span>Dashboard Operasional Warung</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Ringkasan data real-time penjualan, laba, pesanan masuk, dan stok Warung Bang Kobra.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => {
                setDateRange('today');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateRange === 'today' && !customDate
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => {
                setDateRange('7days');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateRange === '7days' && !customDate
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => {
                setDateRange('month');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateRange === 'month' && !customDate
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => {
                setDateRange('all');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateRange === 'all' && !customDate
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-2xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-transparent text-stone-200 focus:outline-none"
            />
            {customDate && (
              <button
                onClick={() => setCustomDate('')}
                className="text-[10px] text-rose-400 font-bold ml-1 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/30 whitespace-nowrap active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Kasir POS</span>
          </button>
        </div>
      </div>

      {/* KPI 6 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Penjualan */}
        <div className="p-4 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Penjualan</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-stone-100">
            {formatRupiah(totalSales)}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>{completedTransactions.length} transaksi</span>
          </div>
        </div>

        {/* 2. Jumlah Transaksi */}
        <div className="p-4 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transaksi</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-stone-100">
            {completedTransactions.length}
          </div>
          <div className="text-[10px] text-stone-400">
            Rata-rata: {completedTransactions.length ? formatRupiah(Math.round(totalSales / completedTransactions.length)) : 'Rp 0'}
          </div>
        </div>

        {/* 3. Produk Terjual */}
        <div className="p-4 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Produk Terjual</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
            {totalItemsSold}
          </div>
          <div className="text-[10px] text-stone-400">porsi / item pesanan</div>
        </div>

        {/* 4. Pesanan Masuk (Pending) */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-4 rounded-3xl bg-stone-900 border border-orange-500/30 hover:border-orange-500 shadow-xl space-y-1 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Pesanan Masuk
            </span>
            <ShoppingBag className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-orange-400">
            {incomingOrders.length}
          </div>
          <div className="text-[10px] text-orange-400/80 font-bold hover:underline">
            Klik untuk tinjau antrean &rarr;
          </div>
        </div>

        {/* 5. Pengeluaran */}
        <div className="p-4 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pengeluaran</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-rose-400">
            {formatRupiah(totalExpense)}
          </div>
          <div className="text-[10px] text-stone-400">
            {filteredExpenses.length} catatan biaya
          </div>
        </div>

        {/* 6. Estimasi Laba Bersih */}
        <div className="p-4 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Laba Bersih</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div
            className={`text-lg sm:text-xl font-black font-mono ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatRupiah(netProfit)}
          </div>
          <div className="text-[10px] text-stone-400">
            Kotor: {formatRupiah(grossProfit)}
          </div>
        </div>
      </div>

      {/* Middle Grid: Sales Trend Chart & Top Selling Menu */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Chart Bar (7 Days) */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-orange-500" />
              <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
                Grafik Tren Penjualan 7 Hari Terakhir
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              Tertinggi: {formatRupiah(maxSales)}
            </span>
          </div>

          <div className="h-52 flex items-end justify-between gap-2 pt-6 pb-2 px-1">
            {salesChartData.map((d, i) => {
              const heightPercent = maxSales > 0 ? (d.total / maxSales) * 100 : 0;
              const isToday = d.date === todayStr;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition text-[10px] font-mono text-stone-300 font-bold bg-stone-950 px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                    {formatRupiah(d.total)} ({d.count} tx)
                  </div>

                  <div className="w-full max-w-[36px] bg-stone-950 rounded-xl p-1 flex items-end h-full">
                    <div
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-red-600 via-orange-500 to-amber-400'
                          : 'bg-gradient-to-t from-stone-800 to-stone-600 hover:from-orange-800 hover:to-orange-500'
                      }`}
                    />
                  </div>

                  <span
                    className={`text-[10px] font-bold ${
                      isToday ? 'text-orange-400 font-black' : 'text-stone-400'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu Terlaris (Top Selling) */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
              Menu Terlaris Periode Ini
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-orange-400 hover:text-orange-300"
            >
              Detail &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-10">
                Belum ada data penjualan pada periode ini.
              </p>
            ) : (
              topSellingProducts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-950 border border-stone-800/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-stone-800 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-stone-200 truncate">{item.name}</h4>
                      <p className="text-[10px] text-stone-400 font-mono">
                        {formatRupiah(item.total)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-stone-900 text-stone-200 shrink-0">
                    {item.qty} porsi
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ringkasan Pembayaran (Payment Summary) */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <h3 className="font-extrabold text-stone-100 text-sm sm:text-base flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-500" />
          <span>Ringkasan Metode Pembayaran (Database Aktual)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tunai */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Tunai (Cash)</span>
            </div>
            <div className="text-base font-black font-mono text-emerald-400">
              {formatRupiah(paymentBreakdown.Cash?.total || 0)}
            </div>
            <div className="text-[10px] text-stone-500">
              {paymentBreakdown.Cash?.count || 0} transaksi
            </div>
          </div>

          {/* QRIS */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>QRIS</span>
            </div>
            <div className="text-base font-black font-mono text-sky-400">
              {formatRupiah(paymentBreakdown.QRIS?.total || 0)}
            </div>
            <div className="text-[10px] text-stone-500">
              {paymentBreakdown.QRIS?.count || 0} transaksi
            </div>
          </div>

          {/* Transfer */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
              <CreditCard className="w-4 h-4 text-purple-400" />
              <span>Transfer Bank</span>
            </div>
            <div className="text-base font-black font-mono text-purple-400">
              {formatRupiah(paymentBreakdown.Transfer?.total || 0)}
            </div>
            <div className="text-[10px] text-stone-500">
              {paymentBreakdown.Transfer?.count || 0} transaksi
            </div>
          </div>

          {/* E-wallet */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
              <Smartphone className="w-4 h-4 text-orange-400" />
              <span>E-wallet</span>
            </div>
            <div className="text-base font-black font-mono text-orange-400">
              {formatRupiah(paymentBreakdown['E-wallet']?.total || 0)}
            </div>
            <div className="text-[10px] text-stone-500">
              {paymentBreakdown['E-wallet']?.count || 0} transaksi
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Stok Peringatan (Habis & Menipis) & Transaksi Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stok Habis & Hampir Habis */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
                Peringatan Stok Menu
              </h3>
            </div>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs font-bold text-orange-400 hover:text-orange-300"
            >
              Kelola Stok &rarr;
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {emptyStockProducts.length === 0 && lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-xs">
                Semua stok produk dalam kondisi aman dan mencukupi!
              </div>
            ) : (
              <>
                {/* Produk Habis */}
                {emptyStockProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-rose-950/30 border border-rose-800/60"
                  >
                    <div>
                      <div className="font-bold text-xs text-rose-300">{prod.nama}</div>
                      <div className="text-[10px] text-stone-400">
                        Kategori: {prod.kategori}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black font-mono bg-rose-600 text-white animate-pulse">
                      HABIS (0)
                    </span>
                  </div>
                ))}

                {/* Produk Hampir Habis */}
                {lowStockProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-amber-900/40"
                  >
                    <div>
                      <div className="font-bold text-xs text-stone-200">{prod.nama}</div>
                      <div className="text-[10px] text-stone-400">
                        Batas Minimal: {prod.stok_minimum} {prod.satuan}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Sisa {prod.stok}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
              Pesanan & Transaksi Terkini
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-orange-400 hover:text-orange-300"
            >
              Semua Pesanan &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-8">Belum ada transaksi.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id_transaksi}
                  onClick={() => onSelectTransaction(tx)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-stone-800 hover:border-orange-500/50 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-400 flex items-center justify-center font-mono text-[10px] font-bold group-hover:text-orange-400">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-200">
                          #{tx.id_transaksi}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-stone-800 text-stone-300">
                          {tx.tipe_pesanan || 'Takeaway'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {tx.nama_pelanggan || 'Pelanggan'} • {tx.jam}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-extrabold text-xs text-orange-400">
                      {formatRupiah(tx.total)}
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase text-stone-400">
                      {tx.metode_pembayaran} • {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
