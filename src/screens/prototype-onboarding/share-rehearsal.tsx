// PROTOTYPE — jetable. Tutoriel du partage entièrement simulé, sur le modèle de l'onboarding
// de Central Save (relevé le 14 novembre sur le Galaxy S23) : faux Reel → faux panneau
// Instagram → fausse feuille de partage Android, où l'on simule aussi l'épinglage de
// PostKeep (absent de la rangée au départ, comme pour un vrai nouvel utilisateur) → fausse
// fiche Save pré-remplie. Sur chaque écran : le reste est assombri, la cible est
// encadrée en pointillés et une bulle blanche « Tap … » pointe dessus avec une flèche.
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  Heart,
  Home,
  Link,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PlusCircle,
  Repeat2,
  Search,
  Send,
  Share2,
  SquarePlay,
  Upload,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PlatformSticker } from '@/components/platform-sticker';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const ICON = require('../../../assets/images/icon.png');
const DIM = 'rgba(0,0,0,0.55)';
const IS_SAMSUNG = String((Platform.constants as { Manufacturer?: string }).Manufacturer ?? '').toLowerCase() === 'samsung';

type Step = 'reel' | 'panel' | 'scroll' | 'more' | 'tick' | 'done' | 'hold' | 'pin' | 'pinned' | 'save';
const STEPS: Step[] = IS_SAMSUNG
  ? ['reel', 'panel', 'scroll', 'more', 'tick', 'done', 'pinned', 'save']
  : ['reel', 'panel', 'hold', 'pin', 'pinned', 'save'];

/** Étapes du vrai épinglage, selon le téléphone ; la dernière ferme le menu pour ne pas
 *  partager vers PostKeep par erreur. */
const PIN_STEPS = IS_SAMSUNG
  ? ['Slide the apps to the left, then tap “More”', 'Tap the pencil ✏️', 'Tick PostKeep, then tap “Done”', 'Swipe down to close the menu']
  : ['Press and hold PostKeep', 'Tap “Pin”', 'Swipe down to close the menu'];

/** Épinglage pour de vrai : rappel des étapes, puis la vraie feuille de partage Android. */
export function RealPinScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(false);
  const open = () => {
    setOpened(true);
    Share.share({ message: 'https://postkeep.app' }).catch(() => {});
  };
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      className="absolute inset-0 bg-background px-5"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 96, gap: 10 }}>
      <Text className="text-3xl font-bold">Now pin PostKeep for real</Text>
      <Text variant="muted" className="pb-2 text-base">
        Your share menu will open. Do this:
      </Text>
      {PIN_STEPS.map((t, i) => (
        <View key={t} className="flex-row items-center rounded-2xl bg-card px-4 py-3" style={{ gap: 14 }}>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Text className="text-lg font-bold text-primary-foreground">{i + 1}</Text>
          </View>
          <Text className="flex-1 text-lg font-semibold">{t}</Text>
        </View>
      ))}
      <View className="flex-1" />
      {opened ? (
        <>
          <Button className="h-14 rounded-2xl" onPress={onDone}>
            <Text className="text-lg font-semibold">I pinned it</Text>
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl" onPress={open}>
            <Text>Open the share menu again</Text>
          </Button>
        </>
      ) : (
        <Button className="h-14 rounded-2xl" onPress={open}>
          <Text className="text-lg font-semibold">Open the share menu</Text>
        </Button>
      )}
    </Animated.View>
  );
}

