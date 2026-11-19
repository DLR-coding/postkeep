// PROTOTYPE — jetable. Variantes de l'animation « done » (✓ de réussite) à comparer dans
// l'atelier `S` du prototype ; l'animation choisie est aussi celle des écrans Pinned!/Saved!
// de la variante G. Chaque variante dit à quel moment le ✓ apparaît (`checkAt`, ms) pour
// caler la vibration et le texte.
import { type ComponentType, useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { CHECK_AT_MS as RINGS_CHECK_AT, SUCCESS_GREEN, SuccessCheck as Rings } from './success-check';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ICON = require('../../../assets/images/icon.png');

const SIZE = 128;
const BOX = SIZE + 80; // place pour les particules / l'onde de choc
const GREEN = SUCCESS_GREEN;
const INK = '#0b0b0b'; // ✓ foncé sur disque vert
const CHECK_PATH = 'M31 52 L45 66 L71 37';
const CHECK_LENGTH = 60;
const CIRCLE_LENGTH = 2 * Math.PI * 45;

/** ✓ qui se dessine, dans un repère 0..100 posé sur SIZE × SIZE. */
function DrawnCheck({ delay, duration = 350, color = GREEN, width = 9 }: { delay: number; duration?: number; color?: string; width?: number }) {
  const draw = useSharedValue(0);
  useEffect(() => {
    draw.value = withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }));
  }, [draw, delay, duration]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - draw.value), strokeOpacity: draw.value > 0 ? 1 : 0 }));
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
      <AnimatedPath
        d={CHECK_PATH}
        stroke={color}
        strokeWidth={(width * 100) / SIZE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={props}
      />
    </Svg>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <View className="items-center justify-center" style={{ width: BOX, height: BOX }}>
      {children}
    </View>
  );
}

// 1. Draw : le cercle se trace (départ en haut), puis le ✓, puis un petit rebond.
function Draw() {
  const arc = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    arc.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    pop.value = withDelay(850, withSequence(withTiming(1.1, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 200, mass: 1 })));
  }, [arc, pop]);
  const circleProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCLE_LENGTH * (1 - arc.value) }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Box>
      <Animated.View className="items-center justify-center" style={[{ width: SIZE, height: SIZE }, popStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <AnimatedCircle
            cx={50}
            cy={50}
            r={45}
            stroke={GREEN}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCLE_LENGTH}
            animatedProps={circleProps}
          />
        </Svg>
        <DrawnCheck delay={500} />
      </Animated.View>
    </Box>
  );
}

// 2. Burst : disque qui surgit avec rebond, ✓ foncé, puis particules en feu d'artifice.
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  angle: (i / 12) * Math.PI * 2,
  color: ['#7ee08a', '#facc15', '#ffffff'][i % 3],
  size: i % 2 ? 10 : 14,
}));

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

function Burst() {
  const disc = useSharedValue(0);
  useEffect(() => {
    // mass: 1 explicite : Reanimated 4 met 4 par défaut, le ressort débordait de ~50 %.
    disc.value = withSpring(1, { damping: 14, stiffness: 230, mass: 1 });
  }, [disc]);
  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: disc.value }] }));
  return (
    <Box>
      <Animated.View className="items-center justify-center rounded-full" style={[{ width: SIZE, height: SIZE, backgroundColor: GREEN }, discStyle]}>
        <DrawnCheck delay={200} color={INK} width={11} />
      </Animated.View>
      {/* Par-dessus le disque, sinon il les cache. */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </Box>
  );
}

