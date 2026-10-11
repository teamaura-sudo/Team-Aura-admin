import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Copy, 
  Search, 
  Clock, 
  User, 
  ShieldCheck, 
  CreditCard, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Edit2, 
  ArrowDownLeft,
  LayoutGrid,
  ListFilter,
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { DepositRequest, AppUser, AppSettings, RequestStatus, PaymentMethod, normalizeStatus } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';
import { ConfirmModal } from './ConfirmModal';
import { DEFAULT_DEPOSIT_REASONS } from '../services/sampleData';

interface DepositsQueueProps {
  deposits: Record<string, DepositRequest>;
  users: Record<string, AppUser>;
  settings?: AppSettings;
  onInspectUser?: (userId: string) => void;
}

interface ToastInfo {
  text: string;
  actionLabel?: string;
  targetStatus?: RequestStatus;
}

export const DepositsQueue: React.FC<DepositsQueueProps> = ({
  deposits,
  users,
  settings,
  onInspectUser,
}) => {
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'All'>('Pending');
  const [viewMode, setViewMode] = useState<'tabs' | 'sections'>('tabs');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<ToastInfo | null>(null);
  const [recentlyMovedId, setRecentlyMovedId] = useState<string | null>(null);

  // Optimistic tracking: items instantly wiped from pending queue upon action
  const [optimisticApprovedIds, setOptimisticApprovedIds] = useState<Set<string>>(new Set());
  const [optimisticRejectedIds, setOptimisticRejectedIds] = useState<Set<string>>(new Set());
  
  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<DepositRequest | null>(null);
  const [rejectReason, setRejectReason] = useState(
    settings?.depositRejectReasons?.[0] || DEFAULT_DEPOSIT_REASONS[0]
  );
  const [customReason, setCustomReason] = useState('');

  // Edit modal
  const [editingItem, setEditingItem] = useState<DepositRequest | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editTrx, setEditTrx] = useState<string>('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('bKash');
  const [editSenderPhone, setEditSenderPhone] = useState<string>('');

  // Confirmation modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const reasonsList = settings?.depositRejectReasons || DEFAULT_DEPOSIT_REASONS;
  const currency = settings?.currencySymbol || '৳';

  const depositList = Object.values(deposits).sort((a, b) => {
    const timeA = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const timeB = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return timeB - timeA;
  });

  // Calculate effective status taking zero-latency optimistic removals into account
  const getEffectiveStatus = (d: DepositRequest): RequestStatus => {
    if (optimisticApprovedIds.has(d.id)) return 'Approved';
    if (optimisticRejectedIds.has(d.id)) return 'Rejected';
    return normalizeStatus(d.status);
  };

  const pendingDeposits = depositList.filter(d => getEffectiveStatus(d) === 'Pending');
  const approvedDeposits = depositList.filter(d => getEffectiveStatus(d) === 'Approved');
  const rejectedDeposits = depositList.filter(d => getEffectiveStatus(d) === 'Rejected');

  const pendingCount = pendingDeposits.length;
  const pendingAmount = pendingDeposits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const approvedCount = approvedDeposits.length;
  const approvedTotal = approvedDeposits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const rejectedCount = rejectedDeposits.length;

  const matchesSearch = (d: DepositRequest) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTrx = d.trx?.toLowerCase().includes(q);
    const matchUser = d.userId?.toLowerCase().includes(q);
    const matchMethod = d.method?.toLowerCase().includes(q);
    const matchPhone = d.senderPhone?.toLowerCase().includes(q);
    return Boolean(matchTrx || matchUser || matchMethod || matchPhone);
  };

  const filteredDeposits = depositList.filter(d => {
    const currentStatus = getEffectiveStatus(d);
    if (filterStatus !== 'All' && currentStatus !== filterStatus) return false;
    return matchesSearch(d);
  });

  const showToast = (toast: ToastInfo) => {
    setToastInfo(toast);
    setTimeout(() => setToastInfo(null), 4500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrx(id);
    sound.playClick();
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  const handleApprove = async (d: DepositRequest) => {
    // 1. Instantly remove from Pending with 0ms delay (completely erased from pending list)
    setOptimisticApprovedIds(prev => new Set(prev).add(d.id));
    setRecentlyMovedId(d.id);
    sound.playApprove();
    setTimeout(() => setRecentlyMovedId(null), 5000);

    showToast({
      text: `✓ Deposit of ${currency}${d.amount} approved! Immediately removed from Pending.`,
      actionLabel: `View in Approved Section (${approvedCount + 1}) →`,
      targetStatus: 'Approved'
    });

    // 2. Persist to database & update balance
    setProcessingId(d.id);
    try {
      await dbService.approveDeposit(d.id, d.userId, Number(d.amount));
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (d: DepositRequest) => {
    setRejectingItem(d);
    setRejectReason(reasonsList[0] || 'TrxID not found');
    setCustomReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const targetId = rejectingItem.id;
    const trxDisplay = rejectingItem.trx;
    const finalReason = customReason.trim() ? customReason.trim() : rejectReason;

    // 1. Instantly close modal and remove from Pending with 0ms delay
    setOptimisticRejectedIds(prev => new Set(prev).add(targetId));
    setRejectingItem(null);
    setRecentlyMovedId(targetId);
    sound.playReject();
    setTimeout(() => setRecentlyMovedId(null), 5000);

    showToast({
      text: `✕ Deposit ${trxDisplay} rejected! Immediately removed from Pending.`,
      actionLabel: `View in Rejected Section (${rejectedCount + 1}) →`,
      targetStatus: 'Rejected'
    });

    // 2. Persist to database
    setProcessingId(targetId);
    try {
      await dbService.rejectDeposit(targetId, finalReason);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenEdit = (d: DepositRequest) => {
    setEditingItem(d);
    setEditAmount(d.amount);
    setEditTrx(d.trx);
    setEditMethod(d.method || 'bKash');
    setEditSenderPhone(d.senderPhone || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await dbService.editDeposit(editingItem.id, {
      amount: Number(editAmount),
      trx: editTrx.trim(),
      method: editMethod,
      senderPhone: editSenderPhone.trim()
    });
    sound.playApprove();
    showToast({ text: 'Deposit details updated successfully' });
    setEditingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    await dbService.deleteDeposit(deleteConfirmId);
    sound.playClick();
    showToast({ text: 'Deposit record deleted from database' });
    setDeleteConfirmId(null);
  };

  const handleConfirmClear = async () => {
    await dbService.clearCompletedDeposits();
    sound.playClick();
    showToast({ text: 'Processed history cleared from database' });
    setShowClearConfirm(false);
  };

  const getMethodBadgeClass = (method?: PaymentMethod) => {
    switch (method) {
      case 'bKash':
        return 'bg-pink-950/80 text-pink-300 border-pink-700/60';
      case 'Nagad':
        return 'bg-orange-950/80 text-orange-300 border-orange-700/60';
      case 'Rocket':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'Upay':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Reusable card renderer
  const renderDepositCard = (d: DepositRequest) => {
    const user = users[d.userId];
    const isPending = normalizeStatus(d.status) === 'Pending';
    const isApproved = normalizeStatus(d.status) === 'Approved';
    const isRejected = normalizeStatus(d.status) === 'Rejected';
    const isProcessing = processingId === d.id;
    const isJustMoved = recentlyMovedId === d.id;

    return (
      <div
        key={d.id}
        className={`bg-slate-900 border rounded-xl p-4 transition-all duration-300 ${
          isJustMoved
            ? 'ring-2 ring-emerald-400 border-emerald-500 bg-slate-900/90 shadow-lg shadow-emerald-500/20 animate-pulse'
            : isPending 
            ? 'border-amber-500/50 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20' 
            : isApproved
            ? 'border-emerald-500/30 bg-slate-900/80 hover:border-emerald-500/60'
            : 'border-rose-500/30 bg-slate-900/80 hover:border-rose-500/60'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Details */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-black text-white font-mono flex items-center gap-1">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>{currency}{d.amount}</span>
              </span>

              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getMethodBadgeClass(d.method)}`}>
                {d.method || 'bKash'}
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                isPending 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : isApproved 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                <span>{d.status}</span>
              </span>

              {isJustMoved && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 animate-bounce">
                  <Sparkles className="w-3 h-3" />
                  <span>Just Moved</span>
                </span>
              )}

              {d.timestamp && (
                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 ml-auto lg:ml-0">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">TrxID:</span>
                  <span className="font-mono font-bold text-orange-300">{d.trx}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(d.trx, d.id)}
                  className="text-slate-400 hover:text-white p-1"
                  title="Copy TrxID"
                >
                  {copiedTrx === d.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Player:</span>
                  <span className="font-bold text-slate-200 truncate block max-w-[140px]">
                    {user?.name || d.userId}
                  </span>
                </div>
                {onInspectUser && (
                  <button
                    type="button"
                    onClick={() => onInspectUser(d.userId)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    Inspect
                  </button>
                )}
              </div>

              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Sender Mobile / Note:</span>
                <span className="text-slate-300 font-mono truncate block">
                  {d.senderPhone || d.note || 'Direct deposit'}
                </span>
              </div>
            </div>

            {d.note && isRejected && (
              <div className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded">
                <strong>Rejection Reason:</strong> {d.note}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 justify-end">
            {isPending ? (
              <>
                <button
                  disabled={isProcessing}
                  onClick={() => handleApprove(d)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Approve and credit player wallet balance"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessing ? 'Crediting...' : 'Approve'}</span>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => handleOpenReject(d)}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Reject deposit request"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(d)}
                  className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Edit details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(d.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Delete record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification with quick move button */}
      {toastInfo && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastInfo.text}</span>
          </div>
          {toastInfo.actionLabel && toastInfo.targetStatus && (
            <button
              onClick={() => {
                setFilterStatus(toastInfo.targetStatus!);
                setViewMode('tabs');
                setToastInfo(null);
                sound.playClick();
              }}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{toastInfo.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Top Metric Cards - Click to switch section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div 
          onClick={() => { setFilterStatus('Pending'); setViewMode('tabs'); }}
          className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer ${
            filterStatus === 'Pending' && viewMode === 'tabs' ? 'border-amber-500 ring-2 ring-amber-500/50' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Pending Section
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{pendingCount}</span>
            <span className="text-xs font-mono font-bold text-amber-300">{currency}{pendingAmount.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Requires admin approval</div>
        </div>

        {/* Approved Total */}
        <div 
          onClick={() => { setFilterStatus('Approved'); setViewMode('tabs'); }}
          className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer ${
            filterStatus === 'Approved' && viewMode === 'tabs' ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-emerald-400">Approved Section</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{approvedCount}</span>
            <span className="text-xs font-mono font-bold text-emerald-300">{currency}{approvedTotal.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Credited to player wallets</div>
        </div>

        {/* Rejected Count */}
        <div 
          onClick={() => { setFilterStatus('Rejected'); setViewMode('tabs'); }}
          className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer ${
            filterStatus === 'Rejected' && viewMode === 'tabs' ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-rose-400">Rejected Section</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{rejectedCount}</span>
            <span className="text-xs text-slate-400">invalid requests</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Declined & logged</div>
        </div>

        {/* Total Records */}
        <div 
          onClick={() => { setFilterStatus('All'); setViewMode('tabs'); }}
          className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer ${
            filterStatus === 'All' && viewMode === 'tabs' ? 'border-sky-500 ring-2 ring-sky-500/50' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-sky-400">All Records</span>
            <CreditCard className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{depositList.length}</span>
            <span className="text-xs font-mono text-slate-400">Total logged</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Complete transaction history</div>
        </div>
      </div>

      {/* Main Filter & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg w-full md:w-auto">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map(tab => {
            const count = tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : tab === 'Rejected' ? rejectedCount : depositList.length;
            const isActive = filterStatus === tab && viewMode === 'tabs';

            return (
              <button
                key={tab}
                onClick={() => {
                  setFilterStatus(tab);
                  setViewMode('tabs');
                }}
                className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isActive
                    ? tab === 'Pending' ? 'bg-amber-600 text-white shadow-sm'
                      : tab === 'Approved' ? 'bg-emerald-600 text-white shadow-sm'
                      : tab === 'Rejected' ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>{tab} Section</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Split Sections vs Tabs */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('tabs')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'tabs' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tabbed view"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabs</span>
            </button>
            <button
              onClick={() => setViewMode('sections')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'sections' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Show All 3 Sections on one page"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">All Sections</span>
            </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TrxID, User, phone..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {(approvedCount > 0 || rejectedCount > 0) && (
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear all completed/rejected requests from database"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENT AREA: TABS MODE OR STACKED SECTIONS MODE */}
      {viewMode === 'tabs' ? (
        /* Single Tab Mode */
        <div className="space-y-3">
          {filteredDeposits.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">
                {filterStatus === 'Pending' ? 'No Pending Deposits!' : `No ${filterStatus} Deposits Found`}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filterStatus === 'Pending' 
                  ? 'All pending requests have been approved or rejected. Newly submitted user deposits will appear here instantly.'
                  : 'Try adjusting your search query or switching to another section.'}
              </p>
            </div>
          ) : (
            filteredDeposits.map(renderDepositCard)
          )}
        </div>
      ) : (
        /* Stacked All Sections Mode */
        <div className="space-y-8">
          {/* Section 1: PENDING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>⏳ Pending Deposits Section (Awaiting Action)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  {pendingCount}
                </span>
              </h3>
              <span className="text-xs font-mono text-amber-300">
                Total: {currency}{pendingAmount.toLocaleString()}
              </span>
            </div>

            {pendingDeposits.filter(matchesSearch).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <span>No pending deposits! When new deposits arrive, they will appear here.</span>
              </div>
            ) : (
              pendingDeposits.filter(matchesSearch).map(renderDepositCard)
            )}
          </div>

          {/* Section 2: APPROVED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>✅ Approved Deposits Section (Credited to Wallets)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  {approvedCount}
                </span>
              </h3>
              <span className="text-xs font-mono text-emerald-300">
                Total: {currency}{approvedTotal.toLocaleString()}
              </span>
            </div>

            {approvedDeposits.filter(matchesSearch).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                <span>No approved deposits logged yet. When approved, deposits move directly to this section.</span>
              </div>
            ) : (
              approvedDeposits.filter(matchesSearch).map(renderDepositCard)
            )}
          </div>

          {/* Section 3: REJECTED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>❌ Rejected Deposits Section (Declined)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                  {rejectedCount}
                </span>
              </h3>
            </div>

            {rejectedDeposits.filter(matchesSearch).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                <span>No rejected deposits. When rejected, deposits move directly to this section.</span>
              </div>
            ) : (
              rejectedDeposits.filter(matchesSearch).map(renderDepositCard)
            )}
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Reject Deposit Request</span>
              </div>
              <button
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <div>Amount: <strong className="text-white font-mono">{currency}{rejectingItem.amount}</strong></div>
              <div>TrxID: <strong className="text-orange-300 font-mono">{rejectingItem.trx}</strong></div>
              <div>User: <strong className="text-slate-300">{rejectingItem.userId}</strong></div>
              <div className="text-[11px] text-amber-400 mt-1">
                This request will instantly move to the <strong>'Rejected' section</strong> and disappear from Pending.
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Select Quick Rejection Reason:
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {reasonsList.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRejectReason(reason);
                      setCustomReason('');
                    }}
                    className={`w-full text-left text-xs p-2 rounded border transition-colors cursor-pointer ${
                      rejectReason === reason && !customReason
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/60'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Or enter custom reason for user:
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. TrxID already used in previous deposit"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectingItem.id}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Move to Rejected Section</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Edit2 className="w-4 h-4 text-orange-400" />
                <span>Edit Deposit Record</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction ID (TrxID)</label>
                <input
                  type="text"
                  value={editTrx}
                  onChange={(e) => setEditTrx(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Upay">Upay</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Mobile</label>
                <input
                  type="text"
                  value={editSenderPhone}
                  onChange={(e) => setEditSenderPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Deposit Record"
        message="Are you sure you want to permanently delete this deposit record from database?"
        confirmText="Delete Record"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* CLEAR HISTORY CONFIRM */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Processed History"
        message="Are you sure you want to clear all approved and rejected deposit records from the database? Pending deposits will remain untouched."
        confirmText="Clear History"
        confirmVariant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