/** Les 4 gestes, en petit : rappel pour la prochaine fois. */
export function StepsStrip() {
  const items = [
    { icon: Send, label: 'Paper plane' },
    { icon: Share2, label: 'Share to' },
    { label: 'PostKeep' },
    { label: 'Save' },
  ];
  return (
    <View className="flex-row items-start justify-between">
      {items.map((it, i) => (
        <View key={it.label} className="flex-1 items-center" style={{ gap: 4 }}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
            {it.icon ? (
              <Icon as={it.icon} size={20} className="text-foreground" />
            ) : it.label === 'PostKeep' ? (
              <Image source={ICON} style={{ width: 30, height: 30, borderRadius: 15 }} />
            ) : (
              <Text className="text-xs font-bold">Save</Text>
            )}
          </View>
          <Text className="text-center text-xs">
            {i + 1}. {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Tutoriel plein écran. `onDone` : les 4 gestes faits ; `onSkip` : « Skip ». */
export function ShareRehearsal({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const next = () => (i === STEPS.length - 1 ? onDone() : setI(i + 1));

  return (
    <View className="absolute inset-0 bg-black">
      <Animated.View key={step} entering={FadeIn.duration(250)} className="flex-1" style={{ marginBottom: insets.bottom + 84 }}>
        {/* Le faux Reel reste en fond : les panneaux s'ouvrent par-dessus, comme dans Instagram */}
        <FakeReel onTarget={next} active={step === 'reel'} />
        {step !== 'reel' && <View className="absolute inset-0" style={{ backgroundColor: DIM }} />}
        {step === 'panel' && <FakeInstagramPanel onTarget={next} />}
        {step === 'scroll' && <FakeSheetScroll onTarget={next} />}
        {step === 'more' && <FakeAppsGrid onTarget={next} />}
        {step === 'tick' && <FakeFavoritesEdit ticked={false} onTarget={next} />}
        {step === 'done' && <FakeFavoritesEdit ticked onTarget={next} />}
        {step === 'hold' && <FakeSheetHold onTarget={next} />}
        {step === 'pin' && <FakePinDialog onTarget={next} />}
        {step === 'pinned' && <FakeSheetPinned onTarget={next} />}
        {step === 'save' && <FakeSaveSheet onTarget={next} />}
      </Animated.View>
      <Pressable onPress={onSkip} hitSlop={12} className="absolute right-5 active:opacity-60" style={{ top: insets.top + 12 }}>
        <Text className="text-base font-semibold text-white/80">Skip</Text>
      </Pressable>
    </View>
  );
}

/** Cible : encadré en pointillés + bulle « Tap … » avec flèche, qui rebondit doucement. */
function Target({
  onPress,
  callout,
  side,
  children,
  radius = 999,
  longPress = false,
}: {
  onPress: () => void;
  callout: string;
  side: 'left' | 'top';
  children: React.ReactNode;
  radius?: number;
  /** Cible qui demande un appui long (« Press and hold »). */
  longPress?: boolean;
}) {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })), -1);
  }, [bounce]);
  const move = useAnimatedStyle(() =>
    side === 'left' ? { transform: [{ translateX: -6 * bounce.value }] } : { transform: [{ translateY: -6 * bounce.value }] }
  );
  const bubble = (
    <View className="rounded-xl bg-white px-4 py-2.5">
      <Text className="text-base font-bold text-black" numberOfLines={1}>
        {callout}
      </Text>
    </View>
  );
  return (
    <View className="items-center">
      <Pressable
        onPress={longPress ? undefined : onPress}
        onLongPress={longPress ? onPress : undefined}
        delayLongPress={450}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={callout}>
        <View style={{ borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#fff', borderRadius: radius, padding: 6 }}>{children}</View>
      </Pressable>
      {side === 'left' ? (
        <Animated.View
          pointerEvents="none"
          className="absolute flex-row items-center justify-end"
          style={[{ right: '100%', top: 0, bottom: 0, width: 240, marginRight: 4 }, move]}>
          {bubble}
          <View style={{ width: 34, height: 2.5, backgroundColor: '#fff' }} />
          <Icon as={ArrowRight} size={22} color="#fff" style={{ marginLeft: -12 }} />
        </Animated.View>
      ) : (
        <Animated.View
          pointerEvents="none"
          className="absolute items-center"
          style={[{ bottom: '100%', width: 260, left: '50%', marginLeft: -130, marginBottom: 2 }, move]}>
          {bubble}
          <View style={{ width: 2.5, height: 30, backgroundColor: '#fff' }} />
          <Icon as={ArrowDown} size={22} color="#fff" style={{ marginTop: -12 }} />
        </Animated.View>
      )}
    </View>
  );
}

/** Faux Reel : vidéo plein écran, colonne d'actions à droite (comme l'app Instagram). */
function FakeReel({ onTarget, active }: { onTarget: () => void; active: boolean }) {
  const actions = [
    { icon: Heart, count: '195K' },
    { icon: MessageCircle, count: '1,275' },
    { icon: Repeat2, count: '29.4K' },
  ];
  const send = <Icon as={Send} size={30} color="#fff" />;
  return (
    <View className="absolute inset-0">
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id="reel" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#e5e7eb" />
            <Stop offset="1" stopColor="#9ca3af" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#reel)" />
        <Ellipse cx="50%" cy="42%" rx="80" ry="102" fill="#d9a066" />
      </Svg>
      {/* Assombrit la vidéo pour faire ressortir la cible */}
      {active && <View className="absolute inset-0" style={{ backgroundColor: DIM }} />}
      <View className="flex-1 flex-row items-end px-4 pb-3">
        <View className="flex-1 pb-2 opacity-60" style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="h-9 w-9 rounded-full border-2 border-white bg-amber-300" />
            <Text className="text-base font-semibold text-white">world_record_egg</Text>
          </View>
          <Text className="text-sm text-white">Let’s set a world record together 🥚</Text>
        </View>
        <View className="items-center" style={{ gap: 16 }}>
          {actions.map((a) => (
            <View key={a.count} className="items-center opacity-60" style={{ gap: 2 }}>
              <Icon as={a.icon} size={30} color="#fff" />
              <Text className="text-xs font-semibold text-white">{a.count}</Text>
            </View>
          ))}
          <View className="items-center" style={{ gap: 2 }}>
            {active ? (
              <Target onPress={onTarget} callout="Tap Share" side="left">
                {send}
              </Target>
            ) : (
              send
            )}
            <Text className="text-xs font-semibold text-white">26.6K</Text>
          </View>
          <View className="items-center opacity-60" style={{ gap: 2 }}>
            <Icon as={Bookmark} size={30} color="#fff" />
            <Text className="text-xs font-semibold text-white">29.8K</Text>
          </View>
        </View>
      </View>
      <View className="flex-row justify-around bg-black py-3 opacity-60">
        {[Home, SquarePlay, Send, Search].map((I, i) => (
          <Icon key={i} as={I} size={24} color="#fff" />
        ))}
        <View className="h-6 w-6 rounded-full bg-neutral-400" />
      </View>
    </View>
  );
}

/** Faux panneau d'envoi Instagram : « Share to… » placé en 2e, visible sans faire défiler. */
function FakeInstagramPanel({ onTarget }: { onTarget: () => void }) {
  const round = (bg: string, icon?: typeof Link) => (
    <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: bg }}>
      {icon && <Icon as={icon} size={24} color="#fff" />}
    </View>
  );
  return (
    <View className="flex-1 justify-end">
      <View className="rounded-t-3xl px-4 pb-6 pt-3" style={{ backgroundColor: '#1c1c1e', gap: 18 }}>
        <View className="h-1 w-10 self-center rounded-full bg-neutral-600" />
        <View className="h-11 justify-center rounded-xl px-4 opacity-50" style={{ backgroundColor: '#2c2c2e' }}>
          <Text className="text-neutral-400">Search</Text>
        </View>
        <View className="flex-row justify-around opacity-40">
          {[1, 2, 3].map((f) => (
            <View key={f} className="items-center" style={{ gap: 6 }}>
              <View className="h-16 w-16 items-center justify-center rounded-full bg-neutral-500">
                <Icon as={UserRound} size={30} color="#d4d4d4" />
              </View>
              <View className="h-2 w-12 rounded-full bg-neutral-600" />
            </View>
          ))}
        </View>
        <View className="h-10" />
        <View className="flex-row items-start justify-between">
          <View className="items-center opacity-40" style={{ gap: 6, width: 70 }}>
            {round('#3a3a3c', PlusCircle)}
            <Text className="text-center text-[11px] text-white">Add to story</Text>
          </View>
          <View className="items-center" style={{ gap: 6, width: 86 }}>
            <Target onPress={onTarget} callout="Tap Share to" side="top" radius={18}>
              <View className="items-center" style={{ gap: 6 }}>
                {round('#3a3a3c', Upload)}
                <Text className="text-center text-[11px] text-white">Share to…</Text>
              </View>
            </Target>
          </View>
          <View className="items-center opacity-40" style={{ gap: 6, width: 70 }}>
            {round('#3a3a3c', Link)}
            <Text className="text-center text-[11px] text-white">Copy link</Text>
          </View>
          <View className="items-center opacity-40" style={{ gap: 6, width: 70 }}>
            {round('#25d366')}
            <Text className="text-center text-[11px] text-white">WhatsApp</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Feuille de partage + épinglage simulés. Samsung (One UI, relevé sur le Galaxy S23) : pas
// d'appui long, on passe par More → crayon → cocher → Done (« Favorite apps »). Ailleurs
// (Android standard, non vérifié sur appareil) : appui long sur l'app → Pin.
const SHEET_BG = '#1c1c1e';

function SheetFrame({ children, title = 'Sharing link' }: { children: React.ReactNode; title?: string }) {
  return (
    <View className="flex-1 justify-end">
      <View className="mx-2 rounded-3xl px-4 pb-6 pt-5" style={{ backgroundColor: SHEET_BG, gap: 14 }}>
        <Text className="text-lg font-semibold text-white opacity-60">{title}</Text>
        <View className="rounded-2xl p-3 opacity-40" style={{ backgroundColor: '#2c2c2e' }}>
          <Text className="text-sm text-neutral-300" numberOfLines={1}>
            https://www.instagram.com/p/BsOGulcndj-/
          </Text>
        </View>
        <View className="flex-row justify-between opacity-40">
          {[1, 2, 3, 4].map((p) => (
            <View key={p} className="items-center" style={{ gap: 6 }}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-500">
                <Icon as={UserRound} size={24} color="#d4d4d4" />
              </View>
              <Text className="text-[11px] text-white">Person</Text>
            </View>
          ))}
        </View>
        {children}
      </View>
    </View>
  );
}

const OTHER_APPS = [
  { label: 'Quick Share', bg: '#2563eb' },
  { label: 'Chrome', bg: '#16a34a' },
  { label: 'Messages', bg: '#0ea5e9' },
  { label: 'WhatsApp', bg: '#25d366' },
  { label: 'Gmail', bg: '#ea4335' },
  { label: 'Telegram', bg: '#38bdf8' },
];

function FakeApp({ label, bg, dim = true }: { label: string; bg: string; dim?: boolean }) {
  return (
    <View className={dim ? 'items-center opacity-40' : 'items-center'} style={{ gap: 6, width: 68 }}>
      <View className="h-12 w-12 rounded-full" style={{ backgroundColor: bg }} />
      <Text className="text-center text-[11px] text-white" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PostKeepApp({ size = 60 }: { size?: number }) {
  return (
    <View className="items-center" style={{ gap: 6 }}>
      <Image source={ICON} style={{ width: size, height: size, borderRadius: size / 2 }} />
      <Text className="text-center text-xs font-semibold text-white">PostKeep</Text>
    </View>
  );
}

/** Bulle d'explication en haut de l'écran (sans flèche). */
function Banner({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" className="absolute inset-x-4 rounded-2xl bg-white p-4" style={{ top: insets.top + 48 }}>
      <Text className="text-lg font-bold text-black">{text}</Text>
    </View>
  );
}

/** Samsung 1 : PostKeep absent de la rangée → la faire glisser jusqu'à « More ». */
function FakeSheetScroll({ onTarget }: { onTarget: () => void }) {
  const [atEnd, setAtEnd] = useState(false);
  return (
    <>
      <Banner text="PostKeep is not in the list yet. Let’s pin it, so it’s always first!" />
      <SheetFrame>
        {!atEnd && (
          <View className="items-center" pointerEvents="none">
            <View className="flex-row items-center rounded-xl bg-white px-4 py-2.5" style={{ gap: 8 }}>
              <Icon as={ArrowLeft} size={20} color="#000" />
              <Text className="text-base font-bold text-black">Slide the apps to the left</Text>
            </View>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: atEnd ? 96 : 8, alignItems: 'flex-end', gap: 4 }}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 24) setAtEnd(true);
          }}
          scrollEventThrottle={32}>
          {OTHER_APPS.map((a) => (
            <FakeApp key={a.label} {...a} />
          ))}
          {atEnd ? (
            <Target onPress={onTarget} callout="Tap More" side="top" radius={18}>
              <View className="items-center" style={{ gap: 6, width: 60 }}>
                <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-600">
                  <Icon as={MoreHorizontal} size={24} color="#fff" />
                </View>
                <Text className="text-[11px] text-white">More</Text>
              </View>
            </Target>
          ) : (
            <FakeApp label="More" bg="#525252" dim={false} />
          )}
        </ScrollView>
      </SheetFrame>
    </>
  );
}

/** Samsung 2 : écran « Apps » → crayon en haut à droite. */
function FakeAppsGrid({ onTarget }: { onTarget: () => void }) {
  const insets = useSafeAreaInsets();
  const apps = [...OTHER_APPS.slice(0, 5), { label: 'PostKeep', bg: '' }, OTHER_APPS[5], { label: 'Drive', bg: '#f59e0b' }];
  return (
    <View className="absolute inset-x-2 bottom-0 rounded-t-3xl px-4" style={{ top: insets.top + 52, backgroundColor: SHEET_BG }}>
      <View className="flex-row items-center justify-between py-4">
        <View className="flex-row items-center opacity-60" style={{ gap: 12 }}>
          <Icon as={ChevronLeft} size={24} color="#fff" />
          <Text className="text-xl font-semibold text-white">Apps</Text>
        </View>
        <Target onPress={onTarget} callout="Tap the pencil" side="left">
          <Icon as={Pencil} size={22} color="#fff" />
        </Target>
      </View>
      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 22 }}>
        {apps.map((a) =>
          a.label === 'PostKeep' ? (
            <View key={a.label} className="items-center opacity-40" style={{ gap: 6, width: 68 }}>
              <Image source={ICON} style={{ width: 48, height: 48, borderRadius: 24 }} />
              <Text className="text-[11px] text-white">PostKeep</Text>
            </View>
          ) : (
            <FakeApp key={a.label} {...a} />
          )
        )}
      </View>
    </View>
  );
}

