import { drizzle } from 'drizzle-orm/expo-sqlite';
import { uuid } from 'expo-modules-core';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

// `enableChangeListener: true` est indispensable : sans lui, `useLiveQuery` ne
// réagit à aucune écriture et les écrans ne se rafraîchissent jamais
// (ARCHITECTURE.md §2).
const sqlite = SQLite.openDatabaseSync('postkeep.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

/**
 * Identifiant de ligne — UUID v4 généré côté client (ARCHITECTURE.md §4).
 *
 * ponytail: `uuid.v4()` délègue au générateur natif d'expo-modules-core, déjà
 * présent dans le dev client. Aucune dépendance ni module natif à ajouter.
 * Si cet export disparaissait, le remplaçant documenté est `Crypto.randomUUID()`
 * d'`expo-crypto` — un seul appel à changer, ici.
 */
export const newId = () => uuid.v4();

export { schema };
