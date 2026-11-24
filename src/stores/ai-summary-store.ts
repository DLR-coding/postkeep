import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { enqueue, parseQueue, recordFailure, recordSuccess, type Queue } from '@/lib/ai-queue';

const QUEUE_KEY = 'ai-summary-queue';

type AiSummaryStore = {
  queue: Queue;
  /** Post en cours d'analyse, pour « Summarizing… » dans le détail. */
  running: string | null;
  enqueue: (postId: string, overwrite?: boolean) => void;
  fail: (postId: string, error: string) => void;
  succeed: (postId: string) => void;
  setRunning: (postId: string | null) => void;
};

/** État d'interface de la file des résumés IA ; chaque changement est recopié dans le
 *  kv-store SQLite pour survivre à la fermeture de l'app (AGENTS.md : persistance SQLite). */
export const useAiSummaryStore = create<AiSummaryStore>((set, get) => {
  const save = (queue: Queue) => {
    Storage.setItemSync(QUEUE_KEY, JSON.stringify(queue));
    set({ queue });
  };
  return {
    queue: parseQueue(Storage.getItemSync(QUEUE_KEY)),
    running: null,
    enqueue: (postId, overwrite) => save(enqueue(get().queue, postId, overwrite)),
    fail: (postId, error) => save(recordFailure(get().queue, postId, error)),
    succeed: (postId) => save(recordSuccess(get().queue, postId)),
    setRunning: (running) => set({ running }),
  };
});
