import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  Trash2,
  FileSpreadsheet,
  FileText,
  Activity,
  CheckCircle2,
  Layers,
  Package,
  Receipt,
  Settings as SettingsIcon,
  ShoppingBag,
} from 'lucide-react';
import { AuditLog, StoreSettings } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { subscribeToFirebaseAuditLogs } from '../../services/firebase';

interface AuditLogViewProps {
  settings: StoreSettings;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  settings,
  showToast,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());

  useEffect(() => {
    const unsub = subscribeToFirebaseAuditLogs((remoteLogs) => {
      if (remoteLogs && remoteLogs.length > 0) {
        setLogs(remoteLogs);
        StorageService.saveAuditLogs(remoteLogs);
      }
    });
    return () => unsub();
  }, []);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('SEMUA');
  const [actionFilter, setActionFilter] = useState<string>('SEMUA');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (moduleFilter !== 'SEMUA' && log.module !== moduleFilter) return false;
      if (actionFilter !== 'SEMUA' && log.action !== actionFilter) return false;
      if (dateFilter && !log.timestamp.startsWith(dateFilter)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchUser = log.user_name.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchMod = log.module.toLowerCase().includes(q);
        const matchAct = log.action.toLowerCase().includes(q);
        if (!matchUser && !matchDesc && !matchMod && !matchAct) return false;
      }

      return true;
    });
  }, [logs, moduleFilter, actionFilter, dateFilter, search]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Tidak ada data audit log untuk diekspor.', 'info');
      return;
    }

    const headers = ['ID', 'Waktu', 'Pengguna', 'Role', 'Aksi', 'Modul', 'Deskripsi'];
    const rows = filteredLogs.map((l) => [
      l.id,
      formatDateTime(l.timestamp),
      `"${l.user_name.replace(/"/g, '""')}"`,
      l.user_role,
      l.action,
      l.module,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_log_warung_bang_kobra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Berhasil mengekspor ${filteredLogs.length} audit log ke CSV!`, 'success');
  };

  const handleClearLogs = () => {
    StorageService.clearAuditLogs();
    setLogs([]);
    showToast('Seluruh audit log berhasil dibersihkan.', 'info');
  };

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'Produk':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'Stok':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'Pengeluaran':
        return <Receipt className="w-4 h-4 text-rose-400" />;
      case 'Pesanan':
      case 'PO':
        return <ShoppingBag className="w-4 h-4 text-orange-400" />;
      case 'Pengaturan':
        return <SettingsIcon className="w-4 h-4 text-stone-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span>Audit Log & Jejak Aktivitas</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Pencatatan riwayat setiap penambahan, perubahan harga, mutasi stok, dan aktivitas staf/kasir secara transparan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
          {settings.role === 'Owner' && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-900 border border-rose-900/40 text-rose-400 hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bersihkan</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
          <div className="text-[11px] font-bold text-stone-400 uppercase">Total Aktivitas</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-100 mt-1">
            {logs.length}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Entri tersimpan</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
          <div className="text-[11px] font-bold text-stone-400 uppercase">Aktivitas Hari Ini</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-orange-400 mt-1">
            {logs.filter((l) => l.timestamp.startsWith(new Date().toISOString().split('T')[0])).length}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Aksi staf hari ini</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
          <div className="text-[11px] font-bold text-stone-400 uppercase">Perubahan Produk/Stok</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">
            {logs.filter((l) => l.module === 'Produk' || l.module === 'Stok').length}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Katalog & inventori</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
          <div className="text-[11px] font-bold text-stone-400 uppercase">Pengeluaran & Finansial</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
            {logs.filter((l) => l.module === 'Pengeluaran' || l.module === 'Pesanan').length}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Biaya & pesanan</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jejak berdasarkan nama pengguna, kata kunci deskripsi, modul..."
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Module Select */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none"
          >
            <option value="SEMUA">Semua Modul</option>
            <option value="Produk">Produk</option>
            <option value="Kategori">Kategori</option>
            <option value="Stok">Stok</option>
            <option value="Pesanan">Pesanan</option>
            <option value="PO">Pesanan Acara / PO</option>
            <option value="Pengeluaran">Pengeluaran</option>
            <option value="Pengguna">Pengguna</option>
            <option value="Pengaturan">Pengaturan</option>
          </select>

          {/* Action Select */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none"
          >
            <option value="SEMUA">Semua Aksi</option>
            <option value="TAMBAH">TAMBAH</option>
            <option value="EDIT">EDIT</option>
            <option value="HAPUS">HAPUS</option>
            <option value="STATUS_PESANAN">STATUS_PESANAN</option>
            <option value="MUTASI_STOK">MUTASI_STOK</option>
            <option value="PENGATURAN">PENGATURAN</option>
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-stone-200 focus:outline-none"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-[10px] text-rose-400 font-bold hover:underline"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] font-black tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-3">Modul</th>
                <th className="py-3 px-3">Aksi</th>
                <th className="py-3 px-4">Deskripsi Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-500 font-sans text-xs">
                    Tidak ada aktivitas audit log yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-stone-400 text-[11px]">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans">
                      <div className="font-bold text-stone-200">{log.user_name}</div>
                      <div className="text-[10px] text-stone-500">{log.user_role}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-sans">
                      <span className="flex items-center gap-1.5 font-bold text-stone-300">
                        {getModuleIcon(log.module)}
                        <span>{log.module}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'TAMBAH'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.action === 'EDIT' || log.action === 'STATUS_PESANAN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : log.action === 'HAPUS'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-stone-200 text-xs">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
