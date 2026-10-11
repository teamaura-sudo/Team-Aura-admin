import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Volume2, 
  VolumeX, 
  Database, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  ExternalLink,
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';

interface HeaderProps {
  onOpenFirebaseModal: () => void;
  onOpenSimulatorModal: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingDepositsCount: number;
  pendingWithdrawsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFirebaseModal,
  onOpenSimulatorModal,
  activeTab,
  onTabChange,
  pendingDepositsCount,
  pendingWithdrawsCount,
}) => {
  const [dbStatus, setDbStatus] = useState(dbService.getStatus());
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [bdTime, setBdTime] = useState<string>('');

  useEffect(() => {
    const unsub = dbService.subscribe(() => {
      setDbStatus(dbService.getStatus());
    });

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      // Bangladesh Standard Time (UTC+6)
      const bdOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setBdTime(new Intl.DateTimeFormat([], bdOptions).format(now));
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundEnabled(sound.enabled);
    if (sound.enabled) sound.playClick();
  };

  const navItems = [
    { id: 'overview', label: 'Command Center', icon: '📊' },
    { id: 'deposits', label: 'Deposits', badge: pendingDepositsCount, badgeColor: 'bg-emerald-500', icon: '💰' },
    { id: 'withdraws', label: 'Withdrawals', badge: pendingWithdrawsCount, badgeColor: 'bg-rose-500', icon: '💸' },
    { id: 'payments', label: 'bKash/Nagad Numbers', icon: '💳' },
    { id: 'matches', label: 'Tournaments', icon: '🎮' },
    { id: 'preferences', label: 'Options & Preferences', icon: '⚙️' },
    { id: 'notices', label: 'Notices & Support', icon: '📢' },
    { id: 'users', label: 'Users & Balances', icon: '👥' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/60">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl">
              <Zap className="w-6 h-6 fill-white stroke-orange-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white">TEAM AURA</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400 bg-orange-950/80 border border-orange-500/30 px-1.5 py-0.5 rounded">
                  ESPORTS ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono hidden sm:block">
                Free Fire Scrims & Financial Gateway
              </p>
            </div>
          </div>

          {/* Quick Info & Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Clocks */}
            <div className="hidden md:flex items-center space-x-3 text-xs font-mono text-slate-400 border border-slate-800 bg-slate-900/80 px-3 py-1.5 rounded-md">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>BST (Dhaka): <strong className="text-slate-200">{bdTime || '--:--'}</strong></span>
              </div>
            </div>

            {/* Firebase Status Badge */}
            <button
              onClick={onOpenFirebaseModal}
              title="Firebase RTDB Connection Settings"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                dbStatus.permissionError
                  ? 'bg-rose-950/40 border-rose-700/60 text-rose-300 hover:bg-rose-900/40'
                  : dbStatus.connected
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                dbStatus.permissionError
                  ? 'bg-rose-500 animate-pulse'
                  : dbStatus.connected
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`} />
              <span className="hidden sm:inline">
                {dbStatus.permissionError
                  ? 'RTDB Rules Restricted'
                  : dbStatus.connected
                  ? 'Firebase Live Sync'
                  : 'Connecting RTDB...'}
              </span>
              <Database className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Test Simulator Trigger */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenSimulatorModal();
              }}
              title="Open User Client Simulator to test deposits & tournaments"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-sm shadow-orange-600/30 transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Test Simulator</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Alert Sounds' : 'Enable Alert Sounds'}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-orange-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  onTabChange(item.id);
                }}
                className={`relative px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded text-white ${
                    isActive ? 'bg-orange-900' : 'bg-red-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
