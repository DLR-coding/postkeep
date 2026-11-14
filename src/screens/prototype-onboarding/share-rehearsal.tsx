// PROTOTYPE — jetable. Partage guidé : faux Reel Instagram puis vraie feuille de partage, pour des
// utilisateurs qui ne connaissent pas le geste : un seul endroit touchable par écran,
// entouré d'un anneau jaune qui pulse et montré par un doigt. Les écrans imitent ceux
// relevés sur le Galaxy S23 (Reel : avion en papier à droite → rangée du bas « Share »).
// Ensuite, la VRAIE feuille de partage Android s'ouvre : l'utilisateur y épingle PostKeep,
// le touche et enregistre pour de vrai ; le prototype détecte le post enregistré.
import {
  Bookmark,
  Heart,
  Home,
  Link,
  MessageCircle,
  PlusCircle,
  Pointer,
  Repeat2,
  Search,
  Send,
  Share2,
  SquarePlay,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Share, View } from 'react-native';
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

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import { DEMO_POST_URL, WaitingForPost } from './shared';

const GLOW = '#facc15';

const STEPS = [
  { title: 'Tap the paper plane', hint: 'It is on the right side of the video.' },
  { title: 'Tap “Share”', hint: 'It is at the bottom, on the right. Slide the row to the left if you can’t see it.' },
  { title: 'Now for real!', hint: 'Your phone’s share menu will open. Follow these steps:' },
];

// Samsung (One UI) n'épingle pas par appui long : on passe par les « Favorite apps »
// (More → crayon → cocher → Done), relevé sur le Galaxy S23. Ailleurs : appui long → Pin.
const IS_SAMSUNG = String((Platform.constants as { Manufacturer?: string }).Manufacturer ?? '').toLowerCase() === 'samsung';
const REAL_STEPS = IS_SAMSUNG
  ? [
      'Slide the row of apps to the end, then tap “More”',
      'Tap the pencil ✏️ at the top',
      'Tick PostKeep, then tap “Done”',
      'Tap PostKeep',
      'Tap Save',
    ]
  : ['Press and hold PostKeep', 'Tap “Pin”', 'Tap PostKeep', 'Tap Save'];

/** Les 4 gestes, en petit : rappel à garder en tête pour la prochaine fois. */
export function StepsStrip() {
  const items = [
    { icon: Send, label: 'Paper plane' },
    { icon: Share2, label: 'Share' },
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
              <Image source={require('../../../assets/images/icon.png')} style={{ width: 30, height: 30, borderRadius: 15 }} />
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

/** Partage guidé plein écran. `onDone` : un vrai post vient d'être enregistré. */
export function ShareRehearsal({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [nudge, setNudge] = useState(false);

  const next = () => {
    setNudge(false);
    if (step === STEPS.length - 1) onDone();
    else setStep(step + 1);
  };
  const wrongTap = () => {
    setNudge(true);
    setTimeout(() => setNudge(false), 1800);
  };

  return (
    <View className="absolute inset-0 bg-black" style={{ paddingTop: insets.top }}>
      {/* Consigne */}
      <View className="mx-3 mt-2 rounded-3xl bg-white p-5" style={{ gap: 6 }}>
        <Text className="text-sm font-semibold text-neutral-500">
          Step {step + 1} of {STEPS.length}
        </Text>
        <Text className="text-2xl font-bold text-black">{STEPS[step].title}</Text>
        <Text className="text-base text-neutral-600">{STEPS[step].hint}</Text>
      </View>
      {step < 2 ? (
        /* Maquette : toucher ailleurs que la cible affiche le rappel */
        <Pressable className="flex-1" onPress={wrongTap} style={{ paddingBottom: insets.bottom + 90 }}>
          <Animated.View key={step} entering={FadeIn.duration(250)} className="flex-1">
            {step === 0 && <FakeReel onTarget={next} />}
            {step === 1 && <FakeInstagramPanel onTarget={next} />}
          </Animated.View>
        </Pressable>
      ) : (
        <RealShareStep onDone={onDone} />
      )}
      {/* Par-dessus la maquette : ne la décale pas sous le doigt */}
      {nudge && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(150)}
          className="absolute inset-x-3 rounded-2xl p-3"
          style={{ top: insets.top + 150, backgroundColor: GLOW, elevation: 10 }}>
          <Text className="text-center text-base font-bold text-black">Tap the yellow circle 👇</Text>
        </Animated.View>
      )}
    </View>
  );
}

/** Cible : anneau jaune qui pulse + doigt qui rebondit dessous. */
function Target({ onPress, children, round = true }: { onPress: () => void; children: React.ReactNode; round?: boolean }) {
  const pulse = useSharedValue(0);
  const bounce = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1);
    bounce.value = withRepeat(withSequence(withTiming(-10, { duration: 450 }), withTiming(0, { duration: 450 })), -1);
  }, [pulse, bounce]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - pulse.value, transform: [{ scale: 1 + pulse.value * 0.6 }] }));
  const finger = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  const radius = round ? 999 : 18;
  return (
    <View className="items-center">
      <Pressable onPress={onPress} hitSlop={16} accessibilityRole="button" accessibilityLabel="Practice target">
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: radius, borderWidth: 4, borderColor: GLOW }, ring]}
        />
        <View style={{ borderRadius: radius, borderWidth: 3, borderColor: GLOW, padding: 4 }}>{children}</View>
      </Pressable>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '100%', marginTop: 6 }, finger]}>
        <Icon as={Pointer} size={36} color={GLOW} />
      </Animated.View>
    </View>
  );
}

