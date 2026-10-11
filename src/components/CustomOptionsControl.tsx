import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  CheckCircle, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Share2, 
  Phone, 
  MessageSquare, 
  Users, 
  Radio, 
  Globe, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Gamepad2, 
  AlertTriangle,
  X,
  CreditCard,
  Settings2
} from 'lucide-react';
import { AppSettings, NoticePreset } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';
import { ConfirmModal } from './ConfirmModal';
import { 
  DEFAULT_MAPS, 
  DEFAULT_GAMES, 
  DEFAULT_DEPOSIT_REASONS, 
  DEFAULT_WITHDRAW_REASONS,
  DEFAULT_NOTICE_PRESETS,
  INITIAL_SETTINGS
} from '../services/sampleData';

interface CustomOptionsControlProps {
  settings: AppSettings;
}

export const CustomOptionsControl: React.FC<CustomOptionsControlProps> = ({ settings }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // General & Financial
  const [appName, setAppName] = useState(settings.appName || 'Team Aura Esports');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '৳');
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode || 'BDT');
  const [minDeposit, setMinDeposit] = useState(settings.minDeposit ?? 50);
  const [minWithdraw, setMinWithdraw] = useState(settings.minWithdraw ?? 100);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode || false);
  const [autoRemoveProcessed, setAutoRemoveProcessed] = useState(settings.autoRemoveProcessed || false);

  // Community & Support
  const [supportWhatsapp, setSupportWhatsapp] = useState(settings.supportWhatsapp || '');
  const [supportTelegram, setSupportTelegram] = useState(settings.supportTelegram || '');
  const [communityWhatsappGroup, setCommunityWhatsappGroup] = useState(settings.communityWhatsappGroup || '');
  const [communityTelegramChannel, setCommunityTelegramChannel] = useState(settings.communityTelegramChannel || '');
  const [youtubeChannel, setYoutubeChannel] = useState(settings.youtubeChannel || '');

  // Tournament Defaults
  const [defaultFee, setDefaultFee] = useState(settings.defaultFee ?? 30);
  const [defaultPrize, setDefaultPrize] = useState(settings.defaultPrize ?? 1000);
  const [defaultPerKill, setDefaultPerKill] = useState(settings.defaultPerKill ?? 10);

  // Maps & Games lists
  const [maps, setMaps] = useState<string[]>(settings.availableMaps || DEFAULT_MAPS);
  const [newMapInput, setNewMapInput] = useState('');
  const [games, setGames] = useState<string[]>(settings.availableGames || DEFAULT_GAMES);
  const [newGameInput, setNewGameInput] = useState('');

  // Rejection reasons lists
  const [depositReasons, setDepositReasons] = useState<string[]>(settings.depositRejectReasons || DEFAULT_DEPOSIT_REASONS);
  const [newDepReason, setNewDepReason] = useState('');
  const [withdrawReasons, setWithdrawReasons] = useState<string[]>(settings.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS);
  const [newWithReason, setNewWithReason] = useState('');

  // Notice presets list
  const [noticePresets, setNoticePresets] = useState<NoticePreset[]>(settings.noticePresets || DEFAULT_NOTICE_PRESETS);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetText, setNewPresetText] = useState('');
  const [showAddPresetModal, setShowAddPresetModal] = useState(false);

  // Confirm reset modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state when settings change
  useEffect(() => {
    if (settings) {
      setAppName(settings.appName || 'Team Aura Esports');
      setCurrencySymbol(settings.currencySymbol || '৳');
      setCurrencyCode(settings.currencyCode || 'BDT');
      setMinDeposit(settings.minDeposit ?? 50);
      setMinWithdraw(settings.minWithdraw ?? 100);
      setMaintenanceMode(settings.maintenanceMode || false);
      setAutoRemoveProcessed(settings.autoRemoveProcessed || false);

      setSupportWhatsapp(settings.supportWhatsapp || '');
      setSupportTelegram(settings.supportTelegram || '');
      setCommunityWhatsappGroup(settings.communityWhatsappGroup || '');
      setCommunityTelegramChannel(settings.communityTelegramChannel || '');
      setYoutubeChannel(settings.youtubeChannel || '');

      setDefaultFee(settings.defaultFee ?? 30);
      setDefaultPrize(settings.defaultPrize ?? 1000);
      setDefaultPerKill(settings.defaultPerKill ?? 10);

      setMaps(settings.availableMaps || DEFAULT_MAPS);
      setGames(settings.availableGames || DEFAULT_GAMES);
      setDepositReasons(settings.depositRejectReasons || DEFAULT_DEPOSIT_REASONS);
      setWithdrawReasons(settings.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS);
      setNoticePresets(settings.noticePresets || DEFAULT_NOTICE_PRESETS);
    }
  }, [settings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAll = async () => {
    await dbService.updateSettings({
      appName: appName.trim(),
      currencySymbol: currencySymbol.trim(),
      currencyCode: currencyCode.trim(),
      minDeposit: Number(minDeposit),
      minWithdraw: Number(minWithdraw),
      maintenanceMode,
      autoRemoveProcessed,
      supportWhatsapp: supportWhatsapp.trim(),
      supportTelegram: supportTelegram.trim(),
      communityWhatsappGroup: communityWhatsappGroup.trim(),
      communityTelegramChannel: communityTelegramChannel.trim(),
      youtubeChannel: youtubeChannel.trim(),
      defaultFee: Number(defaultFee),
      defaultPrize: Number(defaultPrize),
      defaultPerKill: Number(defaultPerKill),
      availableMaps: maps,
      availableGames: games,
      depositRejectReasons: depositReasons,
      withdrawRejectReasons: withdrawReasons,
      noticePresets
    });
    sound.playApprove();
    showToast('✓ All preferences and dynamic options saved successfully!');
  };

  const handleAddMap = () => {
    const trimmed = newMapInput.trim();
    if (!trimmed || maps.includes(trimmed)) return;
    const updated = [...maps, trimmed];
    setMaps(updated);
    setNewMapInput('');
    dbService.updateSettings({ availableMaps: updated });
    sound.playClick();
  };

  const handleDeleteMap = (m: string) => {
    const updated = maps.filter(item => item !== m);
    setMaps(updated);
    dbService.updateSettings({ availableMaps: updated });
    sound.playClick();
  };

  const handleAddGame = () => {
    const trimmed = newGameInput.trim();
    if (!trimmed || games.includes(trimmed)) return;
    const updated = [...games, trimmed];
    setGames(updated);
    setNewGameInput('');
    dbService.updateSettings({ availableGames: updated });
    sound.playClick();
  };

  const handleDeleteGame = (g: string) => {
    const updated = games.filter(item => item !== g);
    setGames(updated);
    dbService.updateSettings({ availableGames: updated });
    sound.playClick();
  };

  const handleAddDepReason = () => {
    const trimmed = newDepReason.trim();
    if (!trimmed || depositReasons.includes(trimmed)) return;
    const updated = [...depositReasons, trimmed];
    setDepositReasons(updated);
    setNewDepReason('');
    dbService.updateSettings({ depositRejectReasons: updated });
    sound.playClick();
  };

  const handleDeleteDepReason = (r: string) => {
    const updated = depositReasons.filter(item => item !== r);
    setDepositReasons(updated);
    dbService.updateSettings({ depositRejectReasons: updated });
    sound.playClick();
  };

  const handleAddWithReason = () => {
    const trimmed = newWithReason.trim();
    if (!trimmed || withdrawReasons.includes(trimmed)) return;
    const updated = [...withdrawReasons, trimmed];
    setWithdrawReasons(updated);
    setNewWithReason('');
    dbService.updateSettings({ withdrawRejectReasons: updated });
    sound.playClick();
  };

  const handleDeleteWithReason = (r: string) => {
    const updated = withdrawReasons.filter(item => item !== r);
    setWithdrawReasons(updated);
    dbService.updateSettings({ withdrawRejectReasons: updated });
    sound.playClick();
  };

  const handleAddNoticePreset = () => {
    if (!newPresetTitle.trim() || !newPresetText.trim()) return;
    const newPreset: NoticePreset = {
      id: `preset_${Date.now()}`,
      title: newPresetTitle.trim(),
      text: newPresetText.trim()
    };
    const updated = [...noticePresets, newPreset];
    setNoticePresets(updated);
    dbService.updateSettings({ noticePresets: updated });
    sound.playApprove();
    setNewPresetTitle('');
    setNewPresetText('');
    setShowAddPresetModal(false);
    showToast('Notice preset added!');
  };

  const handleDeleteNoticePreset = (id: string) => {
    const updated = noticePresets.filter(p => p.id !== id);
    setNoticePresets(updated);
    dbService.updateSettings({ noticePresets: updated });
    sound.playClick();
  };

  const handleResetToDefaults = async () => {
    await dbService.updateSettings({
      appName: INITIAL_SETTINGS.appName,
      currencySymbol: INITIAL_SETTINGS.currencySymbol,
      currencyCode: INITIAL_SETTINGS.currencyCode,
      minDeposit: INITIAL_SETTINGS.minDeposit,
      minWithdraw: INITIAL_SETTINGS.minWithdraw,
      autoRemoveProcessed: false,
      availableMaps: DEFAULT_MAPS,
      availableGames: DEFAULT_GAMES,
      depositRejectReasons: DEFAULT_DEPOSIT_REASONS,
      withdrawRejectReasons: DEFAULT_WITHDRAW_REASONS,
      noticePresets: DEFAULT_NOTICE_PRESETS
    });
    sound.playApprove();
    setShowResetConfirm(false);
    showToast('Options reset to initial Team Aura defaults');
  };

  const formatLink = (url: string) => {
    let clean = (url || '').trim();
    if (!clean) return '#';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.startsWith('wa.me') || clean.startsWith('t.me') || clean.startsWith('chat.whatsapp')) {
        clean = 'https://' + clean;
      } else if (clean.startsWith('+88') || clean.startsWith('01')) {
        clean = `https://wa.me/${clean.replace(/[^0-9]/g, '')}`;
      } else if (clean.startsWith('@')) {
        clean = `https://t.me/${clean.replace('@', '')}`;
      } else {
        clean = 'https://' + clean;
      }
    }
    return clean;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              ⚙️ Options & Preferences Customizer
            </h2>
            <p className="text-xs text-slate-400">
              Customize all application options dynamically: financial limits, maps pool, rejection reasons, notice presets, and support channels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSaveAll}
            className="flex-1 md:flex-initial px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All Preferences</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. BRAND & FINANCIAL OPTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-white text-sm">General Branding & Financial Limits</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Currency Symbol</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-20 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-center focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  placeholder="Code (e.g. BDT)"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Minimum Deposit Limit ({currencySymbol})</label>
              <input
                type="number"
                value={minDeposit}
                onChange={(e) => setMinDeposit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Minimum Withdraw Limit ({currencySymbol})</label>
              <input
                type="number"
                value={minWithdraw}
                onChange={(e) => setMinWithdraw(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2.5 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={autoRemoveProcessed}
                onChange={(e) => setAutoRemoveProcessed(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-white block">Auto-Purge Processed Requests</span>
                <span className="text-[11px] text-slate-400">Permanently delete deposit/withdrawal requests from database immediately upon approval or rejection</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-amber-300 block">System Maintenance Mode</span>
                <span className="text-[11px] text-slate-400">Pause match join registrations and lock wallet transactions</span>
              </div>
            </label>
          </div>
        </div>

        {/* 2. COMMUNITY & SOCIAL LINKS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Community & Support Links</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Realtime Player Channels</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp Helpline</span>
                </label>
                {supportWhatsapp && (
                  <a
                    href={formatLink(supportWhatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                )}
              </div>
              <input
                type="text"
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                placeholder="e.g. https://wa.me/8801712987654 or +880 1712-987654"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Telegram Support</span>
                </label>
                {supportTelegram && (
                  <a
                    href={formatLink(supportTelegram)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                )}
              </div>
              <input
                type="text"
                value={supportTelegram}
                onChange={(e) => setSupportTelegram(e.target.value)}
                placeholder="e.g. https://t.me/teamaurasupport or @teamaurasupport"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>WhatsApp Community Group</span>
                </label>
                {communityWhatsappGroup && (
                  <a
                    href={formatLink(communityWhatsappGroup)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                )}
              </div>
              <input
                type="text"
                value={communityWhatsappGroup}
                onChange={(e) => setCommunityWhatsappGroup(e.target.value)}
                placeholder="e.g. https://chat.whatsapp.com/TeamAuraEsports"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Telegram Channel (Room IDs Broadcast)</span>
                </label>
                {communityTelegramChannel && (
                  <a
                    href={formatLink(communityTelegramChannel)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                )}
              </div>
              <input
                type="text"
                value={communityTelegramChannel}
                onChange={(e) => setCommunityTelegramChannel(e.target.value)}
                placeholder="e.g. https://t.me/TeamAuraEsportsOfficial"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>YouTube Official Stream Channel</span>
                </label>
                {youtubeChannel && (
                  <a
                    href={formatLink(youtubeChannel)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                )}
              </div>
              <input
                type="text"
                value={youtubeChannel}
                onChange={(e) => setYoutubeChannel(e.target.value)}
                placeholder="e.g. https://youtube.com/@TeamAuraEsports"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* 3. DYNAMIC MAPS & GAMES POOL */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Tournament Maps & Games Pool</h3>
          </div>

          {/* Maps */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Available Match Maps ({maps.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {maps.map(m => (
                <span
                  key={m}
                  className="px-2.5 py-1 bg-slate-950 text-slate-200 border border-slate-700 rounded-md text-xs flex items-center gap-1.5 font-medium"
                >
                  <span>{m}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteMap(m)}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMapInput}
                onChange={(e) => setNewMapInput(e.target.value)}
                placeholder="Add new map (e.g. Bermuda 2.0, Erangel)..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddMap()}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddMap}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Map</span>
              </button>
            </div>
          </div>

          {/* Games */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Supported Esports Titles ({games.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {games.map(g => (
                <span
                  key={g}
                  className="px-2.5 py-1 bg-slate-950 text-slate-200 border border-slate-700 rounded-md text-xs flex items-center gap-1.5 font-medium"
                >
                  <span>{g}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteGame(g)}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGameInput}
                onChange={(e) => setNewGameInput(e.target.value)}
                placeholder="Add new game title (e.g. COD Mobile, Ludo King)..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddGame()}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddGame}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Game</span>
              </button>
            </div>
          </div>

          {/* Tournament Match Defaults */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Default Tournament Values for Creation Form
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Entry Fee ({currencySymbol})</span>
                <input
                  type="number"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Prize Pool ({currencySymbol})</span>
                <input
                  type="number"
                  value={defaultPrize}
                  onChange={(e) => setDefaultPrize(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Per Kill ({currencySymbol})</span>
                <input
                  type="number"
                  value={defaultPerKill}
                  onChange={(e) => setDefaultPerKill(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. CUSTOM REJECTION REASONS MANAGER */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-white text-sm">Custom Rejection Reason Presets</h3>
          </div>

          {/* Deposit reasons */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1.5">
              Deposit Rejection Reasons ({depositReasons.length})
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mb-2">
              {depositReasons.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300"
                >
                  <span className="truncate max-w-[300px]">{r}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDepReason(r)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDepReason}
                onChange={(e) => setNewDepReason(e.target.value)}
                placeholder="New deposit rejection reason..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddDepReason()}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddDepReason}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Withdrawal reasons */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-rose-300 mb-1.5">
              Withdrawal Rejection Reasons ({withdrawReasons.length})
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mb-2">
              {withdrawReasons.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300"
                >
                  <span className="truncate max-w-[300px]">{r}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteWithReason(r)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWithReason}
                onChange={(e) => setNewWithReason(e.target.value)}
                placeholder="New withdrawal rejection reason..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddWithReason()}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddWithReason}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. NOTICE PRESETS MANAGER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-white text-sm">Notice Board Presets Control</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAddPresetModal(true)}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Notice Preset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {noticePresets.map((preset) => (
            <div
              key={preset.id}
              className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2 text-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-orange-300">{preset.title}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteNoticePreset(preset.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Delete preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">{preset.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add New Notice Preset */}
      {showAddPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Add New Notice Preset</h3>
              <button onClick={() => setShowAddPresetModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preset Title</label>
                <input
                  type="text"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  placeholder="e.g. Scrims Registration Closed"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notice Message</label>
                <textarea
                  rows={3}
                  value={newPresetText}
                  onChange={(e) => setNewPresetText(e.target.value)}
                  placeholder="Enter notice text to broadcast to users..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddPresetModal(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNoticePreset}
                disabled={!newPresetTitle.trim() || !newPresetText.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Add Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Defaults Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset All Options to Default?"
        message="This will restore all app preferences, rejection reasons, tournament maps pool, and community presets to standard Team Aura defaults."
        confirmLabel="Reset Defaults"
        isDanger={false}
        onConfirm={handleResetToDefaults}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
