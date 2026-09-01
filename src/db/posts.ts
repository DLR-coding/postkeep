import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db, newId } from './index';
import { collections, posts, postCollections, type Post } from './schema';

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

export type PostListItem = Post & { collectionNames: string[] };
export type PostRow = { post: Post; collectionName: string | null };

/** Requête réactive (à passer à `useLiveQuery`, ARCHITECTURE.md §5) : posts non
 *  supprimés jointes à leurs collections actives, du plus récemment modifié au
 *  plus ancien — une ligne par paire post/collection, à regrouper avec
 *  `groupPostRows` pour l'écran « Tous les posts » (phase 3). */
export function activePostsQuery() {
  return db
    .select({ post: posts, collectionName: collections.name })
    .from(posts)
    .leftJoin(
      postCollections,
      and(eq(postCollections.postId, posts.id), isNull(postCollections.deletedAt))
    )
    .leftJoin(collections, and(eq(collections.id, postCollections.collectionId), isNull(collections.deletedAt)))
    .where(isNull(posts.deletedAt))
    .orderBy(desc(posts.updatedAt));
}

/** Même requête que `activePostsQuery`, restreinte aux posts rangés dans une
 *  collection donnée — pour l'écran de collection (phase 4). Les badges
 *  affichés listent toutes les collections du post (comme partout ailleurs),
 *  pas seulement celle de l'écran : le filtre ne porte que sur l'appartenance,
 *  via une sous-requête sur les ids de post. */
export function collectionPostsQuery(collectionId: string) {
  return db
    .select({ post: posts, collectionName: collections.name })
    .from(posts)
    .leftJoin(
      postCollections,
      and(eq(postCollections.postId, posts.id), isNull(postCollections.deletedAt))
    )
    .leftJoin(collections, and(eq(collections.id, postCollections.collectionId), isNull(collections.deletedAt)))
    .where(
      and(
        isNull(posts.deletedAt),
        inArray(
          posts.id,
          db
            .select({ id: postCollections.postId })
            .from(postCollections)
            .where(and(eq(postCollections.collectionId, collectionId), isNull(postCollections.deletedAt)))
        )
      )
    )
    .orderBy(desc(posts.updatedAt));
}

/** Même requête que `activePostsQuery`, restreinte aux posts n'appartenant à
 *  aucune collection active — pseudo-dossier « Sans collection » (phase 4).
 *  `postCollections.id IS NULL` après la jointure signifie qu'aucune ligne de
 *  rangement active n'existe pour ce post. */
export function uncategorizedPostsQuery() {
  return db
    .select({ post: posts, collectionName: collections.name })
    .from(posts)
    .leftJoin(
      postCollections,
      and(eq(postCollections.postId, posts.id), isNull(postCollections.deletedAt))
    )
    .leftJoin(collections, and(eq(collections.id, postCollections.collectionId), isNull(collections.deletedAt)))
    .where(and(isNull(posts.deletedAt), isNull(postCollections.id)))
    .orderBy(desc(posts.updatedAt));
}

/** Même requête que `activePostsQuery`, restreinte à un post — pour la feuille de
 *  détail (phase 3) ouverte au tap d'une carte. */
export function postByIdQuery(postId: string) {
  return db
    .select({ post: posts, collectionName: collections.name })
    .from(posts)
    .leftJoin(
      postCollections,
      and(eq(postCollections.postId, posts.id), isNull(postCollections.deletedAt))
    )
    .leftJoin(collections, and(eq(collections.id, postCollections.collectionId), isNull(collections.deletedAt)))
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
}

/** Ids des collections actives d'un post — variante réactive de
 *  `findPostCollectionIds`, pour préremplir les cases à cocher en mode édition
 *  de la feuille de détail. */
export function postCollectionIdsQuery(postId: string) {
  return db
    .select({ collectionId: postCollections.collectionId })
    .from(postCollections)
    .where(and(eq(postCollections.postId, postId), isNull(postCollections.deletedAt)));
}

export function groupPostRows(rows: PostRow[]): PostListItem[] {
  const byId = new Map<string, PostListItem>();
  for (const row of rows) {
    let item = byId.get(row.post.id);
    if (!item) {
      item = { ...row.post, collectionNames: [] };
      byId.set(row.post.id, item);
    }
    if (row.collectionName) item.collectionNames.push(row.collectionName);
  }
  return [...byId.values()];
}

/** Marque un post comme ouvert (première fois qu'il est lancé via Linking.openURL). */
export async function markPostOpened(postId: string): Promise<void> {
  await db.update(posts).set({ openedAt: new Date() }).where(eq(posts.id, postId));
}

