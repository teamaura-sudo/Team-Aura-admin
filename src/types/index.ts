export type PaymentMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Other';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
export type MatchMap = string;
export type MatchVersion = 'Solo' | 'Duo' | 'Squad' | 'Clash Squad' | 'Lone Wolf';
export type MatchStatus = 'Upcoming' | 'Live' | 'Completed' | 'Cancelled';

export interface PaymentAccount {
  id: string;
  method: PaymentMethod;
  number: string;
  accountType: 'Personal (Send Money)' | 'Agent (Cash In)' | 'Merchant (Payment)';
  isActive: boolean;
  notes?: string;
  updatedAt?: number;
}

export interface DepositRequest {
  id: string;
  userId: string;
  amount: number;
  trx: string;
  method?: PaymentMethod;
  status: RequestStatus;
  timestamp?: number | string;
  note?: string;
  reviewedAt?: number | string;
  senderPhone?: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  amount: number;
  account: string;
  method?: PaymentMethod;
  status: RequestStatus;
  timestamp?: number | string;
  note?: string;
  reviewedAt?: number | string;
}

export interface MatchParticipant {
  userId: string;
  ingameName?: string;
  ingameId?: string;
  joinedAt?: number | string;
  slotNumber?: number;
}

export interface CustomDetailField {
  id: string;
  label: string;
  value: string;
}

export interface TournamentMatch {
  id: string;
  title: string;
  game?: string;
  map: MatchMap;
  version: MatchVersion;
  fee: number | string;
  prize: number | string;
  perKill?: number | string;
  roomId: string;
  roomPass: string;
  isRoomPublished?: boolean;
  matchTime?: string;
  matchDate?: string;
  status?: MatchStatus;
  maxSlots?: number;
  joinedCount?: number;
  participants?: Record<string, MatchParticipant>;
  winner?: string;
  createdAt?: number | string;
  customRules?: string;
  customNotes?: string;
  deviceRequirement?: string;
  customDetails?: CustomDetailField[];
}

export interface AppUser {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  balance: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  matchesPlayed?: number;
  status?: 'Active' | 'Banned';
  ingameName?: string;
  createdAt?: number | string;
}

export interface NoticePreset {
  id: string;
  title: string;
  text: string;
}

export interface AppSettings {
  appName?: string;
  currencySymbol?: string;
  currencyCode?: string;
  notice: string;
  noticeUpdatedAt?: number | string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  autoRemoveProcessed?: boolean;
  minDeposit?: number;
  minWithdraw?: number;
  supportPhone?: string;
  supportWhatsapp?: string;
  supportTelegram?: string;
  communityWhatsappGroup?: string;
  communityTelegramChannel?: string;
  youtubeChannel?: string;
  supportHelpNote?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  upayNumber?: string;
  depositInstructions?: string;
  withdrawInstructions?: string;
  paymentAccounts?: Record<string, PaymentAccount>;
  noticePresets?: NoticePreset[];
  availableMaps?: string[];
  availableGames?: string[];
  depositRejectReasons?: string[];
  withdrawRejectReasons?: string[];
  defaultFee?: number;
  defaultPrize?: number;
  defaultPerKill?: number;
  defaultMatchRules?: string;
}

export interface AdminStats {
  pendingDepositsCount: number;
  pendingDepositsAmount: number;
  pendingWithdrawsCount: number;
  pendingWithdrawsAmount: number;
  totalApprovedDeposits: number;
  totalApprovedWithdraws: number;
  totalMatches: number;
  activeMatches: number;
  totalUsers: number;
  systemBalance: number;
}

export function normalizeStatus(raw?: string | null): RequestStatus {
  if (!raw) return 'Pending';
  const clean = String(raw).trim().toLowerCase();
  if (clean.startsWith('appr') || clean === 'completed' || clean === 'accepted' || clean === 'done' || clean === 'paid') {
    return 'Approved';
  }
  if (clean.startsWith('rej') || clean === 'cancelled' || clean === 'declined' || clean === 'failed') {
    return 'Rejected';
  }
  return 'Pending';
}
