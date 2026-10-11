import React, { useState } from 'react';
import { 
  Zap, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Gamepad2, 
  Users, 
  Megaphone, 
  Check, 
  X,
  Key, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  Plus,
  Sliders,
  CreditCard
} from 'lucide-react';
import { AppSettings, DepositRequest, WithdrawRequest, TournamentMatch, AppUser, normalizeStatus } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';

interface OverviewDashboardProps {
  settings: AppSettings;
  deposits: Record<string, DepositRequest>;
  withdraws: Record<string, WithdrawRequest>;
  matches: Record<string, TournamentMatch>;
  users: Record<string, AppUser>;
  onNavigateTab: (tab: string) => void;
  onOpenCreateMatch: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  settings,
  deposits,
  withdraws,
  matches,
  users,
  onNavigateTab,
  onOpenCreateMatch,
}) => {
  const [quickNotice, setQuickNotice] = useState(settings.notice || '');
  const [isUpdatingNotice, setIsUpdatingNotice] = useState(false);
  const [noticeToast, setNoticeToast] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [optimisticDismissedIds, setOptimisticDismissedIds] = useState<Set<string>>(new Set());

  const currency = settings.currencySymbol || '৳';

  const pendingDeposits = Object.values(deposits)
    .filter(d => normalizeStatus(d.status) === 'Pending' && !optimisticDismissedIds.has(d.id));
  const pendingWithdraws = Object.values(withdraws)
    .filter(w => normalizeStatus(w.status) === 'Pending' && !optimisticDismissedIds.has(w.id));
  const activeMatches = Object.values(matches).filter(m => m.status === 'Live' || m.status === 'Upcoming');
  const userList = Object.values(users);

  const totalPendingDepositAmount = pendingDeposits.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const totalPendingWithdrawAmount = pendingWithdraws.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  const totalSystemBalance = userList.reduce((acc, u) => acc + (Number(u.balance) || 0), 0);

  const handleQuickNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNotice.trim()) return;
    setIsUpdatingNotice(true);
    await dbService.updateNotice(quickNotice);
    sound.playApprove();
    setIsUpdatingNotice(false);
    setNoticeToast(true);
    setTimeout(() => setNoticeToast(false), 2500);
  };

  const [actionToast, setActionToast] = useState<{ text: string; tab: string } | null>(null);

  const showActionToast = (text: string, tab: string) => {
    setActionToast({ text, tab });
    setTimeout(() => setActionToast(null), 4000);
  };

  const handleQuickApproveDeposit = async (d: DepositRequest) => {
    // Instantly remove from pending view with 0ms delay
    setOptimisticDismissedIds(prev => new Set(prev).add(d.id));
    sound.playApprove();
    showActionToast(`✓ Deposit of ${currency}${d.amount} approved! Immediately removed from Pending.`, 'deposits');

    setProcessingId(d.id);
    try {
      await dbService.approveDeposit(d.id, d.userId, Number(d.amount));
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickRejectDeposit = async (d: DepositRequest) => {
    // Instantly remove from pending view with 0ms delay
    setOptimisticDismissedIds(prev => new Set(prev).add(d.id));
    sound.playReject();
    showActionToast(`✕ Deposit ${d.trx} rejected! Immediately removed from Pending.`, 'deposits');

    setProcessingId(d.id);
    try {
      await dbService.rejectDeposit(d.id, 'Rejected from Command Center');
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickApproveWithdraw = async (w: WithdrawRequest) => {
    // Instantly remove from pending view with 0ms delay
    setOptimisticDismissedIds(prev => new Set(prev).add(w.id));
    sound.playApprove();
    showActionToast(`✓ Cashout of ${currency}${w.amount} marked Paid! Immediately removed from Pending.`, 'withdraws');

    setProcessingId(w.id);
    try {
      await dbService.approveWithdraw(w.id, w.userId, Number(w.amount));
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickRejectWithdraw = async (w: WithdrawRequest) => {
    // Instantly remove from pending view with 0ms delay
    setOptimisticDismissedIds(prev => new Set(prev).add(w.id));
    sound.playReject();
    showActionToast(`✕ Cashout request rejected! Immediately removed from Pending.`, 'withdraws');

    setProcessingId(w.id);
    try {
      await dbService.rejectWithdraw(w.id, 'Rejected from Command Center', true);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Toast */}
      {actionToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <span>{actionToast.text}</span>
          <button
            onClick={() => onNavigateTab(actionToast.tab)}
            className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[11px] cursor-pointer"
          >
            Open {actionToast.tab === 'deposits' ? 'Deposits' : 'Cashouts'} →
          </button>
        </div>
      )}
      {/* Quick Notice Broadcaster Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 block">
                Broadcast In-App Announcement
              </span>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                Active: <span className="text-slate-200 font-medium">{settings.notice || 'No notice broadcasted yet.'}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickNoticeSubmit} className="flex items-center gap-2 flex-1 md:max-w-lg">
            <input
              type="text"
              value={quickNotice}
              onChange={(e) => setQuickNotice(e.target.value)}
              placeholder="Enter marquee message for user app..."
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={isUpdatingNotice || !quickNotice.trim()}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isUpdatingNotice ? 'Broadcasting...' : 'Broadcast'}</span>
            </button>
            {noticeToast && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Live!
              </span>
            )}
          </form>
        </div>
      </div>

      {/* 4 Primary Financial & Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Deposits */}
        <div 
          onClick={() => onNavigateTab('deposits')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Pending Deposits
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white">{pendingDeposits.length}</span>
              <span className="text-xs text-slate-400 ml-1.5">requests</span>
            </div>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {currency}{totalPendingDepositAmount.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500 group-hover:text-amber-400 transition-colors">
            <span>Process approvals</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div 
          onClick={() => onNavigateTab('withdraws')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Pending Cashouts
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white">{pendingWithdraws.length}</span>
              <span className="text-xs text-slate-400 ml-1.5">requests</span>
            </div>
            <span className="text-sm font-bold text-rose-300 font-mono">
              {currency}{totalPendingWithdrawAmount.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500 group-hover:text-rose-400 transition-colors">
            <span>Process cashouts</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Active Tournaments */}
        <div 
          onClick={() => onNavigateTab('matches')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              Active Tournaments
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white">{activeMatches.length}</span>
              <span className="text-xs text-slate-400 ml-1.5">scheduled</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {Object.keys(matches).length} total matches
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500 group-hover:text-sky-400 transition-colors">
            <span>Manage match rooms</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Players & Balances */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              User Wallets
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white">{userList.length}</span>
              <span className="text-xs text-slate-400 ml-1.5">players</span>
            </div>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {currency}{totalSystemBalance.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500 group-hover:text-emerald-400 transition-colors">
            <span>Inspect players</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Two Column Grid: Financial Action Queue vs Active Tournaments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Financial Approvals Attention Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Pending Financial Queue</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('deposits')}
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
              >
                All Deposits ({pendingDeposits.length})
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={() => onNavigateTab('withdraws')}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                All Payouts ({pendingWithdraws.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {pendingDeposits.length === 0 && pendingWithdraws.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">All queues are clear!</p>
                <p className="text-slate-500 mt-0.5">Approved and rejected requests have been processed.</p>
              </div>
            ) : (
              <>
                {/* Pending Deposits Preview */}
                {pendingDeposits.slice(0, 3).map(d => (
                  <div
                    key={d.id}
                    className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{currency}{d.amount}</span>
                        <span className="text-slate-400">Deposit via</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-orange-300 font-bold border border-slate-800">
                          {d.method || 'bKash'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        User: <strong className="text-slate-300">{d.userId}</strong> | Trx: <strong className="text-orange-300">{d.trx}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={processingId === d.id}
                        onClick={() => handleQuickApproveDeposit(d)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Approve and credit balance"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        disabled={processingId === d.id}
                        onClick={() => handleQuickRejectDeposit(d)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="Reject deposit"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pending Withdrawals Preview */}
                {pendingWithdraws.slice(0, 3).map(w => (
                  <div
                    key={w.id}
                    className="bg-slate-900 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{currency}{w.amount}</span>
                        <span className="text-slate-400">Payout to</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-rose-300 font-bold border border-slate-800">
                          {w.account}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        User: <strong className="text-slate-300">{w.userId}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={processingId === w.id}
                        onClick={() => handleQuickApproveWithdraw(w)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Mark Paid and approve"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Paid</span>
                      </button>
                      <button
                        disabled={processingId === w.id}
                        onClick={() => handleQuickRejectWithdraw(w)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="Reject withdrawal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Tournaments & Room Control */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-orange-400" />
              <span>Active Tournaments</span>
            </h3>
            <button
              onClick={() => onNavigateTab('matches')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              View All ({Object.keys(matches).length})
            </button>
          </div>

          <div className="space-y-2.5">
            {activeMatches.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                <Gamepad2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No active tournaments running.</p>
                <button
                  onClick={onOpenCreateMatch}
                  className="mt-3 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Tournament</span>
                </button>
              </div>
            ) : (
              activeMatches.slice(0, 3).map(m => (
                <div
                  key={m.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate max-w-[200px]">{m.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-950 text-sky-300 font-bold border border-sky-800">
                        {m.version}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-slate-400 border border-slate-800">
                        {m.map}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Prize: <strong className="text-emerald-400 font-mono">{currency}{m.prize}</strong></span>
                      <span>Entry: <strong className="text-slate-300 font-mono">{currency}{m.fee}</strong></span>
                      <span>Slots: <strong className="text-white">{m.joinedCount || 0}/{m.maxSlots || 48}</strong></span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[11px] font-mono">
                      {m.isRoomPublished ? (
                        <span className="text-emerald-400 flex items-center gap-1 justify-end">
                          <Key className="w-3 h-3" />
                          <span>Room: {m.roomId}</span>
                        </span>
                      ) : (
                        <span className="text-amber-400">Room Pending</span>
                      )}
                    </div>
                    <button
                      onClick={() => onNavigateTab('matches')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                    >
                      Manage →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div 
          onClick={() => onNavigateTab('payments')}
          className="bg-slate-900/60 border border-slate-800 hover:border-pink-500/50 rounded-xl p-4 transition-all cursor-pointer group flex items-center space-x-3"
        >
          <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-xs block group-hover:text-pink-300 transition-colors">
              bKash / Nagad Numbers
            </span>
            <span className="text-[11px] text-slate-400">Add or update payment numbers</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('preferences')}
          className="bg-slate-900/60 border border-slate-800 hover:border-orange-500/50 rounded-xl p-4 transition-all cursor-pointer group flex items-center space-x-3"
        >
          <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:scale-110 transition-transform">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-xs block group-hover:text-orange-300 transition-colors">
              Options & Preferences
            </span>
            <span className="text-[11px] text-slate-400">Customize all options dynamically</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('notices')}
          className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition-all cursor-pointer group flex items-center space-x-3"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-xs block group-hover:text-emerald-300 transition-colors">
              Notices & Support Links
            </span>
            <span className="text-[11px] text-slate-400">WhatsApp & Telegram helpline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
