import { type ComponentRef, type RefObject, useEffect, useRef, useState } from 'react';
import { PixelRatio, type View } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { Skia, type SkImage } from 'react-native-skia';
import { importDevice } from 'react-native-webgpu';

// Capture en direct de l'écran derrière le verre (repris de budget-app) : Skia ne voit pas les
// vues natives, on lui donne donc une image de la bande d'écran sous la barre, recapturée à
// chaque image (react-native-webgpu, drawElementImageToTexture ; sans copie dès Android 13).

export type Strip = { x: number; y: number; width: number; height: number };

// Textures en rotation : celle qu'on écrit n'est jamais celle que le canevas affiche (sinon une
// bande noire clignote quand un rendu est rejeté).
const POOL = 3;
type Pool = { textures: GPUTexture[]; images: SkImage[] };
function release(pool: Pool) {
  pool.images.forEach((img) => img.dispose());
  pool.textures.forEach((t) => t.destroy());
}

/** Image (partagée avec le thread UI) de la bande `strip` de `scene`, en dp de la scène.
 *  `lift` : remontée actuelle de la barre (clavier ouvert), la bande capturée la suit.
 *  `ready` passe à vrai à la première capture réussie ; il reste faux sans GPU (repli flou). */
export function useLiveBackdrop(
  scene: RefObject<ComponentRef<typeof View> | null>,
  strip: Strip | null,
  lift: SharedValue<number>
) {
  const image = useSharedValue<SkImage | null>(null);
  const shown = useRef<Pool | null>(null);
  const warned = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!strip || !Skia.gpu.isAvailable) return;
    let alive = true;
    let frame = 0;
    let turn = 0;
    const device = importDevice(Skia.getNativeDevice());
    const pd = PixelRatio.get();
    const size = [Math.round(strip.width * pd), Math.round(strip.height * pd)];
    const textures = Array.from({ length: POOL }, () =>
      device.createTexture({
        size,
        format: 'rgba8unorm',
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      })
    );
    const pool: Pool = { textures, images: textures.map((t) => Skia.Image.MakeFromGPUTexture(t)) };

    const tick = async () => {
      if (alive && scene.current && Skia.gpu.foreground) {
        const i = turn++ % POOL;
        try {
          await device.queue.drawElementImageToTexture(
            {
              source: scene.current,
              sourceX: strip.x,
              sourceY: Math.max(0, strip.y - lift.value),
              sourceWidth: strip.width,
              sourceHeight: strip.height,
            },
            { texture: pool.textures[i], premultipliedAlpha: true }
          );
          if (!alive) return;
          // Changer d'objet image fait redessiner le canevas avec la nouvelle capture.
          image.value = pool.images[i];
          if (shown.current !== pool) {
            const old = shown.current;
            shown.current = pool;
            if (old) setTimeout(() => release(old), 500);
          }
          setReady(true);
        } catch (e) {
          // Vue démontée ou redimensionnée pendant la capture : on réessaie à l'image suivante.
          if (__DEV__ && !warned.current) {
            warned.current = true;
            console.warn('[Glass] capture failed', e);
          }
        }
      }
      if (alive) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      if (shown.current !== pool) setTimeout(() => release(pool), 500);
    };
  }, [scene, strip?.x, strip?.y, strip?.width, strip?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  return { image, ready };
}
