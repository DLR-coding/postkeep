// SPIKE (branche spike/notify-kit, jamais dans master) : le JS tourne-t-il encore après
// BackHandler.exitApp() dans un service de premier plan notify-kit ?
import notifee, { AndroidForegroundServiceType, AndroidImportance } from 'react-native-notify-kit';
import { Directory, File, Paths } from 'expo-file-system';

// Vidéo publique X (NASA, 2,7 Mo) : teste un vrai téléchargement en arrière-plan.
const SAMPLE_MP4 =
  'https://video.twimg.com/amplify_video/2085116218021736448/vid/avc1/640x360/IogHdNZFjlURVOmp.mp4?tag=14';

const log = (t0: number, msg: string) =>
  console.log(`[SPIKE] +${((Date.now() - t0) / 1000).toFixed(1)}s ${msg}`);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

notifee.registerForegroundService(async () => {
  const t0 = Date.now();
  log(t0, 'runner started');
  try {
    for (let i = 0; i < 6; i++) {
      await wait(5000);
      log(t0, `tick ${i}`);
    }
    const dir = new Directory(Paths.cache, 'spike');
    if (!dir.exists) dir.create();
    const out = new File(dir, 'x.mp4');
    if (out.exists) out.delete();
    const file = await File.downloadFileAsync(SAMPLE_MP4, out);
    log(t0, `downloaded ${file.size} bytes`);
    const b64 = await file.base64();
    log(t0, `base64 length ${b64.length}`);
    for (let i = 0; i < 6; i++) {
      await wait(5000);
      log(t0, `tick after download ${i}`);
    }
  } catch (e) {
    log(t0, `error ${(e as Error).message}`);
  } finally {
    log(t0, 'stopping');
    await notifee.stopForegroundService();
  }
});

export async function startSpikeService() {
  const channelId = await notifee.createChannel({
    id: 'ai-summary',
    name: 'AI summary',
    importance: AndroidImportance.LOW,
  });
  await notifee.displayNotification({
    title: 'Analyse du post…',
    android: {
      channelId,
      asForegroundService: true,
      foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC],
      ongoing: true,
    },
  });
}
