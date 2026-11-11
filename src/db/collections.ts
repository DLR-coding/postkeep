import { and, countDistinct, desc, eq, isNull } from 'drizzle-orm';

import { db, newId } from './index';
import { collections, posts, postCollections, type Collection } from './schema';

// ponytail: pas de test automatisé — même limite que src/db/posts.ts (module
// natif expo-sqlite, non exécutable hors runtime Expo).

export async function createCollection(name: string): Promise<Collection> {
  const [collection] = await db.insert(collections).values({ id: newId(), name }).returning();
  return collection;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  await db.update(collections).set({ name }).where(eq(collections.id, id));
}

/** Suppression logique (ARCHITECTURE.md §4) — jamais de vrai DELETE. Les
 *  jointures existantes (`activePostsQuery`, `src/db/posts.ts`) filtrent déjà
 *  `collections.deletedAt IS NULL`, donc les posts rangés dedans ne changent
 *  pas de comportement ailleurs. */
export async function softDeleteCollection(id: string): Promise<void> {
  await db.update(collections).set({ deletedAt: new Date() }).where(eq(collections.id, id));
}

export type CollectionWithCount = Collection & { postCount: number };

/** Requête réactive : collections actives avec leur nombre de posts actifs
 *  (grille de tuiles, phase 4). */
export function activeCollectionsQuery() {
  return db
    .select({ collection: collections, postCount: countDistinct(posts.id) })
    .from(collections)
    .leftJoin(
      postCollections,
      and(eq(postCollections.collectionId, collections.id), isNull(postCollections.deletedAt))
    )
    .leftJoin(posts, and(eq(posts.id, postCollections.postId), isNull(posts.deletedAt)))
    .where(isNull(collections.deletedAt))
    .groupBy(collections.id)
    .orderBy(collections.name);
}

export function groupCollectionRows(
  rows: { collection: Collection; postCount: number }[]
): CollectionWithCount[] {
  return rows.map((row) => ({ ...row.collection, postCount: row.postCount }));
}

/** Lignes post × collection pour les aperçus de dossiers (`buildCollectionPreviews`,
 *  `src/lib/collection-previews.ts`). `.from(posts)` : `useLiveQuery` n'écoute que la
 *  table racine (cf. `src/db/posts.ts`), donc un changement de miniature rafraîchit.
 *  `collectionId` nul = lien vers une collection supprimée ou aucun lien ;
 *  `buildCollectionPreviews` ignore la ligne nulle d'un post qui a une autre collection
 *  active. Le compteur de `uncategorizedPostsCountQuery` peut différer d'un post dont
 *  toutes les collections sont supprimées (il ne regarde que `post_collections`). */
export function collectionPreviewRowsQuery() {
  return db
    .select({
      collectionId: collections.id,
      postId: posts.id,
      url: posts.url,
      thumbnailUrl: posts.thumbnailUrl,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .leftJoin(
      postCollections,
      and(eq(postCollections.postId, posts.id), isNull(postCollections.deletedAt))
    )
    .leftJoin(
      collections,
      and(eq(collections.id, postCollections.collectionId), isNull(collections.deletedAt))
    )
    .where(isNull(posts.deletedAt))
    .orderBy(desc(posts.updatedAt));
}

/** Nombre de posts actifs n'appartenant à aucune collection active — pseudo-
 *  dossier « Sans collection », virtuel : aucune ligne en base (TODO.md
 *  Phase 4). */
export function uncategorizedPostsCountQuery() {
  return db
    .select({ count: countDistinct(posts.id) })
    .from(posts)
    .leftJoin(
      postCollections,
      and(eq(postCollections.postId, posts.id), isNull(postCollections.deletedAt))
    )
    .where(and(isNull(posts.deletedAt), isNull(postCollections.id)));
}
