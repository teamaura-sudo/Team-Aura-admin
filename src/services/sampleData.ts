import { DepositRequest, WithdrawRequest, TournamentMatch, AppUser, AppSettings, NoticePreset } from '../types';

export const DEFAULT_NOTICE_PRESETS: NoticePreset[] = [
  {
    id: "preset_1",
    title: "Tournament Announcement",
    text: "🏆 FREE FIRE SOLO & DUO TOURNAMENTS ARE NOW LIVE! Join before slots fill up. Room ID & Password will be revealed 15 minutes before match start."
  },
  {
    id: "preset_2",
    title: "Withdrawal Schedule",
    text: "💸 Daily withdrawal processing time is 10:00 AM - 11:00 PM. Please double-check your bKash/Nagad personal number before submitting!"
  },
  {
    id: "preset_3",
    title: "Anti-Hack & Fair Play",
    text: "⚠️ STRICT WARNING: Use of any config, injector, or emulator in mobile scrims will result in permanent account ban without prize refund."
  },
  {
    id: "preset_4",
    title: "Deposit Verification Rules",
    text: "⚡ Always copy your exact TrxID after sending money. Submissions without valid transaction IDs will be automatically rejected."
  }
];

export const DEFAULT_MAPS = [
  'Bermuda',
  'Kalahari',
  'Purgatory',
  'Nexterra',
  'Alpine',
  'Bermuda Remastered'
];

export const DEFAULT_GAMES = [
  'Free Fire',
  'Free Fire MAX',
  'PUBG Mobile',
  'BGMI'
];

export const DEFAULT_DEPOSIT_REASONS = [
  'TrxID not found in merchant statement',
  'Incorrect deposit amount entered',
  'Duplicate transaction ID submitted',
  'Payment not received in admin wallet',
  'Invalid sender phone number'
];

export const DEFAULT_WITHDRAW_REASONS = [
  'Invalid phone number or account barred',
  'Insufficient wallet balance',
  'Suspected suspicious / irregular activity',
  'Temporary banking gateway maintenance',
  'Incorrect payment method chosen'
];

export const INITIAL_SETTINGS: AppSettings = {
  appName: "Team Aura Esports",
  currencySymbol: "৳",
  currencyCode: "BDT",
  notice: "🔥 WELCOME TO TEAM AURA ESPORTS! Free Fire Daily Scrims & Tournaments Room ID will be published 15 minutes before match start. Minimum deposit ৳50, minimum withdraw ৳100. Contact WhatsApp for 24/7 support.",
  noticeUpdatedAt: Date.now() - 3600000,
  maintenanceMode: false,
  autoRemoveProcessed: false,
  minDeposit: 50,
  minWithdraw: 100,
  supportPhone: "+880 1812-345678",
  supportWhatsapp: "https://wa.me/8801712987654",
  supportTelegram: "https://t.me/teamaurasupport",
  communityWhatsappGroup: "https://chat.whatsapp.com/TeamAuraEsports",
  communityTelegramChannel: "https://t.me/TeamAuraEsportsOfficial",
  youtubeChannel: "https://youtube.com/@TeamAuraEsports",
  bkashNumber: "01812345678 (Personal / Send Money)",
  nagadNumber: "01712987654 (Personal / Send Money)",
  rocketNumber: "01912345670 (Personal / Send Money)",
  upayNumber: "01800000000 (Personal)",
  depositInstructions: "Send Money to our active Personal wallet numbers. Always copy and paste the exact TrxID from your bKash/Nagad SMS receipt.",
  withdrawInstructions: "Ensure your bKash or Nagad wallet number is correct and active. Withdrawals are processed within 15-30 minutes.",
  paymentAccounts: {
    "acc_bkash_1": {
      id: "acc_bkash_1",
      method: "bKash",
      number: "01812345678",
      accountType: "Personal (Send Money)",
      isActive: true,
      notes: "Primary bKash Wallet for tournament deposits",
      updatedAt: Date.now() - 3600000
    },
    "acc_nagad_1": {
      id: "acc_nagad_1",
      method: "Nagad",
      number: "01712987654",
      accountType: "Personal (Send Money)",
      isActive: true,
      notes: "Primary Nagad Wallet for 24/7 deposits",
      updatedAt: Date.now() - 3600000
    },
    "acc_rocket_1": {
      id: "acc_rocket_1",
      method: "Rocket",
      number: "01912345670",
      accountType: "Personal (Send Money)",
      isActive: true,
      notes: "Rocket Send Money personal number",
      updatedAt: Date.now() - 3600000
    }
  },
  noticePresets: DEFAULT_NOTICE_PRESETS,
  availableMaps: DEFAULT_MAPS,
  availableGames: DEFAULT_GAMES,
  depositRejectReasons: DEFAULT_DEPOSIT_REASONS,
  withdrawRejectReasons: DEFAULT_WITHDRAW_REASONS,
  defaultFee: 30,
  defaultPrize: 1000,
  defaultPerKill: 10
};

