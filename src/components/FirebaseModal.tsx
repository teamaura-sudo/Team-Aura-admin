import React, { useState } from 'react';
import { 
  Database, 
  X, 
  Check, 
  AlertTriangle, 
  CloudUpload, 
  ShieldCheck, 
  RotateCcw, 
  ExternalLink, 
  Copy 
} from 'lucide-react';
import { dbService } from '../services/databaseService';
import { firebaseConfig } from '../firebase/config';
import { sound } from '../services/soundEffects';
import { ConfirmModal } from './ConfirmModal';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(dbService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const rulesSnippet = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(rulesSnippet);
    setCopiedRules(true);
    sound.playClick();
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const handleSyncToFirebase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await dbService.syncToFirebase();
      setSyncResult(res.message);
      setStatus(dbService.getStatus());
      if (res.success) sound.playApprove();
      else sound.playReject();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleLocalMode = () => {
    dbService.toggleLocalMode();
    setStatus(dbService.getStatus());
    sound.playClick();
  };

  const handleConfirmReset = () => {
    dbService.resetDataToSample();
    sound.playApprove();
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl my-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="font-bold text-white text-base">Firebase Realtime Database Status</h3>
                <p className="text-[11px] text-slate-400">Database health, connection parameters, and security rules</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Status Box */}
          <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
            status.permissionError
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              : status.connected
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  status.permissionError
                    ? 'bg-rose-500 animate-pulse'
                    : status.connected
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`} />
                <span>
                  {status.permissionError
                    ? 'Firebase RTDB: Permission Denied (Restricted Rules)'
                    : status.connected
                    ? 'Firebase RTDB: Connected & Live'
                    : 'Firebase RTDB: Connecting / Offline'}
                </span>
              </span>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                {status.localMode ? 'Local Cache Active' : 'Live Mode Active'}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-300">
              {status.permissionError
                ? 'Your Firebase Realtime Database has security rules that deny public read/write without authentication. All admin operations safely work in reactive Local Sandbox Mode, or update your Firebase RTDB rules in console.'
                : status.connected
                ? 'Real-time synchronization is live. Reads and writes sync with your Firebase Realtime Database URL.'
                : 'Waiting for Firebase connection or network availability.'}
            </p>
          </div>

          {/* Config Details */}
          <div className="space-y-1.5 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Project ID:</span>
              <span className="text-white">{firebaseConfig.projectId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Database URL:</span>
              <span className="text-orange-400 truncate max-w-[280px]">{firebaseConfig.databaseURL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Auth Domain:</span>
              <span className="text-slate-400">{firebaseConfig.authDomain}</span>
            </div>
          </div>

          {/* Rules Guide */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Recommended RTDB Rules for Testing:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyRules}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? 'Copied' : 'Copy Rules'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-amber-300 font-mono overflow-x-auto">
              {rulesSnippet}
            </pre>
            <p className="text-[10px] text-slate-400">
              Paste in Firebase Console &gt; Realtime Database &gt; Rules tab to allow the admin panel and mobile app read/write access.
            </p>
          </div>

          {/* Sync Result feedback */}
          {syncResult && (
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200">
              {syncResult}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleSyncToFirebase}
              disabled={isSyncing}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isSyncing ? 'Pushing to Firebase...' : 'Push Sample Tournaments & Users to Firebase RTDB'}</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleToggleLocalMode}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {status.localMode ? 'Switch to Live Firebase' : 'Force Local Sandbox Mode'}
              </button>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset sample data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset State</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset All Data to Sample State?"
        message="This will reset all tournaments, balances, deposits, and withdrawal requests back to sample starting values."
        confirmLabel="Reset State"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
};
