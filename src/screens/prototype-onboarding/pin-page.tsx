// PROTOTYPE — jetable. Page « épingler PostKeep » : une animation en boucle (mini téléphone +
// doigt animé) montre le geste, puis le vrai bouton ouvre la feuille de partage Android.
// On ne vérifie pas que l'utilisateur l'a fait (aucune API ne le permet).
// Geste selon le téléphone : Samsung (One UI, relevé sur le Galaxy S23) More → crayon →
// cocher → Done ; ailleurs, appui long → Pin (Android standard, documenté par Google, non
// vérifié sur appareil ; d'autres marques peuvent différer).
import { Check, MoreHorizontal, Pencil, Pin, Pointer, Star } from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Image, Platform, Share, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const ICON = require('../../../assets/images/icon.png');
const BRAND = String((Platform.constants as { Manufacturer?: string }).Manufacturer ?? '').toLowerCase();
const IS_SAMSUNG = BRAND === 'samsung';
const IS_GOOGLE = BRAND === 'google';

// Mini téléphone : toutes les positions ci-dessous sont dans ce repère.
const W = 240;
const H = 380;
const SHEET = '#1c1c1e';
const ROW_Y = 290; // haut des icônes de la rangée d'apps (Samsung)
const ROW_SHIFT = -100; // décalage de la rangée une fois glissée jusqu'à « More »

type Gesture = { kind: 'tap' | 'hold' | 'swipe' | 'none'; x: number; y: number; toX?: number };
type Frame = { g: Gesture; step: number; ms: number; view: (rowX: SharedValue<number>) => ReactNode };

const SAMSUNG_STEPS = ['Slide the apps, then tap “More”', 'Tap the pencil ✏️', 'Tick PostKeep', 'Tap “Done”'];
const STOCK_STEPS = ['Press and hold PostKeep', 'Tap “Pin”'];
const STEPS = IS_SAMSUNG ? SAMSUNG_STEPS : STOCK_STEPS;

const ROW_APPS = [
  { label: 'Quick Share', bg: '#2563eb' },
  { label: 'Chrome', bg: '#16a34a' },
  { label: 'Messages', bg: '#0ea5e9' },
  { label: 'WhatsApp', bg: '#25d366' },
  { label: 'Gmail', bg: '#ea4335' },
];

function MiniApp({ label, bg, x, y, children }: { label: string; bg?: string; x: number; y: number; children?: ReactNode }) {
  return (
    <View className="absolute items-center" style={{ left: x, top: y, width: 56, gap: 3 }}>
      {children ?? <View className="h-[38px] w-[38px] rounded-full" style={{ backgroundColor: bg }} />}
      <Text className="text-[9px] text-white" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MiniPostKeep({ x, y, starred }: { x: number; y: number; starred?: boolean }) {
  return (
    <MiniApp label="PostKeep" x={x} y={y}>
      <View>
        <Image source={ICON} style={{ width: 38, height: 38, borderRadius: 19 }} />
        {starred && (
          <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-amber-400">
            <Icon as={Star} size={10} color="#000" />
          </View>
        )}
      </View>
    </MiniApp>
  );
}

/** Fond de feuille de partage (titre, lien, contacts) ; `top` = haut du panneau. */
function MiniSheet({ top, children }: { top: number; children: ReactNode }) {
  return (
    <View className="absolute inset-x-0 bottom-0 rounded-t-2xl" style={{ top, backgroundColor: SHEET }}>
      <Text className="absolute left-3 top-2 text-xs font-semibold text-white/70">Sharing link</Text>
      <View className="absolute left-3 right-3 top-7 h-6 rounded-lg bg-neutral-700/60" />
      {children}
    </View>
  );
}

function SamsungRow({ offset }: { offset: number | SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: typeof offset === 'number' ? offset : offset.value }] }));
  return (
    <Animated.View className="absolute inset-0" style={style}>
      {ROW_APPS.map((a, i) => (
        <MiniApp key={a.label} label={a.label} bg={a.bg} x={12 + i * 56} y={ROW_Y - 190} />
      ))}
      <MiniApp label="More" x={12 + 5 * 56} y={ROW_Y - 190}>
        <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-neutral-600">
          <Icon as={MoreHorizontal} size={18} color="#fff" />
        </View>
      </MiniApp>
    </Animated.View>
  );
}

