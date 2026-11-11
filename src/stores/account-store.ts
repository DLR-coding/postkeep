import { create } from 'zustand';

/** État d'interface du compte et de la synchro (Zustand = état d'interface seulement,
 *  AGENTS.md). La session elle-même est persistée par le client Supabase dans le
 *  kv-store d'expo-sqlite ; ce store n'en est que le reflet pour les écrans. */
export type SyncStatus = 'idle' | 'syncing' | 'error';

type AccountState = {
  userId: string | null;
  email: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
};

export const useAccountStore = create<AccountState>(() => ({
  userId: null,
  email: null,
  status: 'idle',
  lastSyncedAt: null,
  error: null,
}));
