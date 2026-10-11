import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Phone, 
  MessageSquare, 
  Save, 
  Settings2,
  Clock,
  ExternalLink,
  Users,
  Share2,
  Globe,
  Radio,
  Check,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { AppSettings, NoticePreset } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';
import { DEFAULT_NOTICE_PRESETS } from '../services/sampleData';

interface NoticeControlProps {
  settings: AppSettings;
}

export const NoticeControl: React.FC<NoticeControlProps> = ({ settings }) => {
  const [noticeText, setNoticeText] = useState(settings.notice || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Community & Support Links state
  const [supportWhatsapp, setSupportWhatsapp] = useState(settings.supportWhatsapp || '');
  const [supportTelegram, setSupportTelegram] = useState(settings.supportTelegram || '');
  const [communityWhatsappGroup, setCommunityWhatsappGroup] = useState(settings.communityWhatsappGroup || '');
  const [communityTelegramChannel, setCommunityTelegramChannel] = useState(settings.communityTelegramChannel || '');
  const [youtubeChannel, setYoutubeChannel] = useState(settings.youtubeChannel || '');
  const [communitySavedToast, setCommunitySavedToast] = useState(false);

  // App limits & payment quick fields
  const [minDeposit, setMinDeposit] = useState(settings.minDeposit ?? 50);
  const [minWithdraw, setMinWithdraw] = useState(settings.minWithdraw ?? 100);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode || false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Dynamic Notice Presets
  const presets: NoticePreset[] = settings.noticePresets && settings.noticePresets.length > 0 
    ? settings.noticePresets 
    : DEFAULT_NOTICE_PRESETS;

  const [showNewPresetModal, setShowNewPresetModal] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetText, setNewPresetText] = useState('');

  // Synchronize local input state whenever `settings` prop changes
  useEffect(() => {
    if (settings) {
      setNoticeText(settings.notice || '');
      setSupportWhatsapp(settings.supportWhatsapp || '');
      setSupportTelegram(settings.supportTelegram || '');
      setCommunityWhatsappGroup(settings.communityWhatsappGroup || '');
      setCommunityTelegramChannel(settings.communityTelegramChannel || '');
      setYoutubeChannel(settings.youtubeChannel || '');
      setMinDeposit(settings.minDeposit ?? 50);
      setMinWithdraw(settings.minWithdraw ?? 100);
      setMaintenanceMode(settings.maintenanceMode || false);
    }
  }, [settings]);

  const handleUpdateNotice = async () => {
    if (!noticeText.trim()) return;
    setIsUpdating(true);
    await dbService.updateNotice(noticeText);
    sound.playApprove();
    setIsUpdating(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleSaveCommunityLinks = async () => {
    await dbService.updateSettings({
      supportWhatsapp: supportWhatsapp.trim(),
      supportTelegram: supportTelegram.trim(),
      communityWhatsappGroup: communityWhatsappGroup.trim(),
      communityTelegramChannel: communityTelegramChannel.trim(),
      youtubeChannel: youtubeChannel.trim()
    });
    sound.playApprove();
    setCommunitySavedToast(true);
    setTimeout(() => setCommunitySavedToast(false), 3000);
  };

  const handleSaveLimits = async () => {
    await dbService.updateSettings({
      minDeposit: Number(minDeposit),
      minWithdraw: Number(minWithdraw),
      maintenanceMode
    });
    sound.playApprove();
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleAddPreset = async () => {
    if (!newPresetTitle.trim() || !newPresetText.trim()) return;
    const newPreset: NoticePreset = {
      id: `preset_${Date.now()}`,
      title: newPresetTitle.trim(),
      text: newPresetText.trim()
    };
    await dbService.addNoticePreset(newPreset);
    sound.playApprove();
    setNewPresetTitle('');
    setNewPresetText('');
    setShowNewPresetModal(false);
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbService.deleteNoticePreset(id);
    sound.playClick();
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
      {/* Notice Board Broadcaster */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                📢 Notice Board Control
              </h2>
              <p className="text-xs text-slate-400">
                Broadcast instant messages and marquee alerts to all users in the Team Aura mobile & web app.
              </p>
            </div>
          </div>
          {settings.noticeUpdatedAt && (
            <div className="text-right text-[11px] text-slate-400 font-mono hidden sm:block">
              Last Broadcast: {new Date(settings.noticeUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Live Active Preview */}
        <div className="mb-4 p-3.5 bg-slate-950/70 border border-orange-500/30 rounded-lg">
          <div className="text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Live In-App Display:
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {settings.notice || 'No notice currently set.'}
          </p>
        </div>

        {/* Input Box */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="Enter notice for user app (e.g., Free Fire Daily Scrims #42 Room ID ready...)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <div className="absolute bottom-2.5 right-3 text-[11px] text-slate-500 font-mono">
              {noticeText.length} characters
            </div>
          </div>

          {/* Quick Insert Symbols */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] text-slate-400 mr-1">Quick insert:</span>
            {['🔥', '⚡', '🏆', '৳', '📢', '⚠️', '🎮', '💥', '🥇', '👑'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setNoticeText(prev => prev + emoji)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-sm transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Dynamic Preset Buttons */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400">Notice Presets ({presets.length}):</p>
              <button
                type="button"
                onClick={() => setShowNewPresetModal(true)}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Preset</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {presets.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setNoticeText(p.text)}
                  className="group text-left p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition-colors cursor-pointer flex justify-between items-start"
                >
                  <div className="flex-1 pr-2">
                    <span className="font-semibold text-orange-300 block mb-0.5">{p.title}</span>
                    <span className="text-slate-400 line-clamp-1">{p.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(p.id, e)}
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Delete preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-between">
            {showSavedToast ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Notice published live to Firebase!
              </span>
            ) : <span />}

            <button
              onClick={handleUpdateNotice}
              disabled={isUpdating || !noticeText.trim()}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-sm shadow-md shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isUpdating ? 'Publishing...' : 'Update Notice'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TEAM AURA COMMUNITY & SUPPORT SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                💬 Team Aura Community & Support
              </h2>
              <p className="text-xs text-slate-400">
                Add and update your official WhatsApp Helpline, Telegram Support, Community Groups, and Tournament Announcement Channels.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveCommunityLinks}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Community Links</span>
          </button>
        </div>

        {communitySavedToast && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp and Telegram community links saved and synced live to Firebase!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp Support Helpline */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Support / Helpline</span>
              </label>
              {supportWhatsapp && (
                <a
                  href={formatLink(supportWhatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. https://wa.me/8801712987654 or +880 1712-987654"
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500">
              Direct chat link where players get 24/7 help with deposits and room issues.
            </p>
          </div>

          {/* Telegram Support Helpline */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Telegram Support / Helpline</span>
              </label>
              {supportTelegram && (
                <a
                  href={formatLink(supportTelegram)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. https://t.me/teamaurasupport or @teamaurasupport"
              value={supportTelegram}
              onChange={(e) => setSupportTelegram(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-500">
              Admin Telegram handle for quick support inquiries.
            </p>
          </div>

          {/* Official WhatsApp Tournament Group */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Official WhatsApp Community Group</span>
              </label>
              {communityWhatsappGroup && (
                <a
                  href={formatLink(communityWhatsappGroup)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. https://chat.whatsapp.com/TeamAuraEsports"
              value={communityWhatsappGroup}
              onChange={(e) => setCommunityWhatsappGroup(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500">
              Tournament players join this WhatsApp group for community chat and announcements.
            </p>
          </div>

          {/* Official Telegram Announcement Channel */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Official Telegram Channel (Room ID Broadcast)</span>
              </label>
              {communityTelegramChannel && (
                <a
                  href={formatLink(communityTelegramChannel)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. https://t.me/TeamAuraEsportsOfficial"
              value={communityTelegramChannel}
              onChange={(e) => setCommunityTelegramChannel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-500">
              Broadcasts room ID, password, and custom scrim schedules to subscribers.
            </p>
          </div>

          {/* YouTube Streaming Channel */}
          <div className="col-span-full bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Official YouTube Live Stream / Channel</span>
              </label>
              {youtubeChannel && (
                <a
                  href={formatLink(youtubeChannel)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. https://youtube.com/@TeamAuraEsports"
              value={youtubeChannel}
              onChange={(e) => setYoutubeChannel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* In-App Live Buttons Preview */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs font-bold text-slate-300 mb-2">
            In-App Player Community Preview:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {supportWhatsapp && (
              <a
                href={formatLink(supportWhatsapp)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium flex items-center gap-1.5 hover:bg-emerald-900 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Helpline</span>
              </a>
            )}
            {supportTelegram && (
              <a
                href={formatLink(supportTelegram)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800/60 font-medium flex items-center gap-1.5 hover:bg-sky-900 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Telegram Support</span>
              </a>
            )}
            {communityWhatsappGroup && (
              <a
                href={formatLink(communityWhatsappGroup)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium flex items-center gap-1.5 hover:bg-emerald-900 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>WhatsApp Group</span>
              </a>
            )}
            {communityTelegramChannel && (
              <a
                href={formatLink(communityTelegramChannel)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800/60 font-medium flex items-center gap-1.5 hover:bg-sky-900 transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Telegram Channel</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* App Operations & General Limits */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 mb-4">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              ⚙️ Limits & System Controls
            </h2>
            <p className="text-xs text-slate-400">
              Configure minimum withdrawal & deposit limits, and enable maintenance mode.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Minimum Deposit Limit ({settings.currencySymbol || '৳'})
            </label>
            <input
              type="number"
              value={minDeposit}
              onChange={(e) => setMinDeposit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Minimum Withdraw Limit ({settings.currencySymbol || '৳'})
            </label>
            <input
              type="number"
              value={minWithdraw}
              onChange={(e) => setMinWithdraw(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4"
            />
            <span>Enable App Maintenance Mode (Freezes user registrations & matches)</span>
          </label>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {settingsSavedToast && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Settings Saved!
              </span>
            )}
            <button
              onClick={handleSaveLimits}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-sky-400" />
              <span>Save System Limits</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add New Notice Preset */}
      {showNewPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Add Notice Preset</h3>
              <button onClick={() => setShowNewPresetModal(false)} className="text-slate-400 hover:text-white">
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
                <label className="block font-semibold text-slate-300 mb-1">Notice Content</label>
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
                onClick={() => setShowNewPresetModal(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPreset}
                disabled={!newPresetTitle.trim() || !newPresetText.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
