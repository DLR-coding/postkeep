import { and, eq, getTableColumns, gte, sql, type SQL } from 'drizzle-orm';
import Storage from 'expo-sqlite/kv-store';

import { db } from '@/db';
import { collections, postCollections, posts } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import { useAccountStore } from '@/stores/account-store';

import { fromRemote, nextCursor, planGuestMerge, syncErrorMessage, toRemote, type PullCursor, type SyncTable } from './logic';

/**
 * Moteur de synchro (spec 2026-11-11, objectifs 3 à 5) : push puis pull, une exécution à
 * la fois. Les décisions sont dans `logic.ts` ; ici, seulement les I/O.
 *
 * Marque de push = heure locale au début du dernier push réussi (et non le plus grand
 * `updated_at` envoyé) : une ligne reçue d'un appareil à l'horloge en avance porterait
 * la marque dans le futur, et les modifications locales suivantes ne partiraient plus.
 */

const PAGE = 500;
// Ordre imposé par les clés étrangères du serveur : collections et posts avant les rangements.
const TABLES = { collections, posts, post_collections: postCollections } as const;
const ORDER: SyncTable[] = ['collections', 'posts', 'post_collections'];

const key = (uid: string, name: string) => `sync:${uid}:${name}`;

/** Lignes créées sans compte, ou pendant la session (les écritures locales ne posent pas
 *  `user_id`) : rattachées au compte, en SQL brut pour garder la main sur `updated_at`. */
function attachGuestRows(uid: string): void {
  const now = Date.now();
  db.transaction((tx) => {
    // Pierres tombales comprises : un rangement actif peut pointer vers une collection
    // invitée supprimée, et le serveur refuserait le rangement sans elle (clé étrangère).
    for (const name of ORDER) {
      tx.run(sql`UPDATE ${TABLES[name]} SET user_id = ${uid}, updated_at = ${now} WHERE user_id IS NULL`);
    }
  });
}

export async function push(uid: string): Promise<void> {
  attachGuestRows(uid);
  const mark = Number(Storage.getItemSync(key(uid, 'push')) ?? 0);
  // `>=` et marque prise avant les lectures : une écriture dans la même milliseconde que
  // la lecture repart au push suivant au lieu d'être perdue (le serveur ignore le doublon).
  const start = Date.now();
  for (const name of ORDER) {
    const table = TABLES[name];
    const rows = db
      .select()
      .from(table)
      .where(and(eq(table.userId, uid), gte(table.updatedAt, new Date(mark))))
      .all();
    for (let i = 0; i < rows.length; i += PAGE) {
      const chunk = rows.slice(i, i + PAGE).map((row) => toRemote(name, row, uid));
      // Une ligne refusée par le trigger « dernière écriture gagnante » n'est pas une erreur.
      const { error } = await supabase.from(name).upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
    }
  }
  Storage.setItemSync(key(uid, 'push'), String(start));
}

/** Insère ou remplace une ligne reçue, seulement si elle est plus récente que la locale. */
function applyRemoteRows(name: SyncTable, rows: Record<string, string | number | null>[]): number {
  // Une seule forme de table pour Drizzle : les trois partagent `id` et `updated_at`.
  const table = TABLES[name] as typeof posts;
  // `updated_at` fourni explicitement : sinon `$onUpdate` de Drizzle le remplacerait.
  const set = Object.fromEntries(
    Object.entries(getTableColumns(table))
      .filter(([field]) => field !== 'id')
      .map(([field, column]) => [field, sql.raw(`excluded."${column.name}"`)])
  );
  let changes = 0;
  db.transaction((tx) => {
    for (const row of rows) {
      changes += tx
        .insert(table)
        .values(fromRemote(name, row) as typeof posts.$inferInsert)
        .onConflictDoUpdate({ target: table.id, set, setWhere: sql`excluded.updated_at > ${table.updatedAt}` })
        .run().changes;
    }
  });
  return changes;
}

export async function pull(uid: string): Promise<void> {
  let changed = 0;
  for (const name of ORDER) {
    const cursorKey = key(uid, `pull:${name}`);
    let cursor = JSON.parse(Storage.getItemSync(cursorKey) ?? 'null') as PullCursor | null;
    for (;;) {
      // shortcut: deux transactions serveur qui se croisent peuvent faire manquer une ligne
      // au curseur (validée après une plus récente), négligeable à un utilisateur ; passer à
      // un curseur avec chevauchement si une ligne manquante est constatée.
      let query = supabase.from(name).select().eq('user_id', uid);
      if (cursor) {
        query = query.or(
          `server_updated_at.gt."${cursor.ts}",and(server_updated_at.eq."${cursor.ts}",id.gt."${cursor.id}")`
        );
      }
      const { data, error } = await query.order('server_updated_at').order('id').limit(PAGE);
      if (error) throw error;
      changed += applyRemoteRows(name, data);
      cursor = nextCursor(data);
      if (!cursor) break;
      Storage.setItemSync(cursorKey, JSON.stringify(cursor));
      if (data.length < PAGE) break;
    }
  }
  if (changed > 0) {
    // `useLiveQuery` n'écoute que la table racine de sa requête : un rangement reçu seul ne
    // rafraîchirait ni les listes de posts ni les compteurs de collections. Une ligne
    // réécrite à l'identique suffit à notifier chaque table, sans toucher `updated_at`
    // (donc sans push).
    db.run(sql`UPDATE posts SET url = url WHERE id IN (SELECT id FROM posts LIMIT 1)`);
    db.run(sql`UPDATE collections SET name = name WHERE id IN (SELECT id FROM collections LIMIT 1)`);
  }
}