/** Samsung 3 et 4 : « Favorite apps » → cocher PostKeep, puis Done. */
function FakeFavoritesEdit({ ticked, onTarget }: { ticked: boolean; onTarget: () => void }) {
  const insets = useSafeAreaInsets();
  const row = (label: string, bg: string) => (
    <View key={label} className="flex-row items-center py-2.5 opacity-40" style={{ gap: 14 }}>
      <View className="h-6 w-6 rounded-full border-2 border-neutral-400" />
      <View className="h-9 w-9 rounded-xl" style={{ backgroundColor: bg }} />
      <Text className="text-base text-white">{label}</Text>
    </View>
  );
  const postKeepRow = (
    <View className="flex-row items-center py-1" style={{ gap: 14, width: 280 }}>
      <View className={ticked ? 'h-6 w-6 items-center justify-center rounded-full bg-sky-500' : 'h-6 w-6 rounded-full border-2 border-white'}>
        {ticked && <Icon as={Check} size={14} color="#fff" />}
      </View>
      <Image source={ICON} style={{ width: 36, height: 36, borderRadius: 10 }} />
      <Text className="text-base font-semibold text-white">PostKeep</Text>
    </View>
  );
  return (
    <View className="absolute inset-x-2 bottom-0 rounded-t-3xl px-5" style={{ top: insets.top + 52, backgroundColor: SHEET_BG }}>
      <View className="flex-row items-center justify-between py-4">
        <Text className="text-xl font-semibold text-white opacity-60">{ticked ? '2 selected' : '1 selected'}</Text>
        {ticked ? (
          <Target onPress={onTarget} callout="Tap Done" side="left" radius={14}>
            <Text className="px-1 text-base font-bold text-white">Done</Text>
          </Target>
        ) : (
          <Text className="text-base font-bold text-white opacity-40">Done</Text>
        )}
      </View>
      <Text className="pb-3 text-sm text-neutral-400 opacity-60">Favorite apps appear at the beginning of the list when you share.</Text>
      <Text className="pb-2 text-sm font-semibold text-neutral-300 opacity-60">Favorite apps</Text>
      <View className="mb-5 flex-row rounded-2xl p-4" style={{ backgroundColor: '#2c2c2e', gap: 18 }}>
        <View className="opacity-40">
          <FakeApp label="Quick Share" bg="#2563eb" dim={false} />
        </View>
        {ticked && <PostKeepApp size={48} />}
      </View>
      <Text className="pb-1 text-sm font-semibold text-neutral-300 opacity-60">Other apps</Text>
      <View className="rounded-2xl px-4 pb-2 pt-1" style={{ backgroundColor: '#2c2c2e' }}>
        {row('Calendar', '#22c55e')}
        {row('Chrome', '#16a34a')}
        <View className="pt-16">
          {ticked ? (
            postKeepRow
          ) : (
            <Target onPress={onTarget} callout="Tick PostKeep" side="top" radius={14}>
              {postKeepRow}
            </Target>
          )}
        </View>
        {row('Telegram', '#38bdf8')}
      </View>
    </View>
  );
}

