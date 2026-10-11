import React, { useState } from 'react';
import { 
  Smartphone, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Gamepad2, 
  Sparkles, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { AppUser, TournamentMatch, PaymentMethod, AppSettings } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';

interface UserSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: Record<string, AppUser>;
  matches: Record<string, TournamentMatch>;
  settings: AppSettings;
}

export const UserSimulatorModal: React.FC<UserSimulatorModalProps> = ({
  isOpen,
  onClose,
  users,
  matches,
  settings,
}) => {
  const [activeSimTab, setActiveSimTab] = useState<'deposit' | 'withdraw' | 'join'>('deposit');
  const [selectedUserId, setSelectedUserId] = useState<string>(Object.keys(users)[0] || 'user_aura_101');
  
  // Deposit Sim
  const [depositAmount, setDepositAmount] = useState<string>('200');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('bKash');
  const [depositTrx, setDepositTrx] = useState<string>('9A8B7C6D5E');
  const [depositPhone, setDepositPhone] = useState<string>('01711223344');

  // Withdraw Sim
  const [withdrawAmount, setWithdrawAmount] = useState<string>('150');
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod>('bKash');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('01711223344');

  // Match Join Sim
  const [selectedMatchId, setSelectedMatchId] = useState<string>(Object.keys(matches)[0] || '');

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateRandomTrx = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDepositTrx(res);
    sound.playClick();
  };

  const handleSimulateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.simulateUserDeposit({
      userId: selectedUserId,
      amount: Number(depositAmount),
      trx: depositTrx,
      method: depositMethod,
      senderPhone: depositPhone,
      note: 'Simulated User Deposit'
    });
    sound.playApprove();
    setFeedbackMsg(`✓ Deposit request of ৳${depositAmount} created for ${selectedUserId}! Check Pending Deposits tab.`);
    setTimeout(() => setFeedbackMsg(null), 4000);
    generateRandomTrx();
  };

  const handleSimulateWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.simulateUserWithdraw({
      userId: selectedUserId,
      amount: Number(withdrawAmount),
      account: withdrawAccount,
      method: withdrawMethod,
      note: 'Simulated User Cashout'
    });
    sound.playApprove();
    setFeedbackMsg(`✓ Withdrawal request of ৳${withdrawAmount} submitted for ${selectedUserId}! Check Pending Withdrawals tab.`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSimulateJoinMatch = async () => {
    if (!selectedMatchId || !matches[selectedMatchId]) return;
    const match = matches[selectedMatchId];
    const user = users[selectedUserId];
    const entryFee = Number(match.fee || 0);

    if (user && user.balance < entryFee) {
      alert(`User balance (৳${user.balance}) is not enough for entry fee (৳${entryFee})!`);
      return;
    }

    // Deduct fee and increment match slots
    if (user) {
      await dbService.adjustUserBalance(
        selectedUserId,
        user.balance - entryFee,
        `Joined Tournament: ${match.title}`
      );
    }

    await dbService.updateMatch(selectedMatchId, {
      joinedCount: (match.joinedCount || 0) + 1
    });

    sound.playApprove();
    setFeedbackMsg(`✓ ${selectedUserId} successfully registered for ${match.title}! Slot count increased.`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-white text-base">Player App Simulator</h3>
              <p className="text-[11px] text-slate-400">
                Simulate player activities to test real-time admin queues & balance deductions
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Select User */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Acting As Player:
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
          >
            {Object.values(users).map(u => (
              <option key={u.id} value={u.id}>
                {u.name || u.id} (Balance: ৳{u.balance})
              </option>
            ))}
          </select>
        </div>

        {/* Simulator Sub-Tabs */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSimTab('deposit')}
            className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
              activeSimTab === 'deposit' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            💰 Test Deposit
          </button>
          <button
            onClick={() => setActiveSimTab('withdraw')}
            className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
              activeSimTab === 'withdraw' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            💸 Test Withdraw
          </button>
          <button
            onClick={() => setActiveSimTab('join')}
            className={`flex-1 py-1.5 rounded text-center transition-colors cursor-pointer ${
              activeSimTab === 'join' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎮 Join Tournament
          </button>
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* TAB 1: DEPOSIT SIMULATION */}
        {activeSimTab === 'deposit' && (
          <form onSubmit={handleSimulateDeposit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  min="10"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </select>
              </div>
            </div>

            {/* Dynamic Admin Recipient Number Info */}
            {(() => {
              const activeAcc = Object.values(settings.paymentAccounts || {}).find(a => a.method === depositMethod && a.isActive);
              const fallbackNum = depositMethod === 'bKash' ? settings.bkashNumber : depositMethod === 'Nagad' ? settings.nagadNumber : settings.rocketNumber;
              const displayNum = activeAcc ? `${activeAcc.number} (${activeAcc.accountType})` : fallbackNum || 'Not configured';

              return (
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Sending to Aura {depositMethod}: </span>
                    <strong className="text-orange-400 font-mono">{displayNum}</strong>
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Transaction ID (TrxID)</label>
                <button
                  type="button"
                  onClick={generateRandomTrx}
                  className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Random TrxID
                </button>
              </div>
              <input
                type="text"
                required
                value={depositTrx}
                onChange={(e) => setDepositTrx(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Mobile Phone</label>
              <input
                type="text"
                value={depositPhone}
                onChange={(e) => setDepositPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Submit Deposit Request to Admin Queue</span>
            </button>
          </form>
        )}

        {/* TAB 2: WITHDRAW SIMULATION */}
        {activeSimTab === 'withdraw' && (
          <form onSubmit={handleSimulateWithdraw} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  min="50"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Account Number</label>
              <input
                type="text"
                required
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Submit Cashout Request to Admin Queue</span>
            </button>
          </form>
        )}

        {/* TAB 3: JOIN TOURNAMENT SIMULATION */}
        {activeSimTab === 'join' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Tournament Match</label>
              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                {Object.values(matches).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title} (Fee: ৳{m.fee} | Slots: {m.joinedCount || 0}/{m.maxSlots || 48})
                  </option>
                ))}
              </select>
            </div>

            {matches[selectedMatchId] && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                <p>Entry Fee: <strong className="text-amber-400 font-mono">৳{matches[selectedMatchId].fee}</strong></p>
                <p>Map & Mode: <strong className="text-white">{matches[selectedMatchId].map} · {matches[selectedMatchId].version}</strong></p>
                <p>Player Current Balance: <strong className="text-emerald-400 font-mono">৳{users[selectedUserId]?.balance || 0}</strong></p>
              </div>
            )}

            <button
              onClick={handleSimulateJoinMatch}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Simulate Player Registration & Fee Deduction</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
