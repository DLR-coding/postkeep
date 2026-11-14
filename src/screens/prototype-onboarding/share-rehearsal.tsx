// PROTOTYPE — jetable. Répétition guidée du partage sur un faux post Instagram, pour des
// utilisateurs qui ne connaissent pas le geste : un seul endroit touchable par écran,
// entouré d'un anneau jaune qui pulse et montré par un doigt. Les écrans imitent ceux
// relevés sur le Galaxy S23 (Instagram : avion en papier → rangée du bas « Share » ;
// Android : feuille « Sharing link » → PostKeep ; PostKeep : Save).
import {
  Bookmark,
  Heart,
  Link,
  MessageCircle,
  PlusCircle,
  Pointer,
  Send,
  Share2,
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

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const GLOW = '#facc15';

const STEPS = [
  { title: 'Tap the paper plane', hint: 'It is just under the photo.' },
  { title: 'Tap “Share”', hint: 'It is at the bottom, on the right. Slide the row to the left if you can’t see it.' },
  { title: 'Tap PostKeep', hint: 'It is in the list of apps.' },
  { title: 'Tap Save', hint: 'That’s it: your post is saved.' },
];

/** Les 4 gestes, en petit : rappel à garder en tête avant d'ouvrir Instagram. */
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

/** Répétition plein écran. `onDone` : les 4 gestes ont été faits sur la maquette. */
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
          Practice · step {step + 1} of {STEPS.length}
        </Text>
        <Text className="text-2xl font-bold text-black">{STEPS[step].title}</Text>
        <Text className="text-base text-neutral-600">{STEPS[step].hint}</Text>
      </View>
      {/* Maquette : toucher ailleurs que la cible affiche le rappel */}
      <Pressable className="flex-1" onPress={wrongTap} style={{ paddingBottom: insets.bottom + 90 }}>
        <Animated.View key={step} entering={FadeIn.duration(250)} className="flex-1">
          {step === 0 && <FakeInstagramPost onTarget={next} />}
          {step === 1 && <FakeInstagramPanel onTarget={next} />}
          {step === 2 && <FakeAndroidSheet onTarget={next} />}
          {step === 3 && <FakePostKeepSave onTarget={next} />}
        </Animated.View>
      </Pressable>
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

function FakeInstagramPost({ onTarget }: { onTarget: () => void }) {
  return (
    <View className="flex-1 pt-4">
      <View className="flex-row items-center px-4 pb-3" style={{ gap: 10 }}>
        <View className="h-9 w-9 rounded-full" style={{ backgroundColor: '#d9a066' }} />
        <Text className="text-base font-semibold text-white">world_record_egg</Text>
      </View>
      <View className="items-center justify-center" style={{ height: 300, backgroundColor: '#cfcfcf' }}>
        <View style={{ width: 150, height: 190, borderRadius: 95, backgroundColor: '#d9a066' }} />
      </View>
      <View className="flex-row items-center px-4 pt-4" style={{ gap: 22 }}>
        <Icon as={Heart} size={28} color="#fff" />
        <Icon as={MessageCircle} size={28} color="#fff" />
        <Target onPress={onTarget}>
          <Icon as={Send} size={28} color="#fff" />
        </Target>
        <View className="flex-1" />
        <Icon as={Bookmark} size={28} color="#fff" />
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

function FakeAndroidSheet({ onTarget }: { onTarget: () => void }) {
  const apps = [
    { label: 'Quick Share', bg: '#2563eb' },
    { label: 'PostKeep' },
    { label: 'Drive', bg: '#10b981' },
    { label: 'Gmail', bg: '#ea4335' },
  ];
  return (
    <View className="flex-1 justify-end">
      <View className="mx-2 rounded-3xl px-4 pb-6 pt-5" style={{ backgroundColor: '#1c1c1e', gap: 18 }}>
        <Text className="text-lg font-semibold text-white">Sharing link</Text>
        <View className="flex-row items-center rounded-2xl p-3 opacity-60" style={{ backgroundColor: '#2c2c2e', gap: 12 }}>
          <View className="h-10 w-10 rounded-xl" style={{ backgroundColor: '#e4405f' }} />
          <View>
            <Text className="text-white">Instagram</Text>
            <Text className="text-xs text-neutral-400">https://www.instagram.com/p/…</Text>
          </View>
        </View>
        <View className="flex-row items-start justify-between pb-6">
          {apps.map((a) =>
            a.label === 'PostKeep' ? (
              <View key={a.label} className="items-center" style={{ gap: 6, width: 72 }}>
                <Target onPress={onTarget}>
                  <Image source={require('../../../assets/images/icon.png')} style={{ width: 52, height: 52, borderRadius: 14 }} />
                </Target>
                <Text className="mt-9 text-center text-xs font-bold text-white">PostKeep</Text>
              </View>
            ) : (
              <View key={a.label} className="items-center opacity-40" style={{ gap: 6, width: 72 }}>
                <View className="h-14 w-14 rounded-2xl" style={{ backgroundColor: a.bg }} />
                <Text className="text-center text-xs text-white">{a.label}</Text>
              </View>
            )
          )}
        </View>
      </View>
    </View>
  );
}

function FakePostKeepSave({ onTarget }: { onTarget: () => void }) {
  return (
    <View className="flex-1 justify-end">
      <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5" style={{ gap: 14 }}>
        <Text className="text-xl font-semibold">Save post</Text>
        <View className="rounded-2xl bg-card p-3 opacity-60">
          <Text className="text-sm text-muted-foreground">https://www.instagram.com/p/BsOGulcndj-/</Text>
        </View>
        <View className="h-20 rounded-2xl bg-card opacity-60" />
        <View className="items-center pb-10">
          <Target onPress={onTarget} round={false}>
            <Button className="h-12 w-64 rounded-2xl" onPress={onTarget}>
              <Text className="text-base font-semibold">Save</Text>
            </Button>
          </Target>
        </View>
      </View>
    </View>
  );
}
