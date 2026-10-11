import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  CheckCircle, 
  Power, 
  ShieldCheck, 
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { PaymentAccount, PaymentMethod, AppSettings } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';
import { ConfirmModal } from './ConfirmModal';

interface PaymentNumbersControlProps {
  settings: AppSettings;
}

export const PaymentNumbersControl: React.FC<PaymentNumbersControlProps> = ({ settings }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state (NO window.confirm!)
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccount | null>(null);

  // Add/Edit Form state
  const [method, setMethod] = useState<PaymentMethod>('bKash');
  const [number, setNumber] = useState('');
  const [accountType, setAccountType] = useState<PaymentAccount['accountType']>('Personal (Send Money)');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const accounts = Object.values(settings.paymentAccounts || {});

  const handleCopy = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    sound.playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setMethod('bKash');
    setNumber('');
    setAccountType('Personal (Send Money)');
    setNotes('');
    setIsActive(true);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (acc: PaymentAccount) => {
    setEditingAccount(acc);
    setMethod(acc.method);
    setNumber(acc.number);
    setAccountType(acc.accountType);
    setNotes(acc.notes || '');
    setIsActive(acc.isActive);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleToggleStatus = async (acc: PaymentAccount) => {
    await dbService.addOrUpdatePaymentAccount({
      ...acc,
      isActive: !acc.isActive
    });
    sound.playClick();
    showToast(`${acc.method} (${acc.number}) marked ${!acc.isActive ? 'Active' : 'Inactive'}`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await dbService.deletePaymentAccount(deleteTarget.id);
    sound.playReject();
    showToast(`${deleteTarget.method} number deleted successfully`);
    setDeleteTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) {
      setFormError('Please enter a valid phone number');
      return;
    }

    const id = editingAccount ? editingAccount.id : `acc_${method.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const newAcc: PaymentAccount = {
      id,
      method,
      number: number.trim(),
      accountType,
      isActive,
      notes: notes.trim(),
      updatedAt: Date.now()
    };

    await dbService.addOrUpdatePaymentAccount(newAcc);
    sound.playApprove();
    setShowAddModal(false);
    showToast(`${method} number updated and synced live!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case 'bKash':
        return 'bg-pink-950 text-pink-400 border-pink-800/50';
      case 'Nagad':
        return 'bg-orange-950 text-orange-400 border-orange-800/50';
      case 'Rocket':
        return 'bg-purple-950 text-purple-400 border-purple-800/50';
      case 'Upay':
        return 'bg-amber-950 text-amber-400 border-amber-800/50';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              💳 Dynamic bKash & Nagad Payment Numbers
            </h2>
            <p className="text-xs text-slate-400">
              Add, update, or toggle wallet numbers where players send entry fee deposits in the user app.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Number</span>
        </button>
      </div>

      {/* Payment Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No payment numbers configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add Payment Number" above to add your bKash or Nagad phone number.
            </p>
          </div>
        ) : (
          accounts.map(acc => {
            const isCopied = copiedId === acc.id;

            return (
              <div
                key={acc.id}
                className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-all relative ${
                  acc.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-60'
                }`}
              >
                {/* Method & Status Header */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getMethodBadge(acc.method)}`}>
                    {acc.method}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(acc)}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      acc.isActive 
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                    title={acc.isActive ? 'Active (Visible to users)' : 'Inactive (Hidden from users)'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{acc.isActive ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>

                {/* Number & Copy */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      {acc.accountType}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-white tracking-wider">
                      {acc.number}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(acc.number, acc.id)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors cursor-pointer"
                    title="Copy number"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Notes & Actions */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="truncate max-w-[170px] text-[11px]">
                    {acc.notes || 'No limit specified'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Edit number details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(acc)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Delete number"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User App Preview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-time In-App Player View</span>
        </div>
        <p className="text-xs text-slate-300 mb-3">
          When players tap "Deposit" in the mobile app, they see the active numbers below:
        </p>

        <div className="flex flex-wrap gap-2 text-xs">
          {accounts.filter(a => a.isActive).map(a => (
            <div key={a.id} className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 font-mono text-slate-200">
              <span className="font-bold text-orange-400">{a.method}: </span>
              <strong>{a.number}</strong>
              <span className="text-slate-500 ml-1">({a.accountType.split(' ')[0]})</span>
            </div>
          ))}
          {accounts.filter(a => a.isActive).length === 0 && (
            <span className="text-rose-400 text-xs">⚠️ No active payment numbers. Players cannot deposit!</span>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-400" />
                <span>{editingAccount ? 'Update Payment Number' : 'Add New Payment Number'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Account / Wallet Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01812345678"
                  value={number}
                  onChange={(e) => {
                    setNumber(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Type / Instruction
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as PaymentAccount['accountType'])}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Personal (Send Money)">Personal (Send Money)</option>
                  <option value="Agent (Cash In)">Agent (Cash In)</option>
                  <option value="Merchant (Payment)">Merchant (Payment)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Limit / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Max ৳25,000/day or Primary Wallet"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <label className="flex items-center gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4"
                />
                <span className="text-xs text-slate-200">
                  Active immediately (Visible in player deposit screen)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingAccount ? 'Update Number' : 'Save & Publish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation (NO window.confirm!) */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Payment Number"
        message={`Are you sure you want to remove the ${deleteTarget?.method} number (${deleteTarget?.number})? Players will no longer see this number.`}
        confirmLabel="Delete Number"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