function MiniPanel({ children }: { children: ReactNode }) {
  return (
    <View className="absolute inset-x-0 bottom-0 rounded-t-2xl px-3" style={{ top: 30, backgroundColor: SHEET }}>
      {children}
    </View>
  );
}

function Favorites({ ticked }: { ticked: boolean }) {
  return (
    <MiniPanel>
      <View className="flex-row items-center justify-between pt-3">
        <Text className="text-sm font-semibold text-white/70">{ticked ? '2 selected' : '1 selected'}</Text>
        <Text className="text-xs font-bold text-white">Done</Text>
      </View>
      <Text className="pt-3 text-[10px] text-white/60">Favorite apps</Text>
      <View className="mt-1 h-16 flex-row items-center rounded-xl bg-neutral-800 px-2" style={{ gap: 14 }}>
        <View className="h-8 w-8 rounded-full" style={{ backgroundColor: '#2563eb' }} />
        {ticked && <Image source={ICON} style={{ width: 32, height: 32, borderRadius: 16 }} />}
      </View>
      <Text className="pt-3 text-[10px] text-white/60">Other apps</Text>
      {['Calendar', 'PostKeep', 'Chrome'].map((label) => (
        <View key={label} className="h-9 flex-row items-center" style={{ gap: 10 }}>
          <View
            className={
              label === 'PostKeep' && ticked
                ? 'h-4 w-4 items-center justify-center rounded-full bg-sky-500'
                : 'h-4 w-4 rounded-full border-2 border-neutral-400'
            }>
            {label === 'PostKeep' && ticked && <Icon as={Check} size={10} color="#fff" />}
          </View>
          {label === 'PostKeep' ? (
            <Image source={ICON} style={{ width: 24, height: 24, borderRadius: 7 }} />
          ) : (
            <View className="h-6 w-6 rounded-md bg-neutral-600" />
          )}
          <Text className="text-xs text-white">{label}</Text>
        </View>
      ))}
    </MiniPanel>
  );
}

// Repères des cibles (centre de l'élément touché), dans le repère du mini téléphone.
const MORE_AT = { x: 12 + 5 * 56 + ROW_SHIFT + 28, y: ROW_Y + 19 };
const PENCIL_AT = { x: W - 20, y: 52 };
const RADIO_AT = { x: 20, y: 236 }; // 2e ligne de « Other apps »
const DONE_AT = { x: W - 26, y: 52 };

const SAMSUNG_FRAMES: Frame[] = [
  {
    g: { kind: 'swipe', x: 200, y: ROW_Y + 19, toX: 70 },
    step: 0,
    ms: 1700,
    view: (rowX) => (
      <MiniSheet top={190}>
        <SamsungRow offset={rowX} />
      </MiniSheet>
    ),
  },
  {
    g: { kind: 'tap', ...MORE_AT },
    step: 0,
    ms: 1300,
    view: () => (
      <MiniSheet top={190}>
        <SamsungRow offset={ROW_SHIFT} />
      </MiniSheet>
    ),
  },
  {
    g: { kind: 'tap', ...PENCIL_AT },
    step: 1,
    ms: 1400,
    view: () => (
      <MiniPanel>
        <View className="flex-row items-center justify-between pt-3">
          <Text className="text-sm font-semibold text-white/70">Apps</Text>
          <Icon as={Pencil} size={16} color="#fff" />
        </View>
        <View className="flex-row flex-wrap pt-4" style={{ rowGap: 14, columnGap: 18 }}>
          {[...ROW_APPS, { label: 'PostKeep', bg: '#4f46e5' }, { label: 'Drive', bg: '#f59e0b' }].map((a) => (
            <View key={a.label} className="h-9 w-9 rounded-full" style={{ backgroundColor: a.bg }} />
          ))}
        </View>
      </MiniPanel>
    ),
  },
  { g: { kind: 'tap', ...RADIO_AT }, step: 2, ms: 1400, view: () => <Favorites ticked={false} /> },
  { g: { kind: 'tap', ...DONE_AT }, step: 3, ms: 1400, view: () => <Favorites ticked /> },
  {
    g: { kind: 'none', x: 0, y: 0 },
    step: -1,
    ms: 1900,
    view: () => (
      <MiniSheet top={190}>
        <MiniPostKeep x={12} y={ROW_Y - 190} starred />
        {ROW_APPS.slice(0, 3).map((a, i) => (
          <MiniApp key={a.label} label={a.label} bg={a.bg} x={12 + (i + 1) * 56} y={ROW_Y - 190} />
        ))}
      </MiniSheet>
    ),
  },
];

