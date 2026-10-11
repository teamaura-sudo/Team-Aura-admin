import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { NoticeControl } from './components/NoticeControl';
import { DepositsQueue } from './components/DepositsQueue';
import { WithdrawsQueue } from './components/WithdrawsQueue';
import { TournamentMatches } from './components/TournamentMatches';
import { UserAccounts } from './components/UserAccounts';
import { PaymentNumbersControl } from './components/PaymentNumbersControl';
import { CustomOptionsControl } from './components/CustomOptionsControl';
import { FirebaseModal } from './components/FirebaseModal';
import { UserSimulatorModal } from './components/UserSimulatorModal';
import { dbService } from './services/databaseService';
import { sound } from './services/soundEffects';
import { normalizeStatus } from './types';
import { Zap, ShieldAlert, Sparkles, Smartphone, Database } from 'lucide-react';

export default function App() {
  const [dbState, setDbState] = useState(dbService.getState());
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);

  const prevPendingDepositsCount = useRef(
    Object.values(dbState.deposits).filter(d => normalizeStatus(d.status) === 'Pending').length
  );
  const prevPendingWithdrawsCount = useRef(
    Object.values(dbState.withdraws).filter(w => normalizeStatus(w.status) === 'Pending').length
  );

  useEffect(() => {
    const unsub = dbService.subscribe(() => {
      const newState = dbService.getState();
      setDbState({ ...newState });

      // Audio notification if new pending deposit arrives
      const newPendingDepCount = Object.values(newState.deposits).filter(d => normalizeStatus(d.status) === 'Pending').length;
      const newPendingWithCount = Object.values(newState.withdraws).filter(w => normalizeStatus(w.status) === 'Pending').length;

      if (newPendingDepCount > prevPendingDepositsCount.current || newPendingWithCount > prevPendingWithdrawsCount.current) {
        sound.playNotify();
      }
      prevPendingDepositsCount.current = newPendingDepCount;
      prevPendingWithdrawsCount.current = newPendingWithCount;
    });

    return () => {
      unsub();
    };
  }, []);

  const pendingDepositsCount = Object.values(dbState.deposits).filter(d => normalizeStatus(d.status) === 'Pending').length;
  const pendingWithdrawsCount = Object.values(dbState.withdraws).filter(w => normalizeStatus(w.status) === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenSimulatorModal={() => setIsSimulatorModalOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingDepositsCount={pendingDepositsCount}
        pendingWithdrawsCount={pendingWithdrawsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewDashboard
            settings={dbState.settings}
            deposits={dbState.deposits}
            withdraws={dbState.withdraws}
            matches={dbState.matches}
            users={dbState.users}
            onNavigateTab={setActiveTab}
            onOpenCreateMatch={() => setActiveTab('matches')}
          />
        )}

        {activeTab === 'deposits' && (
          <DepositsQueue
            deposits={dbState.deposits}
            users={dbState.users}
            settings={dbState.settings}
            onInspectUser={() => setActiveTab('users')}
          />
        )}

        {activeTab === 'withdraws' && (
          <WithdrawsQueue
            withdraws={dbState.withdraws}
            users={dbState.users}
            settings={dbState.settings}
            onInspectUser={() => setActiveTab('users')}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentNumbersControl
            settings={dbState.settings}
          />
        )}

        {activeTab === 'matches' && (
          <TournamentMatches
            matches={dbState.matches}
            users={dbState.users}
            settings={dbState.settings}
          />
        )}

        {activeTab === 'preferences' && (
          <CustomOptionsControl
            settings={dbState.settings}
          />
        )}

        {activeTab === 'notices' && (
          <NoticeControl
            settings={dbState.settings}
          />
        )}

        {activeTab === 'users' && (
          <UserAccounts
            users={dbState.users}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-slate-300">TEAM AURA ESPORTS</span>
            <span>· Admin & Tournament Control Hub</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <button
              onClick={() => setIsSimulatorModalOpen(true)}
              className="hover:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Player App Simulator</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Firebase RTDB Diagnostics</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-600">
            Connected: team-aura-6d1ba-default-rtdb
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />

      <UserSimulatorModal
        isOpen={isSimulatorModalOpen}
        onClose={() => setIsSimulatorModalOpen(false)}
        users={dbState.users}
        matches={dbState.matches}
        settings={dbState.settings}
      />
    </div>
  );
}
