/**
 * Logique pure de la synchro (comptes et synchro, tâche 3) : conversion des lignes
 * local ↔ Supabase, dernière écriture gagnante, curseur de pull et plan de fusion des
 * données invitées à la connexion. Aucune I/O, testée par `logic.test.ts` ; le moteur
 * (`engine.ts`) applique ces décisions.
 */

// `import type` uniquement : effacé à l'exécution, Node ne charge pas drizzle.
import type { Collection, Post, PostCollection } from '../../db/schema.ts';

export type SyncTable = 'collections' | 'posts' | 'post_collections';

type LocalRows = { collections: Collection; posts: Post; post_collections: PostCollection };

/** Ligne côté Supabase : colonnes snake_case, dates en ms, `user_id` uuid. */
export type RemoteRow = Record<string, string | number | null>;

const BASE_COLUMNS = ['id', 'createdAt', 'updatedAt', 'deletedAt'];
const COLUMNS: Record<SyncTable, string[]> = {
  collections: ['name'],
  posts: ['url', 'note', 'caption', 'thumbnailUrl', 'openedAt'],
  post_collections: ['postId', 'collectionId'],
};
const DATE_COLUMNS = new Set(['createdAt', 'updatedAt', 'deletedAt', 'openedAt']);

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function toRemote<T extends SyncTable>(table: T, row: LocalRows[T], userId: string): RemoteRow {
  const local = row as unknown as Record<string, Date | string | null>;
  const remote: RemoteRow = { user_id: userId };
  for (const key of [...BASE_COLUMNS, ...COLUMNS[table]]) {
    const value = local[key];
    remote[snake(key)] = value instanceof Date ? value.getTime() : value;
  }
  return remote;
}

/** `server_updated_at` n'est pas copié : il ne sert qu'au curseur. */
export function fromRemote<T extends SyncTable>(table: T, row: RemoteRow): LocalRows[T] {
  const local: Record<string, Date | string | number | null> = { userId: row.user_id as string };
  for (const key of [...BASE_COLUMNS, ...COLUMNS[table]]) {
    const value = row[snake(key)] ?? null;
    local[key] = DATE_COLUMNS.has(key) && value !== null ? new Date(value) : value;
  }
  return local as unknown as LocalRows[T];
}

/** Dernière écriture gagnante : à égalité, la ligne locale reste. */
export function isNewer(incomingUpdatedAtMs: number, localUpdatedAtMs: number | undefined): boolean {
  return localUpdatedAtMs === undefined || incomingUpdatedAtMs > localUpdatedAtMs;
}

export type PullCursor = { ts: string; id: string };

/** `ts` reste la chaîne du serveur : un `Date` JS perdrait les microsecondes. */
export function nextCursor(page: { server_updated_at: string; id: string }[]): PullCursor | null {
  const last = page.at(-1);
  return last ? { ts: last.server_updated_at, id: last.id } : null;
}

export type MergeRows = { collections: Collection[]; posts: Post[]; postCollections: PostCollection[] };

export type GuestMergePlan = {
  /** Lignes invitées à passer en `deleted_at` (fusionnées ou rangement en double). */
  softDelete: { table: SyncTable; id: string }[];
  /** Rangements invités à repointer vers le post et/ou la collection du compte. */
  remap: { id: string; postId: string; collectionId: string }[];
  /** Notes finales des posts du compte qui ont reçu une note invitée. */
  notes: { postId: string; note: string }[];
};

const nameKey = (name: string) => name.trim().toLowerCase();

/**
 * Fusion des données invitées dans le compte, après le premier pull. Seules les lignes
 * actives comptent ; le rattachement (`user_id`) n'est pas dans le plan, il concerne
 * toutes les lignes invitées.
 */