/** Android standard 1 : appui long sur PostKeep dans la feuille. */
function FakeSheetHold({ onTarget }: { onTarget: () => void }) {
  return (
    <>
      <Banner text="PostKeep is not first yet. Let’s pin it, so it’s always first!" />
      <SheetFrame>
        <View className="h-16" />
        <View className="flex-row flex-wrap items-end justify-between" style={{ rowGap: 16 }}>
          {OTHER_APPS.map((a) => (
            <FakeApp key={a.label} {...a} />
          ))}
          <Target onPress={onTarget} callout="Press and hold PostKeep" side="top" radius={20} longPress>
            <PostKeepApp size={52} />
          </Target>
          <FakeApp label="Drive" bg="#f59e0b" />
        </View>
      </SheetFrame>
    </>
  );
}

/** Android standard 2 : menu de l'appui long → Pin. */
function FakePinDialog({ onTarget }: { onTarget: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="w-full items-center rounded-3xl p-6" style={{ backgroundColor: '#2c2c2e', gap: 18 }}>
        <PostKeepApp size={56} />
        <View className="w-full flex-row justify-around pt-12">
          <Text className="text-base text-white opacity-40">App info</Text>
          <Target onPress={onTarget} callout="Tap Pin" side="top" radius={14}>
            <View className="flex-row items-center px-2" style={{ gap: 6 }}>
              <Icon as={Pin} size={18} color="#fff" />
              <Text className="text-base font-bold text-white">Pin</Text>
            </View>
          </Target>
        </View>
      </View>
    </View>
  );
}