// Android standard : grille de la feuille, PostKeep en 2e ligne.
const GRID_TOP = 140;
const POSTKEEP_AT = { x: 14 + 56 + 28, y: GRID_TOP + 115 + 19 };
const PIN_AT = { x: 157, y: 206 };

/** Grille de la feuille : PostKeep 6e (2e ligne, 2e colonne) avant l'épinglage, 1er après. */
function StockGrid({ pinned }: { pinned: boolean }) {
  const labels = ROW_APPS.map((a) => a.label);
  const order = pinned ? ['PostKeep', ...labels] : [...labels, 'PostKeep'];
  return (
    <MiniSheet top={GRID_TOP}>
      {order.map((label, i) => {
        const x = 14 + (i % 4) * 56;
        const y = 50 + Math.floor(i / 4) * 65;
        return label === 'PostKeep' ? (
          <MiniPostKeep key={label} x={x} y={y} starred={pinned} />
        ) : (
          <MiniApp key={label} label={label} bg={ROW_APPS.find((a) => a.label === label)?.bg} x={x} y={y} />
        );
      })}
    </MiniSheet>
  );
}

const STOCK_FRAMES: Frame[] = [
  { g: { kind: 'hold', ...POSTKEEP_AT }, step: 0, ms: 2000, view: () => <StockGrid pinned={false} /> },
  {
    g: { kind: 'tap', ...PIN_AT },
    step: 1,
    ms: 1400,
    view: () => (
      <>
        <StockGrid pinned={false} />
        <View className="absolute inset-0 bg-black/50" />
        <View className="absolute items-center rounded-2xl bg-neutral-800 p-4" style={{ left: 30, right: 30, top: 120, gap: 22 }}>
          <Image source={ICON} style={{ width: 40, height: 40, borderRadius: 20 }} />
          <View className="w-full flex-row justify-around">
            <Text className="text-xs text-white/60">App info</Text>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Icon as={Pin} size={12} color="#fff" />
              <Text className="text-xs font-bold text-white">Pin</Text>
            </View>
          </View>
        </View>
      </>
    ),
  },
  { g: { kind: 'none', x: 0, y: 0 }, step: -1, ms: 1900, view: () => <StockGrid pinned /> },
];

const FRAMES = IS_SAMSUNG ? SAMSUNG_FRAMES : STOCK_FRAMES;

