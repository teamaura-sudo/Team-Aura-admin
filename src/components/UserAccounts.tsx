import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  MinusCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Wallet, 
  Trophy, 
  ArrowDownLeft, 
  ArrowUpRight,
  Phone,
  Edit2
} from 'lucide-react';
import { AppUser } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';

interface UserAccountsProps {
  users: Record<string, AppUser>;
}

export const UserAccounts: React.FC<UserAccountsProps> = ({ users }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Tournament Prize / Bonus');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userList = Object.values(users);
  const filteredUsers = userList.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.id?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.ingameName?.toLowerCase().includes(q)
    );
  });

  const totalUserBalances = userList.reduce((acc, u) => acc + (Number(u.balance) || 0), 0);

  const handleOpenAdjust = (user: AppUser, type: 'credit' | 'debit') => {
    setSelectedUser(user);
    setAdjustmentType(type);
    setAdjustmentAmount('50');
    setAdjustmentReason(type === 'credit' ? 'Manual Bonus / Prize Settlement' : 'Balance Correction / Fine');
  };

  const handleSaveAdjustment = async () => {
    if (!selectedUser || !adjustmentAmount) return;
    const delta = Number(adjustmentAmount);
    if (isNaN(delta) || delta <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const newBalance = adjustmentType === 'credit'
        ? (selectedUser.balance || 0) + delta
        : Math.max(0, (selectedUser.balance || 0) - delta);

      await dbService.adjustUserBalance(
        selectedUser.id,
        newBalance,
        `${adjustmentType.toUpperCase()}: ৳${delta} - ${adjustmentReason}`
      );

      sound.playApprove();
      setSelectedUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-sky-400 flex items-center justify-between">
            <span>Total Registered Players</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{userList.length}</span>
            <span className="text-xs text-slate-400 font-mono">accounts</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registered on Team Aura platform
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
            <span>Aggregate Wallet Balance</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">৳{totalUserBalances.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total active funds across all players
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-amber-400 flex items-center justify-between">
            <span>Manual Adjustments</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Admin can credit bonus money or refund tournament entry fees directly to any player ID.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by User ID, Name, In-Game Nick, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="text-xs font-mono text-slate-400">
          Showing {filteredUsers.length} players
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Player / User ID</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">In-Game Name</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-right">Deposited</th>
                <th className="py-3 px-4 text-right">Withdrawn</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{u.name || 'Unnamed Player'}</div>
                    <div className="font-mono text-[11px] text-slate-500">{u.id}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">
                    {u.phone || 'N/A'}
                  </td>
                  <td className="py-3 px-4 font-mono text-orange-400 font-semibold">
                    {u.ingameName || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    ৳{u.balance}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    ৳{u.totalDeposited || 0}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    ৳{u.totalWithdrawn || 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[11px] font-semibold ${
                      u.status === 'Banned' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenAdjust(u, 'credit')}
                        title="Credit Bonus/Prize"
                        className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50 rounded transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenAdjust(u, 'debit')}
                        title="Debit / Penalty"
                        className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded transition-colors cursor-pointer"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Balance Adjuster Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {adjustmentType === 'credit' ? (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <MinusCircle className="w-5 h-5 text-rose-400" />
                )}
                <span>
                  {adjustmentType === 'credit' ? 'Credit Balance to Player' : 'Debit Balance from Player'}
                </span>
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p>Player: <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.id})</p>
              <p>Current Balance: <strong className="text-emerald-400 font-mono text-sm">৳{selectedUser.balance}</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount to {adjustmentType === 'credit' ? 'Add' : 'Deduct'} (৳)
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Adjustment:
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Tournament 1st Prize, Bonus compensation..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400">New Resulting Balance: </span>
                <strong className="font-mono text-white text-sm">
                  ৳{adjustmentType === 'credit'
                    ? (selectedUser.balance || 0) + (Number(adjustmentAmount) || 0)
                    : Math.max(0, (selectedUser.balance || 0) - (Number(adjustmentAmount) || 0))}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={isSubmitting}
                className={`px-5 py-2 text-white rounded-lg text-xs font-bold transition-all ${
                  adjustmentType === 'credit'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-sm shadow-rose-600/30'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Apply Balance Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