/** Après l'épinglage : PostKeep en tête de la rangée. */
function FakeSheetPinned({ onTarget }: { onTarget: () => void }) {
  return (
    <>
      <Banner text="Done! PostKeep is now always first in this list. ⭐" />
      <SheetFrame>
        <View className="h-16" />
        <View className="flex-row items-end justify-between">
          <Target onPress={onTarget} callout="Tap PostKeep" side="top" radius={20}>
            <PostKeepApp />
          </Target>
          {OTHER_APPS.slice(0, 3).map((a) => (
            <FakeApp key={a.label} {...a} />
          ))}
        </View>
      </SheetFrame>
    </>
  );
}

/** Fausse fiche Save, comme notre vrai écran de partage, déjà remplie. */
function FakeSaveSheet({ onTarget }: { onTarget: () => void }) {
  return (
    <View className="flex-1 justify-end">
      <View className="rounded-t-3xl bg-background px-6 pb-8 pt-6">
        <View className="opacity-50" style={{ gap: 16 }}>
          <Text className="text-xl font-semibold">Save post</Text>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <PlatformSticker platform="instagram" size="md" />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold">Instagram</Text>
              <Text variant="muted" className="text-[11px]" numberOfLines={1}>
                https://www.instagram.com/p/BsOGulcndj-/
              </Text>
            </View>
          </View>
          <Text variant="muted" className="text-xs font-semibold uppercase">
            Collections
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {['Recipes', 'Travel', 'Read later'].map((c, i) => (
              <View key={c} className={i === 0 ? 'rounded-full bg-primary px-3 py-1.5' : 'rounded-full bg-muted px-3 py-1.5'}>
                <Text className={i === 0 ? 'text-sm text-primary-foreground' : 'text-sm'}>{c}</Text>
              </View>
            ))}
          </View>
          <Text variant="muted" className="text-xs font-semibold uppercase">
            Note
          </Text>
          <View className="rounded-2xl bg-card p-3">
            <Text className="text-sm">Show this to Mum 🥚</Text>
          </View>
        </View>
        <View className="mt-16">
          <Target onPress={onTarget} callout="Tap Save" side="top" radius={22}>
            <Button className="h-12 w-72 rounded-2xl" onPress={onTarget}>
              <Text className="font-semibold">Save</Text>
            </Button>
          </Target>
        </View>
      </View>
    </View>
  );
}
