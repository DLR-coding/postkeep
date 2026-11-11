/** Ligne d'état de la synchro dans les paramètres : « Syncing… », le message d'erreur, ou
 *  « Synced 2 min ago ». Logique pure, testée par `sync-status.test.ts`. */
export function formatSyncedAgo(syncedAt: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - syncedAt) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function syncStatusLabel(
  state: { status: 'idle' | 'syncing' | 'error'; lastSyncedAt: number | null; error: string | null },
  now: number = Date.now()
): string {
  if (state.status === 'syncing') return 'Syncing…';
  if (state.status === 'error') return state.error ?? "Couldn't sync";
  return state.lastSyncedAt === null ? 'Not synced yet' : `Synced ${formatSyncedAgo(state.lastSyncedAt, now)}`;
}
