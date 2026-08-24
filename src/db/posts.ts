import { and, eq, isNull } from 'drizzle-orm';

import { db, newId } from './index';
import { posts, postCollections, type Post } from './schema';

// ponytail: pas de test automatisé — nécessite une vraie base expo-sqlite (module
// natif), non exécutable en dehors du runtime Expo. Validé sur appareil (TODO.md,
// tâche « valider sur appareil »).

/** Retrouve un post existant (non supprimé) par son URL déjà normalisée, pour le
 *  rouvrir en édition plutôt que le dupliquer (ARCHITECTURE.md §4). */
export async function findPostByUrl(url: string): Promise<Post | null> {
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.url, url), isNull(posts.deletedAt)))
    .limit(1);
  return post ?? null;
}

/** Collections actives d'un post — sert à préremplir la sélection à la réouverture. */
export async function findPostCollectionIds(postId: string): Promise<string[]> {
  const rows = await db
    .select({ collectionId: postCollections.collectionId })
    .from(postCollections)
    .where(and(eq(postCollections.postId, postId), isNull(postCollections.deletedAt)));
  return rows.map((row) => row.collectionId);
}

export type SavePostInput = {
  /** Présent = post existant rouvert en édition ; absent = nouveau post. */
  id?: string;
  url: string | null;
  note: string | null;
  collectionIds: string[];
};

/**
 * Upsert du post puis diff des rangements `post_collections` (ARCHITECTURE.md §4) :
 * une collection cochée et absente s'insère (ou ressuscite si une ligne supprimée
 * existe déjà pour cette paire), une collection décochée mais présente se marque
 * `deleted_at` — jamais de vrai DELETE, jamais de doublon de ligne.
 *
 * ponytail: le driver expo-sqlite exécute les transactions en synchrone (pas de
 * `await` dans le callback, `.all()`/`.run()` à la place) — vérifié dans le code
 * source du driver, `await` y serait un no-op silencieux.
 */
export function savePost(input: SavePostInput): string {
  return db.transaction((tx) => {
    let postId = input.id;
    if (postId) {
      tx.update(posts).set({ url: input.url, note: input.note }).where(eq(posts.id, postId)).run();
    } else {
      postId = newId();
      tx.insert(posts).values({ id: postId, url: input.url, note: input.note }).run();
    }

    const existingRows = tx.select().from(postCollections).where(eq(postCollections.postId, postId)).all();
    const wanted = new Set(input.collectionIds);

    for (const row of existingRows) {
      const shouldBeActive = wanted.has(row.collectionId);
      if (shouldBeActive && row.deletedAt) {
        tx.update(postCollections).set({ deletedAt: null }).where(eq(postCollections.id, row.id)).run();
      } else if (!shouldBeActive && !row.deletedAt) {
        tx.update(postCollections)
          .set({ deletedAt: new Date() })
          .where(eq(postCollections.id, row.id))
          .run();
      }
    }

    const existingCollectionIds = new Set(existingRows.map((row) => row.collectionId));
    for (const collectionId of wanted) {
      if (!existingCollectionIds.has(collectionId)) {
        tx.insert(postCollections).values({ id: newId(), postId, collectionId }).run();
      }
    }

    return postId;
  });
}