// 3. Liquid : le cercle se remplit d'un liquide vert qui ondule, puis le ✓ foncé apparaît.
function Liquid() {
  const level = useSharedValue(0);
  const wave = useSharedValue(0);
  useEffect(() => {
    level.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) });
    wave.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1);
  }, [level, wave]);
  // Grand carré arrondi qui tourne et monte : son bord supérieur dessine une vague.
  const liquid = useAnimatedStyle(() => ({
    transform: [{ translateY: SIZE * (1.05 - level.value * 1.25) }, { rotate: `${wave.value * 360}deg` }],
  }));
  return (
    <Box>
      <View className="items-center justify-center overflow-hidden rounded-full" style={{ width: SIZE, height: SIZE, borderWidth: 6, borderColor: GREEN }}>
        <Animated.View
          className="absolute"
          style={[{ width: SIZE * 2, height: SIZE * 2, borderRadius: SIZE * 0.85, backgroundColor: GREEN, top: 0 }, liquid]}
        />
        <DrawnCheck delay={850} color={INK} width={11} />
      </View>
    </Box>
  );
}

// 4. Stamp : le ✓ tombe comme un tampon (de grand et penché à sa place), onde de choc, secousse.
function Stamp() {
  const drop = useSharedValue(0);
  const shock = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    drop.value = withTiming(1, { duration: 260, easing: Easing.in(Easing.cubic) });
    shock.value = withDelay(240, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    shake.value = withDelay(
      240,
      withSequence(withTiming(-7, { duration: 45 }), withTiming(6, { duration: 45 }), withTiming(-4, { duration: 45 }), withTiming(0, { duration: 45 }))
    );
  }, [drop, shock, shake]);
  const stamp = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 3),
    transform: [{ translateX: shake.value }, { scale: 2.4 - 1.4 * drop.value }, { rotate: `${-22 * (1 - drop.value)}deg` }],
  }));
  const ring = useAnimatedStyle(() => ({ opacity: shock.value === 0 ? 0 : 0.8 * (1 - shock.value), transform: [{ scale: 1 + shock.value * 0.8 }] }));
  return (
    <Box>
      <Animated.View className="absolute rounded-full" style={[{ width: SIZE, height: SIZE, borderWidth: 5, borderColor: GREEN }, ring]} />
      <Animated.View className="items-center justify-center rounded-full" style={[{ width: SIZE, height: SIZE, backgroundColor: GREEN }, stamp]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
          <Path d={CHECK_PATH} stroke={INK} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
    </Box>
  );
}

// 5. Morph : l'icône PostKeep pivote et laisse place, de l'autre côté, au disque vert ✓.
function Morph() {
  const flip = useSharedValue(0);
  useEffect(() => {
    flip.value = withDelay(350, withTiming(1, { duration: 550, easing: Easing.inOut(Easing.cubic) }));
  }, [flip]);
  const front = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 700 }, { rotateY: `${flip.value * 180}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 700 }, { rotateY: `${flip.value * 180 - 180}deg` }],
  }));
  return (
    <Box>
      <Animated.View className="absolute" style={front}>
        <Image source={ICON} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }} />
      </Animated.View>
      <Animated.View className="absolute items-center justify-center rounded-full" style={[{ width: SIZE, height: SIZE, backgroundColor: GREEN }, back]}>
        <DrawnCheck delay={900} color={INK} width={11} />
      </Animated.View>
    </Box>
  );
}

function RingsBoxed() {
  return (
    <Box>
      <Rings />
    </Box>
  );
}

export type CheckVariant = { key: string; name: string; C: ComponentType; checkAt: number };

export const CHECK_VARIANTS: CheckVariant[] = [
  { key: 'rings', name: 'Rings (current)', C: RingsBoxed, checkAt: RINGS_CHECK_AT },
  { key: 'draw', name: 'Draw', C: Draw, checkAt: 500 },
  { key: 'burst', name: 'Burst', C: Burst, checkAt: 200 },
  { key: 'liquid', name: 'Liquid', C: Liquid, checkAt: 850 },
  { key: 'stamp', name: 'Stamp', C: Stamp, checkAt: 240 },
  { key: 'morph', name: 'Morph', C: Morph, checkAt: 900 },
];

// Choix courant, en mémoire seulement (prototype) : partagé entre l'atelier et la variante G.
let chosen = 'rings';
export const getCheckVariant = () => CHECK_VARIANTS.find((v) => v.key === chosen) ?? CHECK_VARIANTS[0];
export const setCheckVariant = (key: string) => {
  chosen = key;
};