/**
 * Suppression logique (ARCHITECTURE.md §4) — jamais de vrai DELETE.
 *
 * Même limite de `useLiveQuery` que `removePostFromCollection`/`savePost` ci-dessous :
 * le compteur de posts par collection (`activeCollectionsQuery`, `.from(collections)`,
 * `src/db/collections.ts`) ne réagit pas à ce changement sur `posts` seul — un post
 * supprimé peut appartenir à plusieurs collections, dont le compteur doit baisser. On
 * touche `collections.updated_at` pour chacune de ses collections actives.
 *
 * ponytail: driver expo-sqlite synchrone dans une transaction (`.run()`, pas `await`)
 * — même piège documenté sur `savePost`.
 */
export function softDeletePost(postId: string): void {
  db.transaction((tx) => {
    tx.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postId)).run();

    const affectedCollectionIds = tx
      .select({ collectionId: postCollections.collectionId })
      .from(postCollections)
      .where(and(eq(postCollections.postId, postId), isNull(postCollections.deletedAt)))
      .all()
      .map((row) => row.collectionId);

    if (affectedCollectionIds.length > 0) {
      tx.update(collections)
        .set({ updatedAt: new Date() })
        .where(inArray(collections.id, affectedCollectionIds))
        .run();
    }
  });
}

/**
 * Retire un post d'une collection sans le supprimer (balayage depuis une vue
 * collection, phase 3 « Suppression logique ») — même mécanique que le diff de
 * `savePost` : `deleted_at` sur la ligne `post_collections`, jamais de vrai DELETE.
 *
 * `useLiveQuery` (drizzle-orm/expo-sqlite) n'écoute que la table du `.from()`
 * racine d'une requête (`node_modules/drizzle-orm/expo-sqlite/query.js`) — un
 * changement isolé sur `post_collections` ne rafraîchit ni les listes de posts
 * (`.from(posts)`) ni le compteur de posts par collection (`activeCollectionsQuery`,
 * `.from(collections)`, `src/db/collections.ts`). On touche `posts.updated_at` et
 * `collections.updated_at` pour déclencher les deux — `savePost` satisfait déjà
 * la première contrainte par hasard (il écrit toujours sur `posts`), ici il faut
 * le faire explicitement pour les deux tables.
 *
 * ponytail: driver expo-sqlite synchrone dans une transaction (`.run()`, pas
 * `await`) — même piège documenté sur `savePost`.
 */
export function removePostFromCollection(postId: string, collectionId: string): void {
  db.transaction((tx) => {
    tx.update(postCollections)
      .set({ deletedAt: new Date() })
      .where(and(eq(postCollections.postId, postId), eq(postCollections.collectionId, collectionId)))
      .run();
    tx.update(posts).set({ updatedAt: new Date() }).where(eq(posts.id, postId)).run();
    tx.update(collections).set({ updatedAt: new Date() }).where(eq(collections.id, collectionId)).run();
  });
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
    const changedCollectionIds = new Set<string>();

    for (const row of existingRows) {
      const shouldBeActive = wanted.has(row.collectionId);
      if (shouldBeActive && row.deletedAt) {
        tx.update(postCollections).set({ deletedAt: null }).where(eq(postCollections.id, row.id)).run();
        changedCollectionIds.add(row.collectionId);
      } else if (!shouldBeActive && !row.deletedAt) {
        tx.update(postCollections)
          .set({ deletedAt: new Date() })
          .where(eq(postCollections.id, row.id))
          .run();
        changedCollectionIds.add(row.collectionId);
      }
    }

    const existingCollectionIds = new Set(existingRows.map((row) => row.collectionId));
    for (const collectionId of wanted) {
      if (!existingCollectionIds.has(collectionId)) {
        tx.insert(postCollections).values({ id: newId(), postId, collectionId }).run();
        changedCollectionIds.add(collectionId);
      }
    }

    // Compteur de posts par collection (`activeCollectionsQuery`,
    // `src/db/collections.ts`) : `.from(collections)`, ne réagit pas à un
    // changement isolé sur `post_collections` (même limite que
    // `removePostFromCollection` ci-dessus) — on touche `collections.updated_at`
    // pour chaque collection dont le rangement de ce post a changé.
    if (changedCollectionIds.size > 0) {
      tx.update(collections)
        .set({ updatedAt: new Date() })
        .where(inArray(collections.id, [...changedCollectionIds]))
        .run();
    }

    return postId;
  });
}