/** Faux Reel : vidéo plein écran, colonne d'actions à droite (comme l'app Instagram). */
function FakeReel({ onTarget }: { onTarget: () => void }) {
  const actions = [
    { icon: Heart, count: '195K' },
    { icon: MessageCircle, count: '1,275' },
    { icon: Repeat2, count: '29.4K' },
  ];
  return (
    <View className="flex-1">
      {/* « Vidéo » : dégradé + formes, rien à charger */}
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
      <Text className="px-4 pt-3 text-xl font-bold text-white">Reels</Text>
      <View className="flex-1 flex-row items-end px-4 pb-3">
        <View className="flex-1 pb-2" style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="h-9 w-9 rounded-full border-2 border-white bg-amber-300" />
            <Text className="text-base font-semibold text-white">world_record_egg</Text>
            <View className="rounded-lg border border-white px-2.5 py-1">
              <Text className="text-xs font-semibold text-white">Follow</Text>
            </View>
          </View>
          <Text className="text-sm text-white">Let’s set a world record together 🥚</Text>
        </View>
        <View className="items-center" style={{ gap: 16 }}>
          {actions.map((a) => (
            <View key={a.count} className="items-center" style={{ gap: 2 }}>
              <Icon as={a.icon} size={30} color="#fff" />
              <Text className="text-xs font-semibold text-white">{a.count}</Text>
            </View>
          ))}
          <View className="items-center" style={{ gap: 2 }}>
            <Target onPress={onTarget}>
              <Icon as={Send} size={30} color="#fff" />
            </Target>
            <Text className="mt-10 text-xs font-semibold text-white">26.6K</Text>
          </View>
          <View className="items-center" style={{ gap: 2 }}>
            <Icon as={Bookmark} size={30} color="#fff" />
            <Text className="text-xs font-semibold text-white">29.8K</Text>
          </View>
        </View>
      </View>
      <View className="flex-row justify-around bg-black py-3 opacity-80">
        {[Home, SquarePlay, Send, Search].map((I, i) => (
          <Icon key={i} as={I} size={24} color="#fff" />
        ))}
        <View className="h-6 w-6 rounded-full bg-neutral-400" />
      </View>
    </View>
  );
}

function FakeInstagramPanel({ onTarget }: { onTarget: () => void }) {
  const row = [
    { icon: PlusCircle, label: 'Add to story', bg: '#3a3a3c' },
    { icon: Link, label: 'Copy link', bg: '#3a3a3c' },
    { label: 'WhatsApp', bg: '#25d366' },
  ];
  return (
    <View className="flex-1 justify-end">
      <View className="rounded-t-3xl px-4 pb-6 pt-3" style={{ backgroundColor: '#1c1c1e', gap: 18 }}>
        <View className="h-1 w-10 self-center rounded-full bg-neutral-600" />
        <View className="h-11 justify-center rounded-xl px-4" style={{ backgroundColor: '#2c2c2e' }}>
          <Text className="text-neutral-400">Search</Text>
        </View>
        <View className="flex-row justify-around opacity-40">
          {['Friend 1', 'Friend 2', 'Friend 3'].map((f) => (
            <View key={f} className="items-center" style={{ gap: 6 }}>
              <View className="h-16 w-16 rounded-full bg-neutral-500" />
              <Text className="text-xs text-white">{f}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row items-start justify-between">
          {row.map((r) => (
            <View key={r.label} className="items-center opacity-40" style={{ gap: 6, width: 64 }}>
              <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: r.bg }}>
                {r.icon && <Icon as={r.icon} size={22} color="#fff" />}
              </View>
              <Text className="text-center text-[11px] text-white">{r.label}</Text>
            </View>
          ))}
          <View className="items-center" style={{ gap: 6, width: 64 }}>
            <Target onPress={onTarget}>
              <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#3a3a3c' }}>
                <Icon as={Share2} size={22} color="#fff" />
              </View>
            </Target>
            <Text className="mt-9 text-center text-[11px] font-bold text-white">Share</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Vraie feuille de partage : consignes numérotées en gros, puis ouverture du menu système
 *  depuis PostKeep. Le post enregistré pour de vrai est détecté (`WaitingForPost`). */
function RealShareStep({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(false);
  return (
    <Animated.View entering={FadeIn.duration(250)} className="flex-1 px-4 pt-3" style={{ gap: 8, paddingBottom: insets.bottom + 96 }}>
      {REAL_STEPS.map((t, i) => (
        <View key={t} className="flex-row items-center rounded-2xl bg-neutral-900 px-4 py-3" style={{ gap: 14 }}>
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: GLOW }}>
            <Text className="text-lg font-bold text-black">{i + 1}</Text>
          </View>
          <Text className="flex-1 text-lg font-semibold text-white">{t}</Text>
        </View>
      ))}
      <View className="flex-1" />
      <Button
        className="h-14 rounded-2xl bg-white"
        onPress={() => {
          setOpened(true);
          Share.share({ message: DEMO_POST_URL }).catch(() => {});
        }}>
        <Text className="text-lg font-bold text-black">{opened ? 'Open the share menu again' : 'Open the share menu'}</Text>
      </Button>
      {opened && <WaitingForPost onArrived={onDone} />}
    </Animated.View>
  );
}
