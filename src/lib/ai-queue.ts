/**
 * File des résumés IA à faire (ARCHITECTURE.md §13). Logique pure, testée par
 * `ai-queue.test.ts` ; l'état vit dans `src/stores/ai-summary-store.ts`, sauvegardé dans le
 * kv-store local (pas synchronisé : un essai n'a pas de sens sur un autre appareil).
 */

export const MAX_ATTEMPTS = 3;

/** `error` : raison du dernier échec, affichée dans le détail du post.
 *  `overwrite` : demandé avec « Redo », remplace le résumé existant. */
export type QueueEntry = { attempts: number; error: string | null; overwrite: boolean };
export type Queue = Record<string, QueueEntry>;

/** Ajoute (ou relance) un post. Une demande manuelle repart à zéro essai. */
export function enqueue(queue: Queue, postId: string, overwrite = false): Queue {
  return { ...queue, [postId]: { attempts: 0, error: null, overwrite } };
}

export function recordFailure(queue: Queue, postId: string, error: string): Queue {
  const entry = queue[postId] ?? { attempts: 0, error: null, overwrite: false };
  return { ...queue, [postId]: { ...entry, attempts: entry.attempts + 1, error } };
}

export function recordSuccess(queue: Queue, postId: string): Queue {
  const { [postId]: _done, ...rest } = queue;
  return rest;
}

/** Posts encore à essayer, dans l'ordre d'ajout. */
export const pendingIds = (queue: Queue) =>
  Object.keys(queue).filter((id) => queue[id].attempts < MAX_ATTEMPTS);

/** kv-store → file ; une valeur illisible repart d'une file vide. */
export function parseQueue(raw: string | null): Queue {
  try {
    const value = JSON.parse(raw ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
