import React, { useState } from 'react';
import { 
  Plus, 
  Gamepad2, 
  Trophy, 
  Users, 
  Key, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Target, 
  Award,
  Sparkles,
  Search,
  Check,
  AlertCircle,
  X,
  Settings,
  Smartphone,
  ScrollText,
  HelpCircle,
  Tag
} from 'lucide-react';
import { TournamentMatch, MatchMap, MatchVersion, MatchStatus, AppUser, AppSettings, CustomDetailField } from '../types';
import { dbService } from '../services/databaseService';
import { sound } from '../services/soundEffects';
import { ConfirmModal } from './ConfirmModal';
import { DEFAULT_MAPS, DEFAULT_GAMES } from '../services/sampleData';

interface TournamentMatchesProps {
  matches: Record<string, TournamentMatch>;
  users: Record<string, AppUser>;
  settings?: AppSettings;
}

const COMMON_DETAIL_PRESETS = [
  'Gun Skins',
  'Air Drop Weapons',
  'Character Skills',
  'Device Restriction',
  'Check-in Time',
  'Live Stream Link',
  'Discord Voice Channel',
  'Top Fragger Reward'
];

export const TournamentMatches: React.FC<TournamentMatchesProps> = ({ matches, users, settings }) => {
  const availableMaps = settings?.availableMaps || DEFAULT_MAPS;
  const availableGames = settings?.availableGames || DEFAULT_GAMES;
  const currency = settings?.currencySymbol || '৳';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MatchStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  // Creation form state
  const [title, setTitle] = useState('');
  const [game, setGame] = useState<string>(availableGames[0] || 'Free Fire');
  const [map, setMap] = useState<MatchMap>(availableMaps[0] || 'Bermuda');
  const [version, setVersion] = useState<MatchVersion>('Solo');
  const [fee, setFee] = useState<string>(String(settings?.defaultFee ?? 30));
  const [prize, setPrize] = useState<string>(String(settings?.defaultPrize ?? 1000));
  const [perKill, setPerKill] = useState<string>(String(settings?.defaultPerKill ?? 10));
  const [roomId, setRoomId] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [matchDate, setMatchDate] = useState('Today');
  const [matchTime, setMatchTime] = useState('09:00 PM');
  const [maxSlots, setMaxSlots] = useState<number>(48);
  const [deviceRequirement, setDeviceRequirement] = useState('Mobile Only (Strict No Emulators)');
  const [customRules, setCustomRules] = useState(settings?.defaultMatchRules || 'Gun Skins OFF · No Landmines · Fair Play Only');
  const [customNotes, setCustomNotes] = useState('');
  const [customDetails, setCustomDetails] = useState<CustomDetailField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full Match Edit modal state
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGame, setEditGame] = useState('');
  const [editMap, setEditMap] = useState<MatchMap>('Bermuda');
  const [editVersion, setEditVersion] = useState<MatchVersion>('Solo');
  const [editFee, setEditFee] = useState<number>(30);
  const [editPrize, setEditPrize] = useState<number>(1000);
  const [editPerKill, setEditPerKill] = useState<number>(10);
  const [editSlots, setEditSlots] = useState<number>(48);
  const [editDate, setEditDate] = useState('Today');
  const [editTime, setEditTime] = useState('09:00 PM');
  const [editDeviceRequirement, setEditDeviceRequirement] = useState('');
  const [editCustomRules, setEditCustomRules] = useState('');
  const [editCustomNotes, setEditCustomNotes] = useState('');
  const [editCustomDetails, setEditCustomDetails] = useState<CustomDetailField[]>([]);

  // Edit Room Modal state
  const [editingRoomMatch, setEditingRoomMatch] = useState<TournamentMatch | null>(null);
  const [editRoomId, setEditRoomId] = useState('');
  const [editRoomPass, setEditRoomPass] = useState('');
  const [editPublish, setEditPublish] = useState(false);

  // Winner declaration modal
  const [winnerModalMatch, setWinnerModalMatch] = useState<TournamentMatch | null>(null);
  const [winnerUser, setWinnerUser] = useState('');
  const [winnerKills, setWinnerKills] = useState('5');
  const [payoutConfirmed, setPayoutConfirmed] = useState(false);

  // Delete match confirm modal
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);

  const matchList = Object.values(matches).sort((a, b) => {
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
    return timeB - timeA;
  });

  const filteredMatches = matchList.filter(m => {
    if (filterStatus !== 'All' && m.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCustom = (m.customDetails || []).some(cd => 
        cd.label.toLowerCase().includes(q) || cd.value.toLowerCase().includes(q)
      );
      return m.title.toLowerCase().includes(q) || 
             m.map.toLowerCase().includes(q) || 
             (m.game && m.game.toLowerCase().includes(q)) ||
             (m.customRules && m.customRules.toLowerCase().includes(q)) ||
             matchCustom;
    }
    return true;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleVersionChange = (newVersion: MatchVersion) => {
    setVersion(newVersion);
    if (newVersion === 'Solo') setMaxSlots(48);
    else if (newVersion === 'Duo') setMaxSlots(24);
    else if (newVersion === 'Squad') setMaxSlots(12);
    else if (newVersion === 'Clash Squad') setMaxSlots(8);
    else if (newVersion === 'Lone Wolf') setMaxSlots(2);
  };

  // Custom Detail field helpers for creation
  const handleAddCustomDetail = () => {
    setCustomDetails(prev => [
      ...prev,
      { id: `detail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, label: '', value: '' }
    ]);
  };

  const handleUpdateCustomDetail = (id: string, key: 'label' | 'value', text: string) => {
    setCustomDetails(prev => prev.map(item => item.id === id ? { ...item, [key]: text } : item));
  };

  const handleRemoveCustomDetail = (id: string) => {
    setCustomDetails(prev => prev.filter(item => item.id !== id));
  };

  // Custom Detail field helpers for editing
  const handleAddEditCustomDetail = () => {
    setEditCustomDetails(prev => [
      ...prev,
      { id: `detail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, label: '', value: '' }
    ]);
  };

  const handleUpdateEditCustomDetail = (id: string, key: 'label' | 'value', text: string) => {
    setEditCustomDetails(prev => prev.map(item => item.id === id ? { ...item, [key]: text } : item));
  };

  const handleRemoveEditCustomDetail = (id: string) => {
    setEditCustomDetails(prev => prev.filter(item => item.id !== id));
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fee) {
      setCreateFormError('Match title and entry fee are required!');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.addMatch({
        title: title.trim(),
        game,
        map,
        version,
        fee: Number(fee),
        prize: Number(prize || 0),
        perKill: Number(perKill || 0),
        roomId: roomId.trim() || 'Pending',
        roomPass: roomPass.trim() || 'Pending',
        isRoomPublished: Boolean(roomId && roomPass),
        matchDate,
        matchTime,
        status: 'Upcoming',
        maxSlots: Number(maxSlots),
        joinedCount: 0,
        deviceRequirement: deviceRequirement.trim(),
        customRules: customRules.trim(),
        customNotes: customNotes.trim(),
        customDetails: customDetails.filter(d => d.label.trim() || d.value.trim())
      });
      sound.playApprove();
      setShowCreateModal(false);
      showToast('Tournament match published successfully with custom details!');
      
      // Reset form
      setTitle('');
      setRoomId('');
      setRoomPass('');
      setCustomDetails([]);
      setCustomNotes('');
      setCreateFormError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditFullMatch = (m: TournamentMatch) => {
    setEditingMatch(m);
    setEditTitle(m.title);
    setEditGame(m.game || availableGames[0] || 'Free Fire');
    setEditMap(m.map);
    setEditVersion(m.version);
    setEditFee(Number(m.fee));
    setEditPrize(Number(m.prize));
    setEditPerKill(Number(m.perKill || 0));
    setEditSlots(m.maxSlots || 48);
    setEditDate(m.matchDate || 'Today');
    setEditTime(m.matchTime || '09:00 PM');
    setEditDeviceRequirement(m.deviceRequirement || 'Mobile Only');
    setEditCustomRules(m.customRules || '');
    setEditCustomNotes(m.customNotes || '');
    setEditCustomDetails(m.customDetails || []);
  };

  const handleSaveFullMatchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    await dbService.updateMatch(editingMatch.id, {
      title: editTitle.trim(),
      game: editGame,
      map: editMap,
      version: editVersion,
      fee: Number(editFee),
      prize: Number(editPrize),
      perKill: Number(editPerKill),
      maxSlots: Number(editSlots),
      matchDate: editDate,
      matchTime: editTime,
      deviceRequirement: editDeviceRequirement.trim(),
      customRules: editCustomRules.trim(),
      customNotes: editCustomNotes.trim(),
      customDetails: editCustomDetails.filter(d => d.label.trim() || d.value.trim())
    });
    sound.playApprove();
    showToast('Match details and custom fields updated successfully');
    setEditingMatch(null);
  };

  const handleOpenEditRoom = (m: TournamentMatch) => {
    setEditingRoomMatch(m);
    setEditRoomId(m.roomId === 'Pending' ? '' : m.roomId);
    setEditRoomPass(m.roomPass === 'Pending' ? '' : m.roomPass);
    setEditPublish(Boolean(m.isRoomPublished));
  };

  const handleSaveRoomCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomMatch) return;
    await dbService.updateRoomCredentials(
      editingRoomMatch.id,
      editRoomId.trim() || 'Pending',
      editRoomPass.trim() || 'Pending',
      editPublish
    );
    sound.playApprove();
    showToast(`Room credentials updated (${editPublish ? 'Live to players' : 'Hidden'})`);
    setEditingRoomMatch(null);
  };

  const handleStatusChange = async (matchId: string, newStatus: MatchStatus) => {
    await dbService.updateMatch(matchId, { status: newStatus });
    sound.playClick();
    showToast(`Match status switched to: ${newStatus}`);
  };

  const handleConfirmDeleteMatch = async () => {
    if (!deleteMatchId) return;
    await dbService.deleteMatch(deleteMatchId);
    sound.playReject();
    showToast('Tournament match removed from list');
    setDeleteMatchId(null);
  };

  const handleConfirmWinnerPayout = async () => {
    if (!winnerModalMatch || !winnerUser) return;
    const basePrize = Number(winnerModalMatch.prize || 0);
    const killBonus = Number(winnerKills || 0) * Number(winnerModalMatch.perKill || 0);
    const totalWinnings = basePrize + killBonus;

    if (users[winnerUser]) {
      await dbService.adjustUserBalance(
        winnerUser,
        totalWinnings,
        `Prize for ${winnerModalMatch.title} (Prize: ${currency}${basePrize} + ${winnerKills} kills: ${currency}${killBonus})`
      );
    }

    await dbService.updateMatch(winnerModalMatch.id, {
      status: 'Completed',
      winner: `${winnerUser} (Winnings: ${currency}${totalWinnings})`
    });

    sound.playApprove();
    showToast(`🏆 ${currency}${totalWinnings} prize credited to ${winnerUser}! Match completed.`);
    setPayoutConfirmed(true);
    setTimeout(() => {
      setPayoutConfirmed(false);
      setWinnerModalMatch(null);
    }, 1500);
  };

  const getMapColor = (mapName: MatchMap) => {
    switch (mapName) {
      case 'Bermuda': return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
      case 'Kalahari': return 'text-amber-400 bg-amber-950/60 border-amber-800/40';
      case 'Purgatory': return 'text-sky-400 bg-sky-950/60 border-sky-800/40';
      case 'Nexterra': return 'text-purple-400 bg-purple-950/60 border-purple-800/40';
      case 'Alpine': return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40';
      default: return 'text-orange-300 bg-orange-950/40 border-orange-800/40';
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full md:w-auto">
          {(['All', 'Upcoming', 'Live', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                sound.playClick();
                setFilterStatus(tab);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex-1 md:flex-initial text-center ${
                filterStatus === tab
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, map, rules, custom fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tournament Match</span>
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No tournaments found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Create Tournament Match" above to schedule a match with custom fields and rules.
            </p>
          </div>
        ) : (
          filteredMatches.map(m => {
            const isLive = m.status === 'Live';
            const isCompleted = m.status === 'Completed';
            const slotsPct = Math.min(100, Math.round(((m.joinedCount || 0) / (m.maxSlots || 48)) * 100));

            return (
              <div
                key={m.id}
                className={`bg-slate-900 border rounded-xl p-4 space-y-3.5 relative transition-all shadow-md ${
                  isLive
                    ? 'border-orange-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20'
                    : 'border-slate-800'
                }`}
              >
                {/* Header row: Title & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                        {m.game || 'Free Fire'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMapColor(m.map)}`}>
                        {m.map}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {m.version}
                      </span>
                      {m.deviceRequirement && (
                        <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                          <Smartphone className="w-2.5 h-2.5" />
                          <span>{m.deviceRequirement}</span>
                        </span>
                      )}
                      <span className={`text-[11px] font-bold ${
                        isLive ? 'text-orange-400 animate-pulse' : isCompleted ? 'text-slate-500' : 'text-sky-400'
                      }`}>
                        · {m.status || 'Upcoming'}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm sm:text-base leading-snug">
                      {m.title}
                    </h3>
                  </div>

                  {/* Actions: Edit match / Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditFullMatch(m)}
                      className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Edit Match Details & Custom Fields"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteMatchId(m.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Delete Match"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Match Financials & Schedule row */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Entry Fee</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-300">{currency}{m.fee}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Prize Pool</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-400">{currency}{m.prize}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Per Kill</span>
                    <span className="text-xs sm:text-sm font-bold text-sky-400">{currency}{m.perKill || 0}</span>
                  </div>
                </div>

                {/* Custom Rules block if configured */}
                {m.customRules && (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs text-amber-200/90 flex items-start gap-2">
                    <ScrollText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-amber-400 block text-[11px]">Match Rules:</span>
                      <p className="leading-relaxed text-[11px] text-slate-300">{m.customRules}</p>
                    </div>
                  </div>
                )}

                {/* Custom Details / Custom Fields Badges if added */}
                {m.customDetails && m.customDetails.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-orange-400" />
                      <span>Custom Details & Specifications:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.customDetails.map((f, i) => (
                        <div
                          key={f.id || i}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1 font-mono shadow-xs"
                        >
                          <strong className="text-orange-400 font-sans font-semibold">{f.label}:</strong>
                          <span className="text-slate-200">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Notes if any */}
                {m.customNotes && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800/60">
                    <strong className="text-slate-300 font-semibold">Note:</strong> {m.customNotes}
                  </div>
                )}

                {/* Slots Progress & Schedule */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.joinedCount || 0} / {m.maxSlots || 48} Registered</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      <Clock className="w-3 h-3 text-orange-400" />
                      <span>{m.matchDate} {m.matchTime}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-orange-500 h-1.5 transition-all"
                      style={{ width: `${slotsPct}%` }}
                    />
                  </div>
                </div>

                {/* Room ID & Pass Display Box */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Key className="w-3 h-3 text-orange-400" />
                      <span>Room Credentials:</span>
                      {m.isRoomPublished ? (
                        <span className="text-emerald-400 flex items-center gap-0.5 text-[10px]">
                          <Eye className="w-3 h-3" /> Live to Players
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-0.5 text-[10px]">
                          <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-200">
                      ID: <strong className="text-orange-300">{m.roomId || 'Pending'}</strong> | Pass: <strong className="text-sky-300">{m.roomPass || 'Pending'}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditRoom(m)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-sky-400" />
                    <span>Edit Room</span>
                  </button>
                </div>

                {/* Footer Controls: Status Toggles & Declare Winner */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Set status:</span>
                    <select
                      value={m.status || 'Upcoming'}
                      onChange={(e) => handleStatusChange(m.id, e.target.value as MatchStatus)}
                      className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 text-slate-300 focus:outline-none"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Live">Live</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {m.winner ? (
                    <div className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate max-w-[140px]">{m.winner}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setWinnerModalMatch(m)}
                      className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Payout Winner</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MATCH MODAL WITH DYNAMIC CUSTOM FIELDS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Create Tournament Match</h3>
                  <p className="text-[11px] text-slate-400">Add default parameters and any custom text fields of your choice</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createFormError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMatch} className="space-y-4">
              {/* Basic Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Match Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Free Fire Bermuda Solo Match #45"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setCreateFormError(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Game Title</label>
                    <select
                      value={game}
                      onChange={(e) => setGame(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {availableGames.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Map</label>
                    <select
                      value={map}
                      onChange={(e) => setMap(e.target.value as MatchMap)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {availableMaps.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Mode / Version</label>
                    <select
                      value={version}
                      onChange={(e) => handleVersionChange(e.target.value as MatchVersion)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Solo">Solo (48 Players)</option>
                      <option value="Duo">Duo (24 Teams)</option>
                      <option value="Squad">Squad (12 Teams)</option>
                      <option value="Clash Squad">Clash Squad (4v4)</option>
                      <option value="Lone Wolf">Lone Wolf (1v1 / 2v2)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Entry Fee ({currency}) *</label>
                    <input
                      type="number"
                      required
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Win Prize ({currency})</label>
                    <input
                      type="number"
                      value={prize}
                      onChange={(e) => setPrize(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Per Kill ({currency})</label>
                    <input
                      type="number"
                      value={perKill}
                      onChange={(e) => setPerKill(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Match Date</label>
                    <input
                      type="text"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      placeholder="e.g. Today, Tomorrow"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Match Time</label>
                    <input
                      type="text"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      placeholder="e.g. 08:30 PM"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Max Player Slots</label>
                    <input
                      type="number"
                      value={maxSlots}
                      onChange={(e) => setMaxSlots(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rules, Device & Notes */}
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Device Requirement</label>
                    <input
                      type="text"
                      value={deviceRequirement}
                      onChange={(e) => setDeviceRequirement(e.target.value)}
                      placeholder="e.g. Mobile Only (No Emulators)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Organizer Note</label>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="e.g. WhatsApp verification required"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Custom Match Rules & Fair Play Regulations
                  </label>
                  <textarea
                    rows={2}
                    value={customRules}
                    onChange={(e) => setCustomRules(e.target.value)}
                    placeholder="Enter any custom rules (e.g. Gun Skins OFF, No Landmines, Character Skills Disabled)..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* DYNAMIC CUSTOM TEXT FIELDS & DETAILS */}
              <div className="p-3 bg-slate-950 rounded-lg border border-orange-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Custom Details & Text Fields of Your Choice</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add any extra custom fields (e.g. Stream Link, Discord Room, Check-in Time, Special Bonus)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomDetail}
                    className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {/* Quick Presets Chips */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                  <span className="mr-1 text-[10px] text-slate-500 uppercase">Quick label chips:</span>
                  {COMMON_DETAIL_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCustomDetails(prev => [
                          ...prev,
                          { id: `detail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, label: preset, value: '' }
                        ]);
                      }}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {/* Dynamic Fields List */}
                {customDetails.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {customDetails.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Field Label (e.g. Gun Skins)"
                          value={field.label}
                          onChange={(e) => handleUpdateCustomDetail(field.id, 'label', e.target.value)}
                          className="w-1/3 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-orange-300 font-semibold focus:outline-none focus:border-orange-500"
                        />
                        <input
                          type="text"
                          placeholder="Field Value / Content (e.g. OFF / Forbidden)"
                          value={field.value}
                          onChange={(e) => handleUpdateCustomDetail(field.id, 'value', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDetail(field.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room credentials */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Custom Room Credentials (can be updated or published later):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Room ID (or leave blank for Pending)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Room Password"
                    value={roomPass}
                    onChange={(e) => setRoomPass(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Tournament Match'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL MATCH CUSTOMIZATION / EDIT MODAL WITH DYNAMIC FIELDS */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                Customize Tournament Match Details & Options
              </h3>
              <button
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFullMatchEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Match Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Game</label>
                  <select
                    value={editGame}
                    onChange={(e) => setEditGame(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {availableGames.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Map</label>
                  <select
                    value={editMap}
                    onChange={(e) => setEditMap(e.target.value as MatchMap)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {availableMaps.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Version</label>
                  <select
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value as MatchVersion)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Duo">Duo</option>
                    <option value="Squad">Squad</option>
                    <option value="Clash Squad">Clash Squad</option>
                    <option value="Lone Wolf">Lone Wolf</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Entry Fee ({currency})</label>
                  <input
                    type="number"
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Win Prize ({currency})</label>
                  <input
                    type="number"
                    value={editPrize}
                    onChange={(e) => setEditPrize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Per Kill ({currency})</label>
                  <input
                    type="number"
                    value={editPerKill}
                    onChange={(e) => setEditPerKill(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Slots</label>
                  <input
                    type="number"
                    value={editSlots}
                    onChange={(e) => setEditSlots(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Time</label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* Rules & Device in Edit */}
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Device Requirement</label>
                    <input
                      type="text"
                      value={editDeviceRequirement}
                      onChange={(e) => setEditDeviceRequirement(e.target.value)}
                      placeholder="e.g. Mobile Only"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Organizer Note</label>
                    <input
                      type="text"
                      value={editCustomNotes}
                      onChange={(e) => setEditCustomNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Rules</label>
                  <textarea
                    rows={2}
                    value={editCustomRules}
                    onChange={(e) => setEditCustomRules(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* DYNAMIC CUSTOM FIELDS IN EDIT MODAL */}
              <div className="p-3 bg-slate-950 rounded-lg border border-sky-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Custom Detail Fields</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Edit or add custom text fields specifically for this tournament
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditCustomDetail}
                    className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {editCustomDetails.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {editCustomDetails.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Field Label"
                          value={field.label}
                          onChange={(e) => handleUpdateEditCustomDetail(field.id, 'label', e.target.value)}
                          className="w-1/3 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-sky-300 font-semibold focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Field Value"
                          value={field.value}
                          onChange={(e) => handleUpdateEditCustomDetail(field.id, 'value', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditCustomDetail(field.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md shadow-sky-600/30 cursor-pointer"
                >
                  Save All Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROOM MODAL */}
      {editingRoomMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-orange-400" />
                <span>Update Room Credentials</span>
              </h3>
              <button
                onClick={() => setEditingRoomMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoomCredentials} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Room ID</label>
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Room Password</label>
                <input
                  type="text"
                  placeholder="Enter Room Password"
                  value={editRoomPass}
                  onChange={(e) => setEditRoomPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editPublish}
                    onChange={(e) => setEditPublish(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-orange-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-white block">Publish Room Live to Players</span>
                    <span className="text-[11px] text-slate-400">Players in user app will see the Room ID & Password</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoomMatch(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold shadow-md shadow-orange-600/30 cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WINNER DECLARATION MODAL */}
      {winnerModalMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Declare Match Winner</h3>
              </div>
              <button
                onClick={() => setWinnerModalMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono">
                <div className="text-white font-bold truncate">{winnerModalMatch.title}</div>
                <div className="text-slate-400">Prize Pool: <strong className="text-emerald-400">{currency}{winnerModalMatch.prize}</strong></div>
                <div className="text-slate-400">Per Kill Bonus: <strong className="text-sky-400">{currency}{winnerModalMatch.perKill || 0}</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Winner Player:</label>
                <select
                  value={winnerUser}
                  onChange={(e) => setWinnerUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">-- Choose player --</option>
                  {Object.values(users).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.id} ({u.ingameName || u.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Winner Kills Count:</label>
                <input
                  type="number"
                  value={winnerKills}
                  onChange={(e) => setWinnerKills(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Total Payout to Credited:</span>
                <div className="text-lg font-black text-emerald-300 font-mono">
                  {currency}{Number(winnerModalMatch.prize || 0) + (Number(winnerKills || 0) * Number(winnerModalMatch.perKill || 0))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWinnerModalMatch(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!winnerUser || payoutConfirmed}
                onClick={handleConfirmWinnerPayout}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                {payoutConfirmed ? 'Credited!' : 'Credit Prize & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Match Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteMatchId)}
        title="Delete Tournament Match?"
        message="Are you sure you want to remove this match from the tournament roster? Any registered players will lose room access."
        confirmLabel="Delete Match"
        onConfirm={handleConfirmDeleteMatch}
        onCancel={() => setDeleteMatchId(null)}
      />
    </div>
  );
};
