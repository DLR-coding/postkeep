// PROTOTYPE — jetable. ✓ de réussite d'après la vidéo de référence du 19 novembre : des
// anneaux tournent en 3D autour d'axes différents, se redressent et fusionnent en un seul
// cercle, puis le ✓ se dessine (point → petit trait → grand trait). Contour vert, pas de
// disque plein. Anneaux : Views en rotation 3D (Reanimated) ; ✓ : tracé SVG animé.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const SUCCESS_GREEN = '#7ee08a';
const SIZE = 128;
const STROKE = 9;
const SPIN_MS = 800; // anneaux qui tournent puis fusionnent
const DRAW_MS = 400; // dessin du ✓
/** Moment où le ✓ commence à se dessiner (pour caler une vibration ou un texte). */
export const CHECK_AT_MS = SPIN_MS;

// Chaque anneau tourne sur lui-même autour d'un axe incliné différent (`axis`, degrés dans
// le plan de l'écran) : vu de face, il devient une ellipse qui s'élargit et s'affine, et les
// cinq ensemble dessinent la sphère en fil de fer de la référence. `turn` : rotation de
// départ (degrés), ramenée à 0 (anneau à plat) en ralentissant.
const RINGS = [
  { axis: 0, turn: 540 },
  { axis: 36, turn: -450 },
  { axis: 72, turn: 630 },
  { axis: 108, turn: -500 },
  { axis: 144, turn: 580 },
];

// ✓ dans un repère 0..100 : petit trait vers le bas, puis grand trait vers le haut à droite.
const CHECK_PATH = 'M31 52 L45 66 L71 37';
const CHECK_LENGTH = 60; // ≈ 19,8 + 39,6

function Ring({ tilt, progress }: { tilt: (typeof RINGS)[number]; progress: { value: number } }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value; // 0 → 1 : de la rotation de départ à plat
    return {
      // Apparition rapide, bien visibles pendant la rotation, puis fondus dans le cercle final.
      opacity: t < 0.1 ? t * 8 : t > 0.8 ? (1 - t) * 4 : 0.8,
      transform: [
        { perspective: 800 },
        { rotateZ: `${tilt.axis}deg` },
        { rotateY: `${tilt.turn * (1 - t)}deg` },
        { scale: 0.85 + 0.15 * t },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute"
      style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderColor: SUCCESS_GREEN }, style]}
    />
  );
}

/** Animation complète, jouée une fois au montage. */
export function SuccessCheck() {
  const spin = useSharedValue(0);
  const draw = useSharedValue(0);

  useEffect(() => {
    spin.value = withTiming(1, { duration: SPIN_MS, easing: Easing.out(Easing.quad) });
    draw.value = withDelay(SPIN_MS, withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.quad) }));
  }, [spin, draw]);

  // Cercle final : apparaît quand les anneaux se rejoignent.
  const finalRing = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (spin.value - 0.75) / 0.25)) }));
  // Le ✓ commence par un point (bout arrondi), puis le trait s'allonge.
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
    strokeOpacity: draw.value > 0 ? 1 : 0,
  }));

  return (
    <View className="items-center justify-center" style={{ width: SIZE + 40, height: SIZE + 40 }}>
      {RINGS.map((tilt, i) => (
        <Ring key={i} tilt={tilt} progress={spin} />
      ))}
      <Animated.View
        pointerEvents="none"
        className="absolute"
        style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderColor: SUCCESS_GREEN }, finalRing]}
      />
      <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <AnimatedPath
          d={CHECK_PATH}
          stroke={SUCCESS_GREEN}
          strokeWidth={(STROKE * 100) / SIZE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={CHECK_LENGTH}
          animatedProps={checkProps}
        />
      </Svg>
    </View>
  );
}