/** Fusion des doublons invités dans le compte, après le premier pull (objectif 5). */
function mergeGuestRows(uid: string): void {
  // Condition sans nom de table : valable telle quelle sur les trois.
  const read = (owner: SQL) => ({
    collections: db.select().from(collections).where(owner).all(),
    posts: db.select().from(posts).where(owner).all(),
    postCollections: db.select().from(postCollections).where(owner).all(),
  });
  const plan = planGuestMerge({ guest: read(sql`user_id IS NULL`), account: read(sql`user_id = ${uid}`) });
  const now = new Date();
  db.transaction((tx) => {
    for (const { table, id } of plan.softDelete) {
      const target = TABLES[table] as typeof posts;
      tx.update(target).set({ deletedAt: now, updatedAt: now }).where(eq(target.id, id)).run();
    }
    for (const { id, postId, collectionId } of plan.remap) {
      tx.update(postCollections).set({ postId, collectionId, updatedAt: now }).where(eq(postCollections.id, id)).run();
    }
    for (const { postId, note } of plan.notes) {
      tx.update(posts).set({ note, updatedAt: now }).where(eq(posts.id, postId)).run();
    }
  });
}

async function syncOnce(uid: string): Promise<void> {
  if (Storage.getItemSync(key(uid, 'bootstrapped'))) {
    await push(uid);
    await pull(uid);
    return;
  }
  // Première synchro de ce compte sur l'appareil : les lignes du compte arrivent avant la
  // fusion. Marque posée avant le pull pour ne pas renvoyer tout ce qui vient d'arriver ;
  // les lignes invitées repartent quand même, le rattachement les date de maintenant.
  if (!Storage.getItemSync(key(uid, 'push'))) Storage.setItemSync(key(uid, 'push'), String(Date.now()));
  await pull(uid);
  mergeGuestRows(uid);
  await push(uid);
  Storage.setItemSync(key(uid, 'bootstrapped'), '1');
}

let running: Promise<boolean> | null = null;
let rerun = false;

/**
 * Synchro du compte connecté. Une demande pendant une synchro en relance une après
 * (sans en lancer deux à la fois). Résout `true` si la dernière exécution a réussi ;
 * l'échec n'est jamais levé, il est dans `account-store` (`status: 'error'`).
 */
export function sync(): Promise<boolean> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    let ok = true;
    do {
      rerun = false;
      const uid = useAccountStore.getState().userId;
      if (!uid) return true;
      useAccountStore.setState({ status: 'syncing', error: null });
      try {
        await syncOnce(uid);
        ok = true;
        useAccountStore.setState({ status: 'idle', lastSyncedAt: Date.now() });
      } catch (error) {
        ok = false;
        useAccountStore.setState({ status: 'error', error: syncErrorMessage(error) });
      }
    } while (rerun);
    return ok;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Attend la fin de la synchro en cours, sans en demander une. */
export async function whenIdle(): Promise<void> {
  await running;
}

/**
 * Y a-t-il quelque chose à pousser ? Filtre l'écouteur de la base : les écritures du pull
 * lui-même (lignes reçues, plus anciennes que la marque) ne relancent pas de synchro.
 * Une ligne reçue plus récente que la marque en relance une seule, qui la renvoie (le
 * serveur l'ignore) et ne reçoit rien : ça converge, sans boucle.
 */
export function hasLocalChanges(uid: string): boolean {
  const mark = Number(Storage.getItemSync(key(uid, 'push')) ?? 0);
  return ORDER.some(
    (name) =>
      db.get(
        sql`SELECT 1 FROM ${TABLES[name]} WHERE user_id IS NULL OR (user_id = ${uid} AND updated_at >= ${mark}) LIMIT 1`
      ) != null
  );
}

/** Oublie marques et curseurs du compte (déconnexion, suppression). */
export function forgetSyncState(uid: string): void {
  for (const name of Storage.getAllKeysSync()) {
    if (name.startsWith(key(uid, ''))) Storage.removeItemSync(name);
  }
}
