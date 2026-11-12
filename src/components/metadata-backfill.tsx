import Storage from 'expo-sqlite/kv-store';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { findPostsMissingThumbnail, setPostMetadata } from '@/db/posts';
import { parseAttempts, pickBackfill } from '@/lib/metadata-backfill';
import { useExtractMetadata } from '@/lib/webview-metadata';

const ATTEMPTS_KEY = 'metadata-backfill-attempts';

/**
 * Rattrapage des légendes/miniatures Instagram-TikTok manquantes (extraction ratée ou
 * interrompue au partage). Au lancement et à chaque retour au premier plan, un post à
 * la fois, `MAX_ATTEMPTS` essais par post, compteur gardé dans le kv-store local (pas
 * synchronisé). Un essai interrompu (app quittée, partage arrivé) ne compte pas.
 * Monté dans `_layout.tsx` une fois les migrations passées.
 */
export function MetadataBackfill() {
  const { extractMetadata } = useExtractMetadata();
  const { hasShareIntent } = useShareIntentContext();
  const sharing = useRef(hasShareIntent);
  useEffect(() => {
    sharing.current = hasShareIntent;
  }, [hasShareIntent]);

  useEffect(() => {
    let running = false;
    let again = false;
    let interrupted = false;
    let unmounted = false;
    const stop = () => unmounted || sharing.current || AppState.currentState !== 'active';

    const run = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        const { candidates, attempts } = pickBackfill(
          await findPostsMissingThumbnail(),
          parseAttempts(Storage.getItemSync(ATTEMPTS_KEY))
        );
        Storage.setItemSync(ATTEMPTS_KEY, JSON.stringify(attempts));
        for (const post of candidates) {
          if (stop()) break;
          interrupted = false;
          const metadata = await extractMetadata(post.url);
          // Timers gelés en arrière-plan : le délai dépassé tombe à la reprise, vide.
          if (interrupted || stop()) break;
          await setPostMetadata(post.id, metadata);
          if (!metadata.thumbnailUrl) {
            attempts[post.id] = (attempts[post.id] ?? 0) + 1;
            Storage.setItemSync(ATTEMPTS_KEY, JSON.stringify(attempts));
          }
        }
      } catch (error) {
        console.warn('[MetadataBackfill]', error);
      } finally {
        running = false;
        if (again && !unmounted) {
          again = false;
          run();
        }
      }
    };

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
      else interrupted = true;
    });
    return () => {
      unmounted = true;
      sub.remove();
    };
  }, [extractMetadata]);

  return null;
}
