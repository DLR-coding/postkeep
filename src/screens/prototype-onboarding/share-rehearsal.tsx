// PROTOTYPE — jetable. Tutoriel du partage entièrement simulé, sur le modèle de l'onboarding
// de Central Save (relevé le 14 novembre sur le Galaxy S23) : faux Reel → faux panneau
// Instagram → fausse feuille de partage Android (PostKeep déjà présent, pas d'épinglage) →
// fausse fiche Save pré-remplie. Sur chaque écran : le reste est assombri, la cible est
// encadrée en pointillés et une bulle blanche « Tap … » pointe dessus avec une flèche.
import {
  ArrowDown,
  ArrowRight,
  Bookmark,
  Heart,
  Home,
  Link,
  MessageCircle,
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
import { Image, Pressable, View } from 'react-native';
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
  const [step, setStep] = useState(0);
  const next = () => (step === 3 ? onDone() : setStep(step + 1));

  return (
    <View className="absolute inset-0 bg-black">
      <Animated.View key={step} entering={FadeIn.duration(250)} className="flex-1" style={{ marginBottom: insets.bottom + 84 }}>
        {/* Le faux Reel reste en fond : les panneaux s'ouvrent par-dessus, comme dans Instagram */}
        <FakeReel onTarget={next} active={step === 0} />
        {step > 0 && <View className="absolute inset-0" style={{ backgroundColor: DIM }} />}
        {step === 1 && <FakeInstagramPanel onTarget={next} />}
        {step === 2 && <FakeAndroidSheet onTarget={next} />}
        {step === 3 && <FakeSaveSheet onTarget={next} />}
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
}: {
  onPress: () => void;
  callout: string;
  side: 'left' | 'top';
  children: React.ReactNode;
  radius?: number;
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
      <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={callout}>
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

/** Fausse feuille de partage Android (« Sharing link ») : PostKeep déjà dans la rangée. */
function FakeAndroidSheet({ onTarget }: { onTarget: () => void }) {
  const app = (label: string, bg: string) => (
    <View key={label} className="items-center opacity-40" style={{ gap: 6, width: 64 }}>
      <View className="h-12 w-12 rounded-full" style={{ backgroundColor: bg }} />
      <Text className="text-center text-[11px] text-white">{label}</Text>
    </View>
  );
  return (
    <View className="flex-1 justify-end">
      <View className="mx-2 rounded-3xl px-4 pb-6 pt-5" style={{ backgroundColor: '#1c1c1e', gap: 16 }}>
        <Text className="text-lg font-semibold text-white opacity-60">Sharing link</Text>
        <View className="flex-row items-center rounded-2xl p-3 opacity-40" style={{ backgroundColor: '#2c2c2e', gap: 12 }}>
          <Text className="flex-1 text-sm text-neutral-300" numberOfLines={1}>
            https://www.instagram.com/p/BsOGulcndj-/
          </Text>
        </View>
        <View className="flex-row justify-between opacity-40">
          {[1, 2, 3, 4].map((p) => (
            <View key={p} className="items-center" style={{ gap: 6 }}>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-neutral-500">
                <Icon as={UserRound} size={26} color="#d4d4d4" />
              </View>
              <Text className="text-[11px] text-white">Person</Text>
            </View>
          ))}
        </View>
        <View className="h-12" />
        <View className="flex-row items-end justify-between">
          {app('Quick Share', '#2563eb')}
          {app('Chrome', '#16a34a')}
          <Target onPress={onTarget} callout="Tap PostKeep" side="top" radius={20}>
            <View className="items-center" style={{ gap: 6 }}>
              <Image source={ICON} style={{ width: 60, height: 60, borderRadius: 30 }} />
              <Text className="text-center text-xs font-semibold text-white">PostKeep</Text>
            </View>
          </Target>
          {app('Messages', '#0ea5e9')}
        </View>
      </View>
    </View>
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
