import { useEffect } from 'react';
import { AppState } from 'react-native';

import { startAiSummaries } from '@/lib/ai-runner';

/** Rattrapage des résumés IA (ARCHITECTURE.md §13) : au lancement et à chaque retour au
 *  premier plan, relance la file (service tué, réseau coupé…). Seuls les posts mis en file
 *  au « Save » avec l'IA configurée y sont, au plus `MAX_ATTEMPTS` essais chacun. */
export function AiSummaryBackfill() {
  useEffect(() => {
    startAiSummaries();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startAiSummaries();
    });
    return () => sub.remove();
  }, []);
  return null;
}
