import { create } from 'zustand';

/** État d'interface du compte et de la synchro (Zustand = état d'interface seulement,
 *  AGENTS.md). La session elle-même est persistée par le client Supabase dans le
 *  kv-store d'expo-sqlite ; ce store n'en est que le reflet pour les écrans. */
export type SyncStatus = 'idle' | 'syncing' | 'error';

type AccountState = {
  /** Vrai dès que Supabase a lu la session enregistrée (connecté ou non) : avant, `userId`
   *  nul ne veut pas dire « pas de compte ». La barrière du compte (`_layout.tsx`) l'attend. */
  authReady: boolean;
  userId: string | null;
  email: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
};

export const useAccountStore = create<AccountState>(() => ({
  authReady: false,
  userId: null,
  email: null,
  status: 'idle',
  lastSyncedAt: null,
  error: null,
}));
