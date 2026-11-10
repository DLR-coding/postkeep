import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { PLATFORM_META, type Platform } from '@/lib/share-url';

const SIZES = {
  sm: { box: 24, radius: 7, border: 2, font: 8.5, rotate: '-6deg' },
  md: { box: 38, radius: 11, border: 3, font: 12.5, rotate: '-7deg' },
} as const;

/** Autocollant de plateforme (refonte, tâche 5). Sans position : l'appelant le place.
 *  Bordure blanche dans les deux thèmes — en sombre elle détache les autocollants
 *  noirs (TikTok, X, Threads) du fond. Instagram en dégradé (react-native-svg, déjà
 *  installé : pas de nouveau module natif). */
export function PlatformSticker({ platform, size }: { platform: Platform; size: 'sm' | 'md' }) {
  const s = SIZES[size];
  const meta = PLATFORM_META[platform];
  const inner = s.box - s.border * 2;
  return (
    <View
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.radius,
        borderWidth: s.border,
        borderColor: '#fff',
        overflow: 'hidden',
        backgroundColor: meta.color,
        transform: [{ rotate: s.rotate }],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 5,
        elevation: 6,
      }}>
      {platform === 'instagram' && (
        <Svg width={inner} height={inner} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#f7b049" />
              <Stop offset="0.48" stopColor="#e4405f" />
              <Stop offset="1" stopColor="#8a3ab9" />
            </LinearGradient>
          </Defs>
          <Rect width={inner} height={inner} fill="url(#ig)" />
        </Svg>
      )}
      <Text
        style={{
          color: '#fff',
          fontSize: s.font,
          fontWeight: '800',
          letterSpacing: -0.3,
          ...(platform === 'tiktok'
            ? { textShadowColor: '#fe2c55', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 }
            : null),
        }}>
        {meta.badge}
      </Text>
    </View>
  );
}
