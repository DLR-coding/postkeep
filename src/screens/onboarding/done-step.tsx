// Onboarding : écran « c'est fait » après une étape d'action (« All set! », « Saved! »).
// Animation « Burst », retenue le 19 novembre 2026 parmi six variantes du prototype : un
// disque vert surgit, le ✓ se dessine, des particules éclatent. Vibration au moment du ✓.
// Passe tout seul à la suite après DONE_MS ; un toucher passe tout de suite.
// Vert et particules en dur : couleur de réussite, identique dans les deux thèmes.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DONE_MS = 2300;
const CHECK_AT_MS = 200;
const SIZE = 128;
const GREEN = '#7ee08a';
const INK = '#0b0b0b'; // ✓ foncé sur le disque vert
const CHECK_PATH = 'M31 52 L45 66 L71 37'; // repère 0..100 : petit trait, puis grand trait
const CHECK_LENGTH = 60;
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  angle: (i / 12) * Math.PI * 2,
  color: [GREEN, '#facc15', '#ffffff'][i % 3],
  size: i % 2 ? 10 : 14,
}));

export function DoneStep({ title, body, onNext }: { title: string; body: string; onNext: () => void }) {
  // `onNext` change à chaque rendu du parent : sans ref, l'effet repartirait (2e vibration,
  // minuteur remis à zéro).
  const next = useRef(onNext);
  useEffect(() => {
    next.current = onNext;
  });
  useEffect(() => {
    const haptic = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), CHECK_AT_MS);
    const done = setTimeout(() => next.current(), DONE_MS);
    return () => {
      clearTimeout(haptic);
      clearTimeout(done);
    };
  }, []);

  return (
    <Pressable className="flex-1 items-center justify-center bg-background px-8" style={{ gap: 18 }} onPress={onNext}>
      <Burst />
      <Animated.View entering={FadeInDown.delay(CHECK_AT_MS).duration(350)} className="items-center" style={{ gap: 8 }}>
        <Text className="text-center text-3xl font-bold">{title}</Text>
        <Text variant="muted" className="text-center text-base">
          {body}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Burst() {
  const disc = useSharedValue(0);
  const draw = useSharedValue(0);
  useEffect(() => {
    // mass: 1 explicite : Reanimated 4 met 4 par défaut, le disque débordait de ~50 %.
    disc.value = withSpring(1, { damping: 14, stiffness: 230, mass: 1 });
    draw.value = withDelay(CHECK_AT_MS, withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }));
  }, [disc, draw]);
  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: disc.value }] }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
    strokeOpacity: draw.value > 0 ? 1 : 0,
  }));
  return (
    <View className="items-center justify-center" style={{ width: SIZE + 80, height: SIZE + 80 }}>
      <Animated.View className="items-center justify-center rounded-full" style={[{ width: SIZE, height: SIZE, backgroundColor: GREEN }, discStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
          <AnimatedPath
            d={CHECK_PATH}
            stroke={INK}
            strokeWidth={(11 * 100) / SIZE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
      {/* Par-dessus le disque, sinon il les cache. */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}

function Particle({ angle, color, size }: (typeof PARTICLES)[number]) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(280, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const style = useAnimatedStyle(() => {
    const d = 70 + t.value * 75; // départ au bord du disque
    return {
      opacity: t.value === 0 ? 0 : 1 - t.value,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - t.value * 0.4 }],
    };
  });
  return <Animated.View className="absolute rounded-full" style={[{ width: size, height: size, backgroundColor: color }, style]} />;
}
