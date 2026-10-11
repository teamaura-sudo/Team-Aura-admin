import {
  ref,
  onValue,
  set,
  push,
  update,
  remove,
  runTransaction
} from 'firebase/database';
import { db } from '../firebase/config';
import {
  DepositRequest,
  WithdrawRequest,
  TournamentMatch,
  AppUser,
  AppSettings,
  PaymentAccount,
  PaymentMethod,
  NoticePreset,
  RequestStatus,
  normalizeStatus
} from '../types';
import {
  INITIAL_SETTINGS,
  SAMPLE_USERS,
  SAMPLE_DEPOSITS,
  SAMPLE_WITHDRAWS,
  SAMPLE_MATCHES,
  DEFAULT_NOTICE_PRESETS,
  DEFAULT_MAPS,
  DEFAULT_GAMES,
  DEFAULT_DEPOSIT_REASONS,
  DEFAULT_WITHDRAW_REASONS
} from './sampleData';

const LOCAL_STORAGE_KEY = 'team_aura_admin_db_v6';

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timed out')), timeoutMs)
    )
  ]);
}

interface LocalDBState {
  settings: AppSettings;
  users: Record<string, AppUser>;
  deposits: Record<string, DepositRequest>;
  withdraws: Record<string, WithdrawRequest>;
  matches: Record<string, TournamentMatch>;
}

class DatabaseService {
  private isFirebaseConnected = false;
  private isFirebaseAccessible = true;
  private permissionErrorOccurred = false;
  private useLocalMode = false;

  // Processed IDs tracker to guarantee approved/rejected items NEVER reappear as pending
  private processedDeposits: Record<string, { status: RequestStatus; timestamp: number }> = {};
  private processedWithdraws: Record<string, { status: RequestStatus; timestamp: number }> = {};