export const SAMPLE_USERS: Record<string, AppUser> = {
  "user_aura_101": {
    id: "user_aura_101",
    name: "Tanvir Hasan (Aura_Sniper)",
    phone: "01711223344",
    email: "tanvir.esports@gmail.com",
    balance: 450,
    totalDeposited: 1200,
    totalWithdrawn: 750,
    matchesPlayed: 14,
    status: 'Active',
    ingameName: "AURA_SNIPER99",
    createdAt: Date.now() - 86400000 * 5
  },
  "user_aura_102": {
    id: "user_aura_102",
    name: "Rifat Ahmed (ShadowKill)",
    phone: "01822334455",
    email: "rifat.aura@gmail.com",
    balance: 120,
    totalDeposited: 500,
    totalWithdrawn: 380,
    matchesPlayed: 8,
    status: 'Active',
    ingameName: "SHADOW_KILL_BD",
    createdAt: Date.now() - 86400000 * 3
  },
  "user_aura_103": {
    id: "user_aura_103",
    name: "Shakib Al Amin (Viper_Boss)",
    phone: "01933445566",
    email: "shakib.gaming@yahoo.com",
    balance: 890,
    totalDeposited: 2500,
    totalWithdrawn: 1610,
    matchesPlayed: 29,
    status: 'Active',
    ingameName: "VIPER_AURA_01",
    createdAt: Date.now() - 86400000 * 12
  },
  "user_aura_104": {
    id: "user_aura_104",
    name: "Mahfuz Rahman (CyberGhost)",
    phone: "01644556677",
    email: "mahfuz.bd@gmail.com",
    balance: 30,
    totalDeposited: 300,
    totalWithdrawn: 270,
    matchesPlayed: 4,
    status: 'Active',
    ingameName: "GHOST_CYBER",
    createdAt: Date.now() - 86400000 * 2
  }
};

export const SAMPLE_DEPOSITS: Record<string, DepositRequest> = {
  "dep_aura_001": {
    id: "dep_aura_001",
    userId: "user_aura_101",
    amount: 150,
    trx: "9K8L2M3N4P",
    method: "bKash",
    status: "Pending",
    senderPhone: "01711223344",
    timestamp: Date.now() - 1000 * 60 * 12,
    note: "Solo tournament entry fee"
  },
  "dep_aura_002": {
    id: "dep_aura_002",
    userId: "user_aura_102",
    amount: 300,
    trx: "8X7Y6Z5W4V",
    method: "Nagad",
    status: "Pending",
    senderPhone: "01822334455",
    timestamp: Date.now() - 1000 * 60 * 38,
    note: "Duo match registration"
  },
  "dep_aura_003": {
    id: "dep_aura_003",
    userId: "user_aura_103",
    amount: 500,
    trx: "7M6N5P4Q3R",
    method: "bKash",
    status: "Pending",
    senderPhone: "01933445566",
    timestamp: Date.now() - 1000 * 60 * 85,
    note: "Wallet topup"
  }
};

export const SAMPLE_WITHDRAWS: Record<string, WithdrawRequest> = {
  "with_aura_001": {
    id: "with_aura_001",
    userId: "user_aura_103",
    amount: 400,
    account: "01933445566 (Personal bKash)",
    method: "bKash",
    status: "Pending",
    timestamp: Date.now() - 1000 * 60 * 25,
    note: "Tournament prize withdrawal"
  },
  "with_aura_002": {
    id: "with_aura_002",
    userId: "user_aura_101",
    amount: 250,
    account: "01711223344 (Personal Nagad)",
    method: "Nagad",
    status: "Pending",
    timestamp: Date.now() - 1000 * 60 * 110,
    note: "Cashout winnings"
  }
};

export const SAMPLE_MATCHES: Record<string, TournamentMatch> = {
  "match_aura_1": {
    id: "match_aura_1",
    title: "⚡ Free Fire Solo Rush #42 [Daily Scrim]",
    game: "Free Fire",
    map: "Bermuda",
    version: "Solo",
    fee: 30,
    prize: 1000,
    perKill: 10,
    roomId: "84729103",
    roomPass: "9988",
    isRoomPublished: true,
    matchDate: "Today",
    matchTime: "08:30 PM",
    status: "Upcoming",
    maxSlots: 48,
    joinedCount: 36,
    participants: {
      "p_1": { userId: "user_aura_101", ingameName: "AURA_SNIPER99", slotNumber: 1, joinedAt: Date.now() - 3600000 },
      "p_2": { userId: "user_aura_102", ingameName: "SHADOW_KILL_BD", slotNumber: 2, joinedAt: Date.now() - 3000000 },
      "p_3": { userId: "user_aura_103", ingameName: "VIPER_AURA_01", slotNumber: 3, joinedAt: Date.now() - 2400000 }
    },
    createdAt: Date.now() - 7200000
  },
  "match_aura_2": {
    id: "match_aura_2",
    title: "🏆 Duo Grand Championship Qualifier",
    game: "Free Fire",
    map: "Purgatory",
    version: "Duo",
    fee: 60,
    prize: 2200,
    perKill: 15,
    roomId: "59102944",
    roomPass: "aura2026",
    isRoomPublished: false,
    matchDate: "Today",
    matchTime: "10:00 PM",
    status: "Upcoming",
    maxSlots: 24,
    joinedCount: 18,
    createdAt: Date.now() - 14400000
  },
  "match_aura_3": {
    id: "match_aura_3",
    title: "💥 Squad Survival Showdown #12",
    game: "Free Fire",
    map: "Kalahari",
    version: "Squad",
    fee: 120,
    prize: 4500,
    perKill: 20,
    roomId: "11223344",
    roomPass: "squadkill",
    isRoomPublished: true,
    matchDate: "Yesterday",
    matchTime: "09:00 PM",
    status: "Completed",
    maxSlots: 12,
    joinedCount: 12,
    winner: "VIPER_AURA_01 (User: user_aura_103)",
    createdAt: Date.now() - 86400000
  }
};
