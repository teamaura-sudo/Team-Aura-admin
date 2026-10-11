import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Copy, 
  Search, 
  Clock, 
  User, 
  Wallet, 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Edit2,
  ArrowUpRight,
  ShieldCheck,
  LayoutGrid,
  ListFilter,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { WithdrawRequest, AppUser, AppSettings, RequestStatus, PaymentMethod, normalizeStatus } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';
import { ConfirmModal } from './ConfirmModal';
import { DEFAULT_WITHDRAW_REASONS } from '../services/sampleData';

interface WithdrawsQueueProps {
  withdraws: Record<string, WithdrawRequest>;
  users: Record<string, AppUser>;
  settings?: AppSettings;
  onInspectUser?: (userId: string) => void;
}

interface ToastInfo {
  text: string;
  actionLabel?: string;
  targetStatus?: RequestStatus;
}

export const WithdrawsQueue: React.FC<WithdrawsQueueProps> = ({
  withdraws,
  users,
  settings,
  onInspectUser,
}) => {
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'All'>('Pending');
  const [viewMode, setViewMode] = useState<'tabs' | 'sections'>('tabs');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedAcc, setCopiedAcc] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<ToastInfo | null>(null);
  const [recentlyMovedId, setRecentlyMovedId] = useState<string | null>(null);

  // Optimistic tracking: items instantly wiped from pending queue upon action
  const [optimisticApprovedIds, setOptimisticApprovedIds] = useState<Set<string>>(new Set());
  const [optimisticRejectedIds, setOptimisticRejectedIds] = useState<Set<string>>(new Set());

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<WithdrawRequest | null>(null);
  const [rejectReason, setRejectReason] = useState(
    settings?.withdrawRejectReasons?.[0] || DEFAULT_WITHDRAW_REASONS[0]
  );
  const [customReason, setCustomReason] = useState('');
  const [refundBalanceOnReject, setRefundBalanceOnReject] = useState(true);

  // Edit modal
  const [editingItem, setEditingItem] = useState<WithdrawRequest | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editAccount, setEditAccount] = useState<string>('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('bKash');

  // Confirmation modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const reasonsList = settings?.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS;
  const currency = settings?.currencySymbol || '৳';

  const withdrawList = Object.values(withdraws).sort((a, b) => {
    const timeA = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const timeB = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return timeB - timeA;
  });

  // Calculate effective status taking zero-latency optimistic removals into account
  const getEffectiveStatus = (w: WithdrawRequest): RequestStatus => {
    if (optimisticApprovedIds.has(w.id)) return 'Approved';
    if (optimisticRejectedIds.has(w.id)) return 'Rejected';
    return normalizeStatus(w.status);
  };

  const pendingWithdraws = withdrawList.filter(w => getEffectiveStatus(w) === 'Pending');
  const approvedWithdraws = withdrawList.filter(w => getEffectiveStatus(w) === 'Approved');
  const rejectedWithdraws = withdrawList.filter(w => getEffectiveStatus(w) === 'Rejected');

  const pendingCount = pendingWithdraws.length;
  const pendingAmount = pendingWithdraws.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const approvedCount = approvedWithdraws.length;
  const approvedTotal = approvedWithdraws.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const rejectedCount = rejectedWithdraws.length;

  const matchesSearch = (w: WithdrawRequest) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchAcc = w.account?.toLowerCase().includes(q);
    const matchUser = w.userId?.toLowerCase().includes(q);
    const matchMethod = w.method?.toLowerCase().includes(q);
    return Boolean(matchAcc || matchUser || matchMethod);
  };

  const filteredWithdraws = withdrawList.filter(w => {
    const currentStatus = getEffectiveStatus(w);
    if (filterStatus !== 'All' && currentStatus !== filterStatus) return false;
    return matchesSearch(w);
  });

  const showToast = (toast: ToastInfo) => {
    setToastInfo(toast);
    setTimeout(() => setToastInfo(null), 4500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAcc(id);
    sound.playClick();
    setTimeout(() => setCopiedAcc(null), 2000);
  };

  const handleConfirmPaid = async (w: WithdrawRequest) => {
    // 1. Instantly remove from Pending with 0ms delay (completely erased from pending list)
    setOptimisticApprovedIds(prev => new Set(prev).add(w.id));
    setRecentlyMovedId(w.id);
    sound.playApprove();
    setTimeout(() => setRecentlyMovedId(null), 5000);

    showToast({
      text: `✓ Cashout of ${currency}${w.amount} to ${w.account} marked Paid! Immediately removed from Pending.`,
      actionLabel: `View in Approved Section (${approvedCount + 1}) →`,
      targetStatus: 'Approved'
    });

    // 2. Persist to database & update balance
    setProcessingId(w.id);
    try {
      await dbService.approveWithdraw(w.id, w.userId, Number(w.amount));
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (w: WithdrawRequest) => {
    setRejectingItem(w);
    setRejectReason(reasonsList[0] || 'Invalid phone number or account barred');
    setCustomReason('');
    setRefundBalanceOnReject(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const targetId = rejectingItem.id;
    const finalReason = customReason.trim() ? customReason.trim() : rejectReason;

    // 1. Instantly close modal and remove from Pending with 0ms delay
    setOptimisticRejectedIds(prev => new Set(prev).add(targetId));
    setRejectingItem(null);
    setRecentlyMovedId(targetId);
    sound.playReject();
    setTimeout(() => setRecentlyMovedId(null), 5000);

    showToast({
      text: `✕ Cashout request rejected! Immediately removed from Pending.`,
      actionLabel: `View in Rejected Section (${rejectedCount + 1}) →`,
      targetStatus: 'Rejected'
    });

    // 2. Persist to database
    setProcessingId(targetId);
    try {
      await dbService.rejectWithdraw(targetId, finalReason, refundBalanceOnReject);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenEdit = (w: WithdrawRequest) => {
    setEditingItem(w);
    setEditAmount(w.amount);
    setEditAccount(w.account);
    setEditMethod(w.method || 'bKash');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await dbService.editWithdraw(editingItem.id, {
      amount: Number(editAmount),
      account: editAccount.trim(),
      method: editMethod
    });
    sound.playApprove();
    showToast({ text: 'Withdrawal details updated successfully' });
    setEditingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    await dbService.deleteWithdraw(deleteConfirmId);
    sound.playClick();
    showToast({ text: 'Withdrawal record deleted from database' });
    setDeleteConfirmId(null);
  };

  const handleConfirmClear = async () => {
    await dbService.clearCompletedWithdraws();
    sound.playClick();
    showToast({ text: 'Processed withdrawal records cleared' });
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
  const renderWithdrawCard = (w: WithdrawRequest) => {
    const user = users[w.userId];
    const isPending = normalizeStatus(w.status) === 'Pending';
    const isApproved = normalizeStatus(w.status) === 'Approved';
    const isRejected = normalizeStatus(w.status) === 'Rejected';
    const isProcessing = processingId === w.id;
    const isJustMoved = recentlyMovedId === w.id;

    return (
      <div
        key={w.id}
        className={`bg-slate-900 border rounded-xl p-4 transition-all duration-300 ${
          isJustMoved
            ? 'ring-2 ring-emerald-400 border-emerald-500 bg-slate-900/90 shadow-lg shadow-emerald-500/20 animate-pulse'
            : isPending 
            ? 'border-rose-500/50 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/20' 
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
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <span>{currency}{w.amount}</span>
              </span>

              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getMethodBadgeClass(w.method)}`}>
                {w.method || 'bKash'}
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                isPending 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : isApproved 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                <span>{isApproved ? 'Paid / Approved' : w.status}</span>
              </span>

              {isJustMoved && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 animate-bounce">
                  <Sparkles className="w-3 h-3" />
                  <span>Just Moved</span>
                </span>
              )}

              {w.timestamp && (
                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 ml-auto lg:ml-0">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Recipient Account:</span>
                  <span className="font-mono font-bold text-rose-300">{w.account}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(w.account, w.id)}
                  className="text-slate-400 hover:text-white p-1"
                  title="Copy Number"
                >
                  {copiedAcc === w.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Player:</span>
                  <span className="font-bold text-slate-200 truncate block max-w-[140px]">
                    {user?.name || w.userId}
                  </span>
                </div>
                {onInspectUser && (
                  <button
                    type="button"
                    onClick={() => onInspectUser(w.userId)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    Inspect
                  </button>
                )}
              </div>

              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Player Balance:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {currency}{user?.balance ?? '---'}
                </span>
              </div>
            </div>

            {w.note && isRejected && (
              <div className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded">
                <strong>Rejection Reason:</strong> {w.note}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 justify-end">
            {isPending ? (
              <>
                <button
                  disabled={isProcessing}
                  onClick={() => handleConfirmPaid(w)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Mark Paid and approve cashout"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing...' : 'Mark Paid & Approve'}</span>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => handleOpenReject(w)}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Reject cashout request"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(w)}
                  className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Edit details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(w.id)}
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
        {/* Pending Cashouts */}
        <div 
          onClick={() => { setFilterStatus('Pending'); setViewMode('tabs'); }}
          className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer ${
            filterStatus === 'Pending' && viewMode === 'tabs' ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Pending Section
            </span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{pendingCount}</span>
            <span className="text-xs font-mono font-bold text-rose-300">{currency}{pendingAmount.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Requires bKash/Nagad payout</div>
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
          <div className="mt-1 text-[11px] text-slate-500">Completed payouts</div>
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
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{rejectedCount}</span>
            <span className="text-xs text-slate-400">declined cashouts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Refunded / barred accounts</div>
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
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{withdrawList.length}</span>
            <span className="text-xs font-mono text-slate-400">Total logged</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Complete cashout history</div>
        </div>
      </div>

      {/* Main Filter & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg w-full md:w-auto">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map(tab => {
            const count = tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : tab === 'Rejected' ? rejectedCount : withdrawList.length;
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
                    ? tab === 'Pending' ? 'bg-rose-600 text-white shadow-sm'
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
              placeholder="Search account, User ID..."
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
          {filteredWithdraws.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">
                {filterStatus === 'Pending' ? 'No Pending Cashouts!' : `No ${filterStatus} Cashouts Found`}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filterStatus === 'Pending' 
                  ? 'All pending cashout requests have been paid or rejected. Newly submitted user withdrawals will appear here instantly.'
                  : 'Try adjusting your search query or switching to another section.'}
              </p>
            </div>
          ) : (
            filteredWithdraws.map(renderWithdrawCard)
          )}
        </div>
      ) : (
        /* Stacked All Sections Mode */
        <div className="space-y-8">
          {/* Section 1: PENDING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                <span>⏳ Pending Cashouts Section (Awaiting Payment)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                  {pendingCount}
                </span>
              </h3>
              <span className="text-xs font-mono text-rose-300">
                Total: {currency}{pendingAmount.toLocaleString()}
              </span>
            </div>

            {pendingWithdraws.filter(matchesSearch).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <span>No pending cashout requests! Newly requested withdrawals will appear here.</span>
              </div>
            ) : (
              pendingWithdraws.filter(matchesSearch).map(renderWithdrawCard)
            )}
          </div>

          {/* Section 2: APPROVED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>✅ Approved Cashouts Section (Paid & Completed)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  {approvedCount}
                </span>
              </h3>
              <span className="text-xs font-mono text-emerald-300">
                Total: {currency}{approvedTotal.toLocaleString()}
              </span>
            </div>

            {approvedWithdraws.filter(matchesSearch).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                <span>No approved cashouts logged yet. When marked paid, requests move directly to this section.</span>
              </div>
            ) : (
              approvedWithdraws.filter(matchesSearch).map(renderWithdrawCard)
            )}
          </div>

          {/* Section 3: REJECTED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>❌ Rejected Cashouts Section (Declined & Refunded)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                  {rejectedCount}
                </span>
              </h3>
            </div>

            {rejectedWithdraws.filter(matchesSearch).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400">
                <span>No rejected cashouts. When rejected, requests move directly to this section.</span>
              </div>
            ) : (
              rejectedWithdraws.filter(matchesSearch).map(renderWithdrawCard)
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
                <AlertTriangle className="w-4 h-4" />
                <span>Reject Withdrawal Request</span>
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
              <div>Account: <strong className="text-rose-300 font-mono">{rejectingItem.account}</strong></div>
              <div>User ID: <strong className="text-slate-300">{rejectingItem.userId}</strong></div>
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
                  Or enter custom reason for player:
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Account not registered with bKash"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={refundBalanceOnReject}
                  onChange={(e) => setRefundBalanceOnReject(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-orange-500"
                />
                <span>Refund {currency}{rejectingItem.amount} back to player's wallet balance</span>
              </label>
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
                <span>Edit Cashout Record</span>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Account Number</label>
                <input
                  type="text"
                  value={editAccount}
                  onChange={(e) => setEditAccount(e.target.value)}
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
        title="Delete Withdrawal Record"
        message="Are you sure you want to permanently delete this withdrawal record from database?"
        confirmText="Delete Record"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* CLEAR HISTORY CONFIRM */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Processed History"
        message="Are you sure you want to clear all approved and rejected withdrawal records from the database? Pending cashouts will remain untouched."
        confirmText="Clear History"
        confirmVariant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