/** Animation en boucle du geste d'épinglage. `onStep` : étape montrée (-1 = résultat). */
function PinAnimation({ onStep }: { onStep: (step: number) => void }) {
  const [i, setI] = useState(0);
  const fx = useSharedValue(W / 2);
  const fy = useSharedValue(H - 40);
  const visible = useSharedValue(0);
  const ripple = useSharedValue(1);
  const hold = useSharedValue(0);
  const rowX = useSharedValue(0);

  useEffect(() => {
    const f = FRAMES[i];
    onStep(f.step);
    if (i === 0) rowX.value = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (f.g.kind === 'none') {
      visible.value = withTiming(0, { duration: 200 });
    } else {
      visible.value = withTiming(1, { duration: 200 });
      fx.value = withTiming(f.g.x, { duration: 350 });
      fy.value = withTiming(f.g.y, { duration: 350 });
      const { kind, toX } = f.g;
      timers.push(
        setTimeout(() => {
          if (kind === 'tap') {
            ripple.value = 0;
            ripple.value = withTiming(1, { duration: 450 });
          } else if (kind === 'hold') {
            hold.value = 0;
            hold.value = withTiming(1, { duration: 1000 });
          } else if (kind === 'swipe' && toX !== undefined) {
            fx.value = withTiming(toX, { duration: 700 });
            rowX.value = withTiming(ROW_SHIFT, { duration: 700 });
          }
        }, 450)
      );
    }
    timers.push(setTimeout(() => setI((i + 1) % FRAMES.length), f.ms));
    return () => timers.forEach(clearTimeout);
  }, [i, onStep, fx, fy, visible, ripple, hold, rowX]);

  // Le bout du doigt de l'icône est en haut, un peu à gauche du centre.
  const finger = useAnimatedStyle(() => ({ opacity: visible.value, transform: [{ translateX: fx.value - 11 }, { translateY: fy.value - 2 }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.8,
    transform: [{ translateX: fx.value - 18 }, { translateY: fy.value - 18 }, { scale: 0.4 + ripple.value }],
  }));
  const holdStyle = useAnimatedStyle(() => ({
    opacity: hold.value > 0 && hold.value < 1 ? 1 : 0,
    transform: [{ translateX: fx.value - 26 }, { translateY: fy.value - 26 }, { scale: 0.6 + hold.value * 0.5 }],
  }));

  return (
    <View className="overflow-hidden rounded-[28px] border-4 border-neutral-700 bg-neutral-950" style={{ width: W + 8, height: H + 8 }}>
      <View style={{ width: W, height: H }}>
        {FRAMES[i].view(rowX)}
        <Animated.View pointerEvents="none" className="absolute left-0 top-0 h-9 w-9 rounded-full bg-white" style={rippleStyle} />
        <Animated.View pointerEvents="none" className="absolute left-0 top-0 h-[52px] w-[52px] rounded-full border-4 border-white" style={holdStyle} />
        <Animated.View pointerEvents="none" className="absolute left-0 top-0" style={finger}>
          <Icon as={Pointer} size={30} color="#fff" style={{ shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 4 }} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Page d'épinglage : animation + vrai bouton qui ouvre la feuille de partage Android. */
export function PinPage({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [opened, setOpened] = useState(false);
  const open = () => {
    setOpened(true);
    Share.share({ message: 'https://postkeep.app' }).catch(() => {});
  };
  return (
    <View className="absolute inset-0 items-center bg-background px-5" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96, gap: 10 }}>
      <Text className="self-stretch pr-12 text-2xl font-bold">Pin PostKeep, so it’s always first</Text>
      <PinAnimation onStep={setStep} />
      <Text className="self-stretch text-center text-lg font-bold" numberOfLines={2}>
        {step < 0 ? 'PostKeep is now first ⭐' : `${step + 1}. ${STEPS[step]}`}
      </Text>
      {!IS_SAMSUNG && !IS_GOOGLE && (
        <Text variant="muted" className="text-center text-xs">
          Your phone may look a little different.
        </Text>
      )}
      <View className="flex-1" />
      {opened ? (
        <View className="self-stretch" style={{ gap: 8 }}>
          <Button className="h-14 rounded-2xl" onPress={onContinue}>
            <Text className="text-lg font-semibold">Continue</Text>
          </Button>
          <Button variant="outline" className="h-11 rounded-2xl" onPress={open}>
            <Text>Open my share menu again</Text>
          </Button>
        </View>
      ) : (
        <View className="self-stretch" style={{ gap: 6 }}>
          <Text variant="muted" className="text-center text-sm">
            Do the same, then close the menu and come back.
          </Text>
          <Button className="h-14 rounded-2xl" onPress={open}>
            <Text className="text-lg font-semibold">Open my share menu</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