  private state: LocalDBState = {
    settings: { ...INITIAL_SETTINGS },
    users: { ...SAMPLE_USERS },
    deposits: { ...SAMPLE_DEPOSITS },
    withdraws: { ...SAMPLE_WITHDRAWS },
    matches: { ...SAMPLE_MATCHES }
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromLocalStorage();
    this.initFirebaseListeners();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.processedDeposits = parsed.processedDeposits || {};
        this.processedWithdraws = parsed.processedWithdraws || {};

        this.state = {
          settings: {
            ...INITIAL_SETTINGS,
            ...(parsed.settings || {}),
            paymentAccounts: {
              ...(INITIAL_SETTINGS.paymentAccounts || {}),
              ...(parsed.settings?.paymentAccounts || {})
            },
            noticePresets: parsed.settings?.noticePresets || DEFAULT_NOTICE_PRESETS,
            availableMaps: parsed.settings?.availableMaps || DEFAULT_MAPS,
            availableGames: parsed.settings?.availableGames || DEFAULT_GAMES,
            depositRejectReasons: parsed.settings?.depositRejectReasons || DEFAULT_DEPOSIT_REASONS,
            withdrawRejectReasons: parsed.settings?.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS
          },
          users: parsed.users && Object.keys(parsed.users).length ? parsed.users : { ...SAMPLE_USERS },
          deposits: parsed.deposits && Object.keys(parsed.deposits).length ? parsed.deposits : { ...SAMPLE_DEPOSITS },
          withdraws: parsed.withdraws && Object.keys(parsed.withdraws).length ? parsed.withdraws : { ...SAMPLE_WITHDRAWS },
          matches: parsed.matches && Object.keys(parsed.matches).length ? parsed.matches : { ...SAMPLE_MATCHES }
        };
      }
    } catch (e) {
      console.warn('Error loading local storage, using initial state:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        ...this.state,
        processedDeposits: this.processedDeposits,
        processedWithdraws: this.processedWithdraws
      }));
    } catch {
      // ignore storage quota errors
    }
  }

  private notify() {
    this.saveToLocalStorage();
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Database subscriber error:', err);
      }
    });
  }

  public subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private initFirebaseListeners() {
    if (!db) {
      this.useLocalMode = true;
      return;
    }

    try {
      // Monitor connection status
      const connectedRef = ref(db, '.info/connected');
      onValue(connectedRef, (snap) => {
        this.isFirebaseConnected = !!snap.val();
        this.notify();
      }, (err) => {
        console.warn('Firebase .info/connected listener:', err);
      });

      // Settings listener
      const settingsRef = ref(db, 'settings');
      onValue(settingsRef, (snap) => {
        const val = snap.val();
        if (val) {
          let paymentAccounts = val.paymentAccounts || this.state.settings.paymentAccounts;
          if (Array.isArray(paymentAccounts)) {
            const mapped: Record<string, PaymentAccount> = {};
            paymentAccounts.forEach((acc: PaymentAccount, idx: number) => {
              if (acc) mapped[acc.id || `acc_${idx}`] = acc;
            });
            paymentAccounts = mapped;
          }

          this.state = {
            ...this.state,
            settings: {
              ...this.state.settings,
              ...val,
              paymentAccounts: paymentAccounts || this.state.settings.paymentAccounts,
              noticePresets: val.noticePresets || this.state.settings.noticePresets || DEFAULT_NOTICE_PRESETS,
              availableMaps: val.availableMaps || this.state.settings.availableMaps || DEFAULT_MAPS,
              availableGames: val.availableGames || this.state.settings.availableGames || DEFAULT_GAMES,
              depositRejectReasons: val.depositRejectReasons || this.state.settings.depositRejectReasons || DEFAULT_DEPOSIT_REASONS,
              withdrawRejectReasons: val.withdrawRejectReasons || this.state.settings.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS
            }
          };
          this.isFirebaseAccessible = true;
          this.notify();
        }
      }, (err) => {
        this.handleFirebaseError('settings', err);
      });

      // Deposits listener
      const depositsRef = ref(db, 'deposits');
      onValue(depositsRef, (snap) => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          const formatted: Record<string, DepositRequest> = {};
          for (const key of Object.keys(val)) {
            const processed = this.processedDeposits[key];
            const serverRaw = val[key];
            const serverStatus = normalizeStatus(serverRaw?.status);

            // If locally processed, never allow it to revert to Pending
            const effectiveStatus = processed 
              ? processed.status 
              : serverStatus;

            formatted[key] = {
              id: key,
              ...serverRaw,
              status: effectiveStatus,
              amount: Number(serverRaw?.amount || 0)
            };
          }
          this.state = {
            ...this.state,
            deposits: formatted
          };
          this.isFirebaseAccessible = true;
          this.notify();
        }
      }, (err) => {
        this.handleFirebaseError('deposits', err);
      });

      // Withdraws listener
      const withdrawsRef = ref(db, 'withdraws');
      onValue(withdrawsRef, (snap) => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          const formatted: Record<string, WithdrawRequest> = {};
          for (const key of Object.keys(val)) {
            const processed = this.processedWithdraws[key];
            const serverRaw = val[key];
            const serverStatus = normalizeStatus(serverRaw?.status);

            const effectiveStatus = processed 
              ? processed.status 
              : serverStatus;

            formatted[key] = {
              id: key,
              ...serverRaw,
              status: effectiveStatus,
              amount: Number(serverRaw?.amount || 0)
            };
          }
          this.state = {
            ...this.state,
            withdraws: formatted
          };
          this.isFirebaseAccessible = true;
          this.notify();
        }
      }, (err) => {
        this.handleFirebaseError('withdraws', err);
      });

      // Matches listener
      const matchesRef = ref(db, 'matches');
      onValue(matchesRef, (snap) => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          const formatted: Record<string, TournamentMatch> = {};
          for (const key of Object.keys(val)) {
            formatted[key] = {
              id: key,
              ...val[key]
            };
          }
          this.state = {
            ...this.state,
            matches: formatted
          };
          this.isFirebaseAccessible = true;
          this.notify();
        }
      }, (err) => {
        this.handleFirebaseError('matches', err);
      });

      // Users listener
      const usersRef = ref(db, 'users');
      onValue(usersRef, (snap) => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          const formatted: Record<string, AppUser> = {};
          for (const key of Object.keys(val)) {
            formatted[key] = {
              id: key,
              ...val[key],
              balance: Number(val[key]?.balance || 0)
            };
          }
          this.state = {
            ...this.state,
            users: formatted
          };
          this.isFirebaseAccessible = true;
          this.notify();
        }
      }, (err) => {
        this.handleFirebaseError('users', err);
      });

    } catch (e) {
      console.warn('Firebase setup exception:', e);
      this.useLocalMode = true;
    }
  }

  private handleFirebaseError(node: string, err: unknown) {
    console.warn(`Firebase access note at /${node}:`, err);
    const msg = (err as { code?: string; message?: string })?.message || '';
    if (msg.includes('PERMISSION_DENIED') || (err as { code?: string })?.code === 'PERMISSION_DENIED') {
      this.permissionErrorOccurred = true;
      this.isFirebaseAccessible = false;
      this.useLocalMode = true;
      this.notify();
    }
  }

  public getStatus() {
    return {
      connected: this.isFirebaseConnected,
      accessible: this.isFirebaseAccessible && !this.permissionErrorOccurred,
      permissionError: this.permissionErrorOccurred,
      localMode: this.useLocalMode
    };
  }

  public toggleLocalMode() {
    this.useLocalMode = !this.useLocalMode;
    this.notify();
  }

  public getState() {
    return this.state;
  }

  // --- ACTIONS WITH IMMUTABLE STATE REPLACEMENT ---

  public async updateNotice(notice: string): Promise<boolean> {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        notice,
        noticeUpdatedAt: Date.now()
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, 'settings'), {
          notice,
          noticeUpdatedAt: Date.now()
        })
      ).catch(() => {});
    }
    return true;
  }

  public async updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...settings
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, 'settings'), settings)
      ).catch(() => {});
    }
    return true;
  }

  public async addOrUpdatePaymentAccount(account: PaymentAccount): Promise<boolean> {
    const newAccounts = {
      ...(this.state.settings.paymentAccounts || {}),
      [account.id]: {
        ...account,
        updatedAt: Date.now()
      }
    };

    const newSettings: AppSettings = {
      ...this.state.settings,
      paymentAccounts: newAccounts
    };

    if (account.isActive) {
      if (account.method === 'bKash') newSettings.bkashNumber = `${account.number} (${account.accountType})`;
      else if (account.method === 'Nagad') newSettings.nagadNumber = `${account.number} (${account.accountType})`;
      else if (account.method === 'Rocket') newSettings.rocketNumber = `${account.number} (${account.accountType})`;
      else if (account.method === 'Upay') newSettings.upayNumber = `${account.number} (${account.accountType})`;
    }

    this.state = {
      ...this.state,
      settings: newSettings
    };
    this.notify();

    if (db && !this.useLocalMode) {
      const payload: Record<string, unknown> = {
        paymentAccounts: newAccounts
      };
      if (newSettings.bkashNumber) payload.bkashNumber = newSettings.bkashNumber;
      if (newSettings.nagadNumber) payload.nagadNumber = newSettings.nagadNumber;
      if (newSettings.rocketNumber) payload.rocketNumber = newSettings.rocketNumber;
      if (newSettings.upayNumber) payload.upayNumber = newSettings.upayNumber;

      withTimeout(update(ref(db, 'settings'), payload)).catch(() => {});
    }
    return true;
  }

  public async deletePaymentAccount(accountId: string): Promise<boolean> {
    const newAccounts = { ...(this.state.settings.paymentAccounts || {}) };
    delete newAccounts[accountId];

    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        paymentAccounts: newAccounts
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(remove(ref(db, `settings/paymentAccounts/${accountId}`))).catch(() => {});
    }
    return true;
  }

  public async addNoticePreset(preset: NoticePreset): Promise<boolean> {
    const current = this.state.settings.noticePresets || [];
    const updated = [...current.filter(p => p.id !== preset.id), preset];
    return this.updateSettings({ noticePresets: updated });
  }

  public async deleteNoticePreset(presetId: string): Promise<boolean> {
    const current = this.state.settings.noticePresets || [];
    const updated = current.filter(p => p.id !== presetId);
    return this.updateSettings({ noticePresets: updated });
  }

  public async addCustomMap(mapName: string): Promise<boolean> {
    const trimmed = mapName.trim();
    if (!trimmed) return false;
    const current = this.state.settings.availableMaps || DEFAULT_MAPS;
    if (current.includes(trimmed)) return false;
    const updated = [...current, trimmed];
    return this.updateSettings({ availableMaps: updated });
  }

  public async deleteCustomMap(mapName: string): Promise<boolean> {
    const current = this.state.settings.availableMaps || DEFAULT_MAPS;
    const updated = current.filter(m => m !== mapName);
    return this.updateSettings({ availableMaps: updated });
  }

  public async addCustomGame(gameName: string): Promise<boolean> {
    const trimmed = gameName.trim();
    if (!trimmed) return false;
    const current = this.state.settings.availableGames || DEFAULT_GAMES;
    if (current.includes(trimmed)) return false;
    const updated = [...current, trimmed];
    return this.updateSettings({ availableGames: updated });
  }

  public async deleteCustomGame(gameName: string): Promise<boolean> {
    const current = this.state.settings.availableGames || DEFAULT_GAMES;
    const updated = current.filter(g => g !== gameName);
    return this.updateSettings({ availableGames: updated });
  }

  public async addRejectReason(type: 'deposit' | 'withdraw', reason: string): Promise<boolean> {
    const trimmed = reason.trim();
    if (!trimmed) return false;
    if (type === 'deposit') {
      const current = this.state.settings.depositRejectReasons || DEFAULT_DEPOSIT_REASONS;
      if (current.includes(trimmed)) return false;
      return this.updateSettings({ depositRejectReasons: [...current, trimmed] });
    } else {
      const current = this.state.settings.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS;
      if (current.includes(trimmed)) return false;
      return this.updateSettings({ withdrawRejectReasons: [...current, trimmed] });
    }
  }

  public async deleteRejectReason(type: 'deposit' | 'withdraw', reason: string): Promise<boolean> {
    if (type === 'deposit') {
      const current = this.state.settings.depositRejectReasons || DEFAULT_DEPOSIT_REASONS;
      return this.updateSettings({ depositRejectReasons: current.filter(r => r !== reason) });
    } else {
      const current = this.state.settings.withdrawRejectReasons || DEFAULT_WITHDRAW_REASONS;
      return this.updateSettings({ withdrawRejectReasons: current.filter(r => r !== reason) });
    }
  }

  // --- DEPOSIT APPROVAL & REJECTION (IMMEDIATE DISAPPEARANCE GUARANTEED) ---

  public async approveDeposit(depositId: string, userId: string, amount: number): Promise<boolean> {
    // Record as processed
    this.processedDeposits[depositId] = {
      status: 'Approved',
      timestamp: Date.now()
    };

    const existing = this.state.deposits[depositId];
    const newDeposits = { ...this.state.deposits };

    if (existing) {
      newDeposits[depositId] = {
        ...existing,
        status: 'Approved',
        reviewedAt: Date.now()
      };
    } else {
      newDeposits[depositId] = {
        id: depositId,
        userId,
        amount,
        trx: depositId,
        status: 'Approved',
        reviewedAt: Date.now()
      };
    }

    const user = this.state.users[userId] || {
      id: userId,
      balance: 0,
      name: `Player_${userId.slice(-4)}`,
      status: 'Active'
    };

    const newUsers = {
      ...this.state.users,
      [userId]: {
        ...user,
        balance: (user.balance || 0) + amount,
        totalDeposited: (user.totalDeposited || 0) + amount
      }
    };

    this.state = {
      ...this.state,
      deposits: newDeposits,
      users: newUsers
    };
    this.notify();

    // Firebase background sync: update status to Approved
    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, `deposits/${depositId}`), {
          status: 'Approved',
          reviewedAt: Date.now()
        })
      ).catch(() => {});

      withTimeout(
        runTransaction(ref(db, `users/${userId}/balance`), (currentBalance) => {
          return (currentBalance || 0) + amount;
        })
      ).catch(() => {
        try {
          update(ref(db, `users/${userId}`), {
            balance: newUsers[userId].balance
          });
        } catch {}
      });
    }
    return true;
  }

  public async rejectDeposit(depositId: string, reason?: string): Promise<boolean> {
    this.processedDeposits[depositId] = {
      status: 'Rejected',
      timestamp: Date.now()
    };

    const existing = this.state.deposits[depositId];
    const newDeposits = { ...this.state.deposits };

    if (existing) {
      newDeposits[depositId] = {
        ...existing,
        status: 'Rejected',
        note: reason || 'Rejected by Admin',
        reviewedAt: Date.now()
      };
    } else {
      newDeposits[depositId] = {
        id: depositId,
        userId: 'Unknown',
        amount: 0,
        trx: depositId,
        status: 'Rejected',
        note: reason || 'Rejected by Admin',
        reviewedAt: Date.now()
      };
    }

    this.state = {
      ...this.state,
      deposits: newDeposits
    };
    this.notify();

    // Firebase background sync: update status to Rejected
    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, `deposits/${depositId}`), {
          status: 'Rejected',
          note: reason || 'Rejected by Admin',
          reviewedAt: Date.now()
        })
      ).catch(() => {});
    }
    return true;
  }

  public async editDeposit(depositId: string, updates: Partial<DepositRequest>): Promise<boolean> {
    const existing = this.state.deposits[depositId];
    if (existing) {
      const newDeposits = {
        ...this.state.deposits,
        [depositId]: {
          ...existing,
          ...updates
        }
      };

      this.state = {
        ...this.state,
        deposits: newDeposits
      };
      this.notify();

      if (db && !this.useLocalMode) {
        withTimeout(update(ref(db, `deposits/${depositId}`), updates)).catch(() => {});
      }
    }
    return true;
  }

  public async deleteDeposit(depositId: string): Promise<boolean> {
    delete this.processedDeposits[depositId];
    const newDeposits = { ...this.state.deposits };
    delete newDeposits[depositId];

    this.state = {
      ...this.state,
      deposits: newDeposits
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(remove(ref(db, `deposits/${depositId}`))).catch(() => {});
    }
    return true;
  }

  public async clearCompletedDeposits(): Promise<boolean> {
    const newDeposits: Record<string, DepositRequest> = {};
    const toDeleteFirebase: string[] = [];

    for (const [id, d] of Object.entries(this.state.deposits)) {
      if (normalizeStatus(d.status) === 'Pending') {
        newDeposits[id] = d;
      } else {
        toDeleteFirebase.push(id);
      }
    }

    this.state = {
      ...this.state,
      deposits: newDeposits
    };
    this.notify();

    if (db && !this.useLocalMode) {
      toDeleteFirebase.forEach(id => {
        withTimeout(remove(ref(db, `deposits/${id}`))).catch(() => {});
      });
    }
    return true;
  }

  // --- WITHDRAWAL APPROVAL & REJECTION (EXACT SAME IMMEDIATE DISAPPEARANCE) ---

  public async approveWithdraw(withdrawId: string, userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    this.processedWithdraws[withdrawId] = {
      status: 'Approved',
      timestamp: Date.now()
    };

    const existing = this.state.withdraws[withdrawId];
    const newWithdraws = { ...this.state.withdraws };

    if (existing) {
      newWithdraws[withdrawId] = {
        ...existing,
        status: 'Approved',
        reviewedAt: Date.now()
      };
    } else {
      newWithdraws[withdrawId] = {
        id: withdrawId,
        userId,
        amount,
        account: 'User Account',
        status: 'Approved',
        reviewedAt: Date.now()
      };
    }

    const user = this.state.users[userId];
    let newUsers = this.state.users;
    if (user) {
      newUsers = {
        ...this.state.users,
        [userId]: {
          ...user,
          balance: Math.max(0, (user.balance || 0) - amount),
          totalWithdrawn: (user.totalWithdrawn || 0) + amount
        }
      };
    }

    this.state = {
      ...this.state,
      withdraws: newWithdraws,
      users: newUsers
    };
    this.notify();

    // Firebase background sync: update status to Approved
    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, `withdraws/${withdrawId}`), {
          status: 'Approved',
          reviewedAt: Date.now()
        })
      ).catch(() => {});

      withTimeout(
        runTransaction(ref(db, `users/${userId}/balance`), (currentBalance) => {
          return Math.max(0, (currentBalance || 0) - amount);
        })
      ).catch(() => {
        if (user) {
          try {
            update(ref(db, `users/${userId}`), { balance: newUsers[userId].balance });
          } catch {}
        }
      });
    }

    return { success: true };
  }

  public async rejectWithdraw(withdrawId: string, reason?: string, refundUser: boolean = true): Promise<boolean> {
    this.processedWithdraws[withdrawId] = {
      status: 'Rejected',
      timestamp: Date.now()
    };

    const existing = this.state.withdraws[withdrawId];
    const newWithdraws = { ...this.state.withdraws };

    let newUsers = this.state.users;
    if (existing && refundUser && existing.userId && this.state.users[existing.userId]) {
      const user = this.state.users[existing.userId];
      newUsers = {
        ...this.state.users,
        [existing.userId]: {
          ...user,
          balance: (user.balance || 0) + Number(existing.amount)
        }
      };
    }

    if (existing) {
      newWithdraws[withdrawId] = {
        ...existing,
        status: 'Rejected',
        note: reason || 'Rejected by Admin',
        reviewedAt: Date.now()
      };
    } else {
      newWithdraws[withdrawId] = {
        id: withdrawId,
        userId: 'Unknown',
        amount: 0,
        account: 'User Account',
        status: 'Rejected',
        note: reason || 'Rejected by Admin',
        reviewedAt: Date.now()
      };
    }

    this.state = {
      ...this.state,
      withdraws: newWithdraws,
      users: newUsers
    };
    this.notify();

    // Firebase background sync: update status to Rejected
    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, `withdraws/${withdrawId}`), {
          status: 'Rejected',
          note: reason || 'Rejected by Admin',
          reviewedAt: Date.now()
        })
      ).catch(() => {});

      if (refundUser && existing?.userId) {
        withTimeout(
          runTransaction(ref(db, `users/${existing.userId}/balance`), (curr) => (curr || 0) + Number(existing.amount))
        ).catch(() => {});
      }
    }
    return true;
  }

  public async editWithdraw(withdrawId: string, updates: Partial<WithdrawRequest>): Promise<boolean> {
    const existing = this.state.withdraws[withdrawId];
    if (existing) {
      this.state = {
        ...this.state,
        withdraws: {
          ...this.state.withdraws,
          [withdrawId]: {
            ...existing,
            ...updates
          }
        }
      };
      this.notify();

      if (db && !this.useLocalMode) {
        withTimeout(update(ref(db, `withdraws/${withdrawId}`), updates)).catch(() => {});
      }
    }
    return true;
  }

  public async deleteWithdraw(withdrawId: string): Promise<boolean> {
    delete this.processedWithdraws[withdrawId];
    const newWithdraws = { ...this.state.withdraws };
    delete newWithdraws[withdrawId];

    this.state = {
      ...this.state,
      withdraws: newWithdraws
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(remove(ref(db, `withdraws/${withdrawId}`))).catch(() => {});
    }
    return true;
  }

  public async clearCompletedWithdraws(): Promise<boolean> {
    const newWithdraws: Record<string, WithdrawRequest> = {};
    const toDeleteFirebase: string[] = [];

    for (const [id, w] of Object.entries(this.state.withdraws)) {
      if (normalizeStatus(w.status) === 'Pending') {
        newWithdraws[id] = w;
      } else {
        toDeleteFirebase.push(id);
      }
    }

    this.state = {
      ...this.state,
      withdraws: newWithdraws
    };
    this.notify();

    if (db && !this.useLocalMode) {
      toDeleteFirebase.forEach(id => {
        withTimeout(remove(ref(db, `withdraws/${id}`))).catch(() => {});
      });
    }
    return true;
  }

  // --- TOURNAMENTS WITH CUSTOM FIELDS SUPPORT ---

  public async addMatch(match: Omit<TournamentMatch, 'id'>): Promise<string> {
    const id = `match_${Date.now()}`;
    const newMatch: TournamentMatch = {
      id,
      ...match,
      createdAt: Date.now(),
      status: match.status || 'Upcoming',
      joinedCount: match.joinedCount || 0,
      customDetails: match.customDetails || [],
      customRules: match.customRules || '',
      customNotes: match.customNotes || '',
      deviceRequirement: match.deviceRequirement || 'Mobile Only'
    };

    this.state = {
      ...this.state,
      matches: {
        ...this.state.matches,
        [id]: newMatch
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(set(ref(db, `matches/${id}`), newMatch)).catch(() => {});
    }
    return id;
  }

  public async updateMatch(matchId: string, updates: Partial<TournamentMatch>): Promise<boolean> {
    const existing = this.state.matches[matchId];
    if (existing) {
      this.state = {
        ...this.state,
        matches: {
          ...this.state.matches,
          [matchId]: {
            ...existing,
            ...updates
          }
        }
      };
      this.notify();

      if (db && !this.useLocalMode) {
        withTimeout(update(ref(db, `matches/${matchId}`), updates)).catch(() => {});
      }
    }
    return true;
  }

  public async updateRoomCredentials(matchId: string, roomId: string, roomPass: string, isPublished: boolean = true): Promise<boolean> {
    return this.updateMatch(matchId, {
      roomId,
      roomPass,
      isRoomPublished: isPublished
    });
  }

  public async deleteMatch(matchId: string): Promise<boolean> {
    const newMatches = { ...this.state.matches };
    delete newMatches[matchId];

    this.state = {
      ...this.state,
      matches: newMatches
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(remove(ref(db, `matches/${matchId}`))).catch(() => {});
    }
    return true;
  }

  public async declareWinner(matchId: string, winnerName: string, prizeAmount: number, winnerUserId?: string): Promise<boolean> {
    const existing = this.state.matches[matchId];
    if (!existing) return false;

    let newUsers = this.state.users;
    if (winnerUserId && this.state.users[winnerUserId]) {
      const user = this.state.users[winnerUserId];
      newUsers = {
        ...this.state.users,
        [winnerUserId]: {
          ...user,
          balance: (user.balance || 0) + prizeAmount
        }
      };
    }

    this.state = {
      ...this.state,
      matches: {
        ...this.state.matches,
        [matchId]: {
          ...existing,
          winner: winnerName,
          status: 'Completed'
        }
      },
      users: newUsers
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(
        update(ref(db, `matches/${matchId}`), {
          winner: winnerName,
          status: 'Completed'
        })
      ).catch(() => {});

      if (winnerUserId) {
        withTimeout(
          runTransaction(ref(db, `users/${winnerUserId}/balance`), (curr) => (curr || 0) + prizeAmount)
        ).catch(() => {});
      }
    }
    return true;
  }

  // --- USER WALLET & MANAGEMENT ---

  public async adjustUserBalance(userId: string, amountDiff: number, reason: string): Promise<boolean> {
    const user = this.state.users[userId] || {
      id: userId,
      balance: 0,
      name: `Player_${userId.slice(-4)}`,
      status: 'Active'
    };

    const newBalance = Math.max(0, (user.balance || 0) + amountDiff);

    this.state = {
      ...this.state,
      users: {
        ...this.state.users,
        [userId]: {
          ...user,
          balance: newBalance
        }
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(
        runTransaction(ref(db, `users/${userId}/balance`), (curr) => Math.max(0, (curr || 0) + amountDiff))
      ).catch(() => {
        try {
          update(ref(db, `users/${userId}`), { balance: newBalance });
        } catch {}
      });
    }
    return true;
  }

  public async updateUserStatus(userId: string, status: 'Active' | 'Banned'): Promise<boolean> {
    const user = this.state.users[userId];
    if (user) {
      this.state = {
        ...this.state,
        users: {
          ...this.state.users,
          [userId]: {
            ...user,
            status
          }
        }
      };
      this.notify();

      if (db && !this.useLocalMode) {
        withTimeout(update(ref(db, `users/${userId}`), { status })).catch(() => {});
      }
    }
    return true;
  }

  // --- SIMULATION / TESTING HELPERS ---

  public async simulateUserDeposit(payload: {
    userId: string;
    amount: number;
    trx: string;
    method?: PaymentMethod;
    senderPhone?: string;
    note?: string;
  }): Promise<string> {
    const id = `dep_${Date.now()}`;
    const newDep: DepositRequest = {
      id,
      userId: payload.userId,
      amount: payload.amount,
      trx: payload.trx,
      method: payload.method || 'bKash',
      status: 'Pending',
      senderPhone: payload.senderPhone,
      note: payload.note || 'User Deposit',
      timestamp: Date.now()
    };

    this.state = {
      ...this.state,
      deposits: {
        ...this.state.deposits,
        [id]: newDep
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(set(ref(db, `deposits/${id}`), newDep)).catch(() => {});
    }
    return id;
  }

  public async simulateUserWithdraw(payload: {
    userId: string;
    amount: number;
    account: string;
    method?: PaymentMethod;
    note?: string;
  }): Promise<string> {
    const id = `with_${Date.now()}`;
    const newWith: WithdrawRequest = {
      id,
      userId: payload.userId,
      amount: payload.amount,
      account: payload.account,
      method: payload.method || 'bKash',
      status: 'Pending',
      note: payload.note || 'User Cashout',
      timestamp: Date.now()
    };

    this.state = {
      ...this.state,
      withdraws: {
        ...this.state.withdraws,
        [id]: newWith
      }
    };
    this.notify();

    if (db && !this.useLocalMode) {
      withTimeout(set(ref(db, `withdraws/${id}`), newWith)).catch(() => {});
    }
    return id;
  }

  public async createTestDeposit(userId: string, amount: number, method: any = 'bKash', trx?: string): Promise<string> {
    return this.simulateUserDeposit({
      userId,
      amount,
      trx: trx || `TRX${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      method
    });
  }

  public async createTestWithdraw(userId: string, amount: number, account: string, method: any = 'bKash'): Promise<string> {
    return this.simulateUserWithdraw({
      userId,
      amount,
      account,
      method
    });
  }

  public async syncToFirebase(): Promise<{ success: boolean; message: string }> {
    if (!db) {
      return { success: false, message: 'Firebase instance not initialized.' };
    }

    try {
      await withTimeout(
        update(ref(db), {
          settings: this.state.settings,
          users: this.state.users,
          deposits: this.state.deposits,
          withdraws: this.state.withdraws,
          matches: this.state.matches
        }),
        4000
      );
      this.isFirebaseConnected = true;
      this.isFirebaseAccessible = true;
      this.permissionErrorOccurred = false;
      this.useLocalMode = false;
      this.notify();
      return { success: true, message: 'Successfully seeded and synchronized all Team Aura records with Firebase RTDB!' };
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Permission denied or timeout';
      this.permissionErrorOccurred = true;
      return {
        success: false,
        message: `Firebase Sync Notice: ${msg}. Your database may require public rules or auth.`
      };
    }
  }

  public resetDataToSample() {
    this.processedDeposits = {};
    this.processedWithdraws = {};
    this.state = {
      settings: { ...INITIAL_SETTINGS },
      users: { ...SAMPLE_USERS },
      deposits: { ...SAMPLE_DEPOSITS },
      withdraws: { ...SAMPLE_WITHDRAWS },
      matches: { ...SAMPLE_MATCHES }
    };
    this.saveToLocalStorage();
    this.notify();
  }
}

export const dbService = new DatabaseService();
