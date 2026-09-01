import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Les 5 colonnes obligatoires sur toute table synchronisable (ARCHITECTURE.md §4).
 * `id` n'a pas de `$defaultFn` volontairement : TypeScript force alors à le passer à
 * chaque insertion, via `newId()` (src/db/index.ts). Un oubli est une erreur de
 * compilation, pas une ligne sans identifiant en base.
 */
const syncColumns = {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
  // Suppression logique — jamais de DELETE (ARCHITECTURE.md §4).
  // Toute lecture doit filtrer `WHERE deleted_at IS NULL`.
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  // Nullable exprès : rattachement a posteriori des données créées avant inscription.
  userId: text('user_id'),
};

export const collections = sqliteTable('collections', {
  ...syncColumns,
  name: text('name').notNull(),
});

export const posts = sqliteTable('posts', {
  ...syncColumns,
  // Nullable : un partage sans lien exploitable (texte brut) est accepté et
  // atterrit entièrement dans `note`. Une carte sans URL n'est pas ouvrable.
  // L'URL stockée est normalisée (query + fragment retirés) pour que la
  // détection de doublon fonctionne malgré les paramètres de tracking.
  url: text('url'),
  note: text('note'),
  // Rempli à la première ouverture (Linking.openURL réussi). Sert de base aux
  // rappels de la phase 5 — TODO.md §Questions ouvertes, fréquence non tranchée.
  openedAt: integer('opened_at', { mode: 'timestamp_ms' }),
});

/**
 * Rangement d'un post dans une collection — un post peut appartenir à plusieurs
 * collections, et une collection contient plusieurs posts.
 *
 * La ligne `posts` n'est jamais dupliquée pour un second rangement : la note
 * divergerait entre les copies et une suppression n'en retirerait qu'une.
 *
 * Table synchronisable comme les autres, donc les 5 colonnes s'appliquent :
 * retirer un post d'une collection remplit `deleted_at`, ça ne supprime rien.
 */
export const postCollections = sqliteTable('post_collections', {
  ...syncColumns,
  postId: text('post_id')
    .notNull()
    .references(() => posts.id),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id),
});

// ponytail: pas de contrainte UNIQUE sur (post_id, collection_id) — même piège que
// sur `url` : un rangement supprimé occuperait la paire et empêcherait de reclasser
// le post dans cette collection. Le doublon se vérifie en code, sur les lignes où
// `deleted_at IS NULL`.

// ponytail: pas d'index. Contrainte inutile en dessous de quelques milliers de
// lignes — SQLite scanne plus vite que le temps de rendu. À ajouter si la
// recherche de la phase 4 devient perceptible sur un vrai volume.

// ponytail: pas de table `tags` ni de colonne `platform`. Une collection multiple
// remplit déjà le rôle d'un tag ; la plateforme se déduit de l'URL à l'affichage,
// la stocker créerait une donnée qui diverge le jour où le parser change.

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type PostCollection = typeof postCollections.$inferSelect;
export type NewPostCollection = typeof postCollections.$inferInsert;
