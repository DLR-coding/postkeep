import { db, newId } from './index';
import { collections, type Collection } from './schema';

// ponytail: pas de test automatisé — même limite que src/db/posts.ts (module
// natif expo-sqlite, non exécutable hors runtime Expo).

export async function createCollection(name: string): Promise<Collection> {
  const [collection] = await db.insert(collections).values({ id: newId(), name }).returning();
  return collection;
}