export function planGuestMerge({ guest, account }: { guest: MergeRows; account: MergeRows }): GuestMergePlan {
  const plan: GuestMergePlan = { softDelete: [], remap: [], notes: [] };

  const accountCollectionByName = new Map<string, string>();
  for (const c of account.collections) {
    if (!c.deletedAt && !accountCollectionByName.has(nameKey(c.name))) {
      accountCollectionByName.set(nameKey(c.name), c.id);
    }
  }
  const collectionTarget = new Map<string, string>();
  for (const c of guest.collections) {
    const target = c.deletedAt ? undefined : accountCollectionByName.get(nameKey(c.name));
    if (target) {
      collectionTarget.set(c.id, target);
      plan.softDelete.push({ table: 'collections', id: c.id });
    }
  }

  const accountPostByUrl = new Map<string, Post>();
  for (const p of account.posts) {
    if (!p.deletedAt && p.url && !accountPostByUrl.has(p.url)) accountPostByUrl.set(p.url, p);
  }
  const postTarget = new Map<string, string>();
  const notes = new Map<string, string>();
  for (const p of guest.posts) {
    const target = p.deletedAt || !p.url ? undefined : accountPostByUrl.get(p.url);
    if (!target) continue;
    postTarget.set(p.id, target.id);
    plan.softDelete.push({ table: 'posts', id: p.id });
    const guestNote = p.note?.trim();
    const current = notes.get(target.id) ?? target.note ?? '';
    if (guestNote && guestNote !== current.trim()) {
      notes.set(target.id, current.trim() ? `${current}\n\n${guestNote}` : guestNote);
    }
  }
  plan.notes = [...notes].map(([postId, note]) => ({ postId, note }));

  // Paires actives déjà occupées : un rangement remappé dessus ferait doublon.
  const pairKey = (postId: string, collectionId: string) => `${postId}|${collectionId}`;
  const taken = new Set(
    account.postCollections.filter((pc) => !pc.deletedAt).map((pc) => pairKey(pc.postId, pc.collectionId))
  );
  for (const pc of guest.postCollections) {
    if (pc.deletedAt) continue;
    const postId = postTarget.get(pc.postId) ?? pc.postId;
    const collectionId = collectionTarget.get(pc.collectionId) ?? pc.collectionId;
    const key = pairKey(postId, collectionId);
    if (taken.has(key)) {
      plan.softDelete.push({ table: 'post_collections', id: pc.id });
      continue;
    }
    taken.add(key);
    if (postId !== pc.postId || collectionId !== pc.collectionId) {
      plan.remap.push({ id: pc.id, postId, collectionId });
    }
  }

  return plan;
}

type ErrorLike = { name?: string; message?: string; code?: string } | null | undefined;

/** Erreur réseau : `fetch` de React Native (« Network request failed »), relayée telle
 *  quelle par PostgREST, ou `AuthRetryableFetchError` côté authentification. */
function isOffline(error: ErrorLike): boolean {
  return error?.name === 'AuthRetryableFetchError' || /network request failed/i.test(error?.message ?? '');
}

const OFFLINE = 'No internet connection.';

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  user_already_exists: 'An account already exists with this email.',
  email_exists: 'An account already exists with this email.',
  weak_password: 'Password must be at least 8 characters.',
  email_address_invalid: 'Enter a valid email address.',
  validation_failed: 'Enter a valid email address.',
  over_request_rate_limit: 'Too many attempts. Try again in a few minutes.',
};

/** Message en anglais, affichable tel quel, pour une erreur de connexion/inscription. */
export function authErrorMessage(error: unknown): string {
  const e = error as ErrorLike;
  if (isOffline(e)) return OFFLINE;
  return AUTH_MESSAGES[e?.code ?? ''] ?? e?.message ?? 'Something went wrong. Try again.';
}

/** Message d'état de synchro (paramètres) ; la synchro réessaie au prochain déclencheur. */
export function syncErrorMessage(error: unknown): string {
  const e = error as ErrorLike;
  if (isOffline(e)) return "Offline — changes will sync when you're back online.";
  return `Sync failed: ${e?.message ?? 'unknown error'}`;
}
