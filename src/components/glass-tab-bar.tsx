import { type ComponentRef, useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { PixelRatio, Pressable, TextInput, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { Folder, List, Search, X } from 'lucide-react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Fill, ImageShader, Shader } from 'react-native-skia';

import { type Strip, useLiveBackdrop } from '@/components/glass-backdrop';
import { GLASS, glassSettings, materialUniforms, tintUniform } from '@/components/liquid-glass';
import { Icon } from '@/components/ui/icon';
import { THEME } from '@/lib/theme';
import { useNavSearchStore } from '@/stores/nav-search-store';

const BAR_HEIGHT = 52;
const BAR_BOTTOM_MARGIN = 24;
const SIDE_MARGIN = 14;
const PILL_GAP = 8;
// Pilule des onglets : deux ronds de 40 espacés de 4, marge intérieure de 6.
const TAB = 40;
const TAB_GAP = 4;
const TAB_PAD = 6;
const TABS_WIDTH = 2 * TAB + TAB_GAP + 2 * TAB_PAD;
// Bande capturée au-dessus et au-dessous de la barre (reflets, bulle qui déborde).
const MARGIN = 16;
const PD = PixelRatio.get();

/** Espace à réserver sous une liste pour que sa dernière ligne ne passe pas sous
 *  la barre : à additionner à `insets.bottom`. */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_BOTTOM_MARGIN;

type Placement = { strip: Strip; left: number };

/** Verre dépoli de repli : vrai flou (`BlurView`, Android 12+) puis voile translucide du
 *  thème par-dessus. `overflow: 'hidden'` sur le parent parce que `BlurView` ignore
 *  `borderRadius` (doc expo-blur v57). `plain` : le verre liquide est dessiné derrière. */
function Glass({
  blurTarget,
  plain,
  className,
  children,
}: {
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
  plain: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  if (plain) return <View className={`flex-row items-center ${className ?? ''}`}>{children}</View>;
  return (
    <View
      className={`overflow-hidden rounded-full ${className ?? ''}`}
      style={{ borderWidth: 1, borderColor: colors.glassBorder }}>
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={40}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View style={{ backgroundColor: colors.glass }} className="flex-row items-center">
        {children}
      </View>
    </View>
  );
}

/** Barre flottante de la refonte (spec, objectif 4) : recherche à gauche, onglets
 *  Posts / Collections à droite. Verre liquide (shader V2, `liquid-glass.ts`) qui réfracte
 *  une capture en direct de `scene`, la vue qui contient les onglets ; repli sur le flou
 *  `expo-blur` (`blurTarget`) tant que la première capture n'est pas prête ou sans GPU.
 *  Frère du `BlurTargetView` (voir `src/app/(tabs)/_layout.tsx`) : il ne se capture pas
 *  lui-même. */
export function GlassTabBar({
  blurTarget,
  scene,
}: {
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
  scene: RefObject<ComponentRef<typeof View> | null>;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = THEME[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const onCollections = pathname.startsWith('/collections');
  const { query, setQuery, clear } = useNavSearchStore();
  const keyboard = useAnimatedKeyboard();
  const restingBottom = BAR_BOTTOM_MARGIN + insets.bottom;
  // Remontée de la barre clavier ouvert : 8 px au-dessus du clavier, dont la hauteur inclut
  // déjà la barre système (en edge-to-edge la fenêtre n'est pas redimensionnée).
  const lift = useDerivedValue(() => Math.max(0, keyboard.height.value + 8 - restingBottom));
  const followKeyboard = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value }] }));

  // Position de la barre dans le conteneur des onglets, pour savoir quelle bande capturer.
  const wrap = useRef<ComponentRef<typeof View>>(null);
  const [width, setWidth] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const measure = useCallback(() => {
    if (!scene.current || !wrap.current) return;
    scene.current.measureInWindow((sx, sy, sw, sh) => {
      wrap.current?.measureInWindow((wx, wy) => {
        const top = Math.max(0, wy - sy - MARGIN);
        const height = Math.min(BAR_HEIGHT + 2 * MARGIN, sh - top);
        if (sw > 0 && height > 0) setPlacement({ strip: { x: 0, y: top, width: sw, height }, left: wx - sx });
      });
    });
  }, [scene]);
  useEffect(() => {
    requestAnimationFrame(measure);
  }, [measure, width, insets.bottom]);
  const { image, ready } = useLiveBackdrop(scene, placement?.strip ?? null, lift);
  const glassOn = ready && placement !== null && width > 0;

  // Tout changement d'onglet vide la recherche, y compris par le retour Android
  // (spec, objectif 5) — pas seulement les ronds de la barre.
  useEffect(() => {
    clear();
  }, [onCollections, clear]);

  // Bulle de l'onglet actif : tête et traîne (goutte qui s'étire en route), 0 = Posts, 1 = Collections.
  // Ressorts réglables dans l'écran « Liquid glass » ; au-delà d'un onglet, le dépassement du
  // ressort est amorti comme un élastique, plafonné à edgeGive dp.
  const progress = useSharedValue(onCollections ? 1 : 0);
  const lag = useSharedValue(onCollections ? 1 : 0);
  useEffect(() => {
    const g = glassSettings.value;
    progress.value = withSpring(onCollections ? 1 : 0, { stiffness: g.snapStiffness, damping: g.snapDamping });
    lag.value = withSpring(onCollections ? 1 : 0, { stiffness: g.lagStiffness, damping: g.lagDamping });
  }, [onCollections, progress, lag]);

  // Comparé au chemin réel : depuis l'écran « Liquid glass » (/glass), Posts doit rester cliquable.
  const go = (path: '/' | '/collections') => {
    if (pathname === path) return;
    router.navigate(path);
  };

  // Formes en dp du canevas, qui couvre toute la largeur du conteneur (left = x de la barre).
  const left = placement?.left ?? 0;
  const cy = MARGIN + BAR_HEIGHT / 2;
  const sideWidth = width - PILL_GAP - TABS_WIDTH;
  const firstTab = left + width - TABS_WIDTH + TAB_PAD + TAB / 2;
  const step = TAB + TAB_GAP;
  const surfaceColor = tintUniform(colors.glass, 1);
  const lensColor = tintUniform(colors.foreground, 1);
  const uniforms = useDerivedValue(() => {
    const g = glassSettings.value;
    const give = Math.max(0.0001, g.edgeGive / step);
    const soft = (v: number) =>
      v < 0 ? (-give * -v) / (give - v) : v > 1 ? 1 + (give * (v - 1)) / (give + v - 1) : v;
    return {
      pd: PD,
      barC: [left + width - TABS_WIDTH / 2, cy],
      barH: [TABS_WIDTH / 2, BAR_HEIGHT / 2],
      lead: [firstTab + soft(progress.value) * step, cy],
      trail: [firstTab + soft(lag.value) * step, cy],
      lensH: [TAB / 2, TAB / 2],
      sideC: [left + sideWidth / 2, cy],
      sideH: [sideWidth / 2, BAR_HEIGHT / 2],
      barTint: [surfaceColor[0], surfaceColor[1], surfaceColor[2], g.barTint],
      lensTint: [lensColor[0], lensColor[1], lensColor[2], g.lensTint],
      sideTint: [surfaceColor[0], surfaceColor[1], surfaceColor[2], g.barTint],
      lensPress: 0,
      ...materialUniforms(g),
    };
  });

  return (
    <Animated.View
      ref={wrap}
      pointerEvents="box-none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          position: 'absolute',
          flexDirection: 'row',
          alignItems: 'center',
          gap: PILL_GAP,
          left: SIDE_MARGIN,
          right: SIDE_MARGIN,
          bottom: restingBottom,
        },
        followKeyboard,
      ]}>
      {glassOn && (
        <Canvas
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -left,
            top: -MARGIN,
            width: placement.strip.width,
            height: placement.strip.height,
          }}>
          <Fill>
            <Shader source={GLASS} uniforms={uniforms}>
              <ImageShader
                image={image}
                fit="fill"
                rect={{ x: 0, y: 0, width: placement.strip.width, height: placement.strip.height }}
              />
            </Shader>
          </Fill>
        </Canvas>
      )}

      <Glass blurTarget={blurTarget} plain={glassOn} className="flex-1">
        <View className="flex-1 flex-row items-center gap-2 px-4" style={{ height: BAR_HEIGHT }}>
          <Icon as={Search} size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={onCollections ? 'Search collections' : 'Search posts'}
            placeholderTextColor={colors.mutedForeground}
            className="flex-1 py-0 text-base text-foreground"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={clear} hitSlop={8} accessibilityLabel="Clear search">
              <Icon as={X} size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </Glass>

      <Glass blurTarget={blurTarget} plain={glassOn}>
        <View className="flex-row" style={{ gap: TAB_GAP, padding: TAB_PAD }}>
          {(
            [
              { path: '/', icon: List, label: 'Posts', active: !onCollections },
              { path: '/collections', icon: Folder, label: 'Collections', active: onCollections },
            ] as const
          ).map(({ path, icon, label, active }) => (
            <Pressable
              key={path}
              onPress={() => go(path)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              className="items-center justify-center rounded-full"
              // Avec le verre, c'est la bulle qui marque l'onglet actif.
              style={[{ width: TAB, height: TAB }, active && !glassOn && { backgroundColor: colors.primary }]}>
              <Icon
                as={icon}
                size={18}
                color={
                  glassOn
                    ? active
                      ? colors.foreground
                      : colors.mutedForeground
                    : active
                      ? colors.primaryForeground
                      : colors.foreground
                }
              />
            </Pressable>
          ))}
        </View>
      </Glass>
    </Animated.View>
  );
}
