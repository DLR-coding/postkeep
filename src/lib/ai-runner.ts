/**
 * Résumés IA en arrière-plan (ARCHITECTURE.md §13) : un service de premier plan
 * notify-kit traite la file pendant que l'app est fermée. Importé par `index.js` avant le
 * routeur : le runner doit exister au chargement du bundle.
 *
 * Aucun `setTimeout` ici : les timers JS restent gelés app fermée, même avec le service.
 * Les délais sont ceux des requêtes, appliqués par OkHttp (`ai-client.ts`, `video-source.ts`).
 */
import notifee, { AndroidForegroundServiceType, AndroidImportance } from 'react-native-notify-kit';

import { findPostForSummary, setPostAiSummary } from '@/db/posts';
import { summarize, transcribe } from '@/lib/ai-client';
import { pendingIds } from '@/lib/ai-queue';
import { loadAiSettings } from '@/lib/ai-settings';
import { downloadVideo } from '@/lib/video-source';
import { useAiSummaryStore } from '@/stores/ai-summary-store';

const CHANNEL_ID = 'ai-summary';
let active = false;

async function summarizeOne(postId: string, overwrite: boolean): Promise<void> {
  const settings = await loadAiSettings();
  if (!settings) throw new Error('AI summary is off. Set it up in Settings.');
  const post = await findPostForSummary(postId);
  if (!post || (post.aiSummary && !overwrite)) return; // supprimé, ou déjà résumé
  if (!post.url) throw new Error('This post has no link.');
  const video = await downloadVideo(post.url, postId);
  try {
    // L'audio est un plus : une transcription ratée n'empêche pas le résumé.
    const transcript = await transcribe(settings, video.file.uri).catch(() => null);
    const summary = await summarize(settings, {
      videoBase64: video.base64,
      transcript,
      caption: post.caption,
      note: post.note,
    });
    await setPostAiSummary(postId, summary, overwrite);
  } finally {
    if (video.file.exists) video.file.delete();
  }
}

/** Traite chaque post en attente une fois, l'un après l'autre. */
async function processQueue(): Promise<void> {
  const store = useAiSummaryStore.getState;
  const tried = new Set<string>();
  let postId: string | undefined;
  while ((postId = pendingIds(store().queue).find((id) => !tried.has(id)))) {
    tried.add(postId);
    store().setRunning(postId);
    try {
      await summarizeOne(postId, store().queue[postId]?.overwrite ?? false);
      store().succeed(postId);
    } catch (e) {
      store().fail(postId, e instanceof Error ? e.message : 'Something went wrong.');
    }
  }
  store().setRunning(null);
}

notifee.registerForegroundService(async () => {
  try {
    await processQueue();
  } finally {
    active = false;
    await notifee.stopForegroundService();
  }
});

/** Lance le traitement de la file s'il y a du travail. À appeler app visible (après
 *  « Save », au lancement, au retour au premier plan) : Android interdit de démarrer un
 *  service de premier plan depuis l'arrière-plan. */
export async function startAiSummaries(): Promise<void> {
  if (active || !pendingIds(useAiSummaryStore.getState().queue).length) return;
  active = true;
  try {
    await notifee.createChannel({ id: CHANNEL_ID, name: 'AI summary', importance: AndroidImportance.LOW });
    await notifee.displayNotification({
      title: 'Summarizing your saved video…',
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC],
        ongoing: true,
      },
    });
  } catch (e) {
    // Service refusé : on traite quand même, tant que l'app reste au premier plan.
    console.warn('[ai-runner] foreground service failed', e);
    processQueue().finally(() => (active = false));
  }
}
