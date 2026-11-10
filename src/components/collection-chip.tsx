import { Text, useColorScheme, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { collectionInitial, collectionTint } from '@/lib/collection-tint';
import { THEME } from '@/lib/theme';

const SIZES = {
  sm: { dot: 16, initial: 9, text: 11, padL: 3, padR: 8, padY: 3, gap: 5 },
  md: { dot: 22, initial: 11, text: 14, padL: 5, padR: 12, padY: 5, gap: 7 },
} as const;

// `Text` de React Native et non celui de l'UI : ce dernier impose sa taille et sa hauteur
// de ligne (`text-base`), ce qui rendait les puces trop hautes (constaté sur appareil).

/** Puce de collection (référence « Invite ») : pilule grise avec un rond pastel portant
 *  l'initiale, teinte stable par nom. `selected` : puce pleine avec ✓ animé (édition).
 *  `name` absent : puce « No collection », sans rond. */
export function CollectionChip({
  name,
  size = 'sm',
  selected = false,
}: {
  name: string | null;
  size?: 'sm' | 'md';
  selected?: boolean;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = THEME[scheme];
  const s = SIZES[size];
  const tint = name ? collectionTint(name)[scheme] : null;
  return (
    <View
      className="flex-row items-center self-start rounded-full"
      style={{
        gap: s.gap,
        paddingLeft: tint ? s.padL : s.padR,
        paddingRight: s.padR,
        paddingVertical: s.padY,
        backgroundColor: selected ? colors.primary : colors.chip,
      }}>
      {tint && name && (
        <View
          className="items-center justify-center rounded-full"
          style={{ width: s.dot, height: s.dot, backgroundColor: tint.bg }}>
          <Text style={{ fontSize: s.initial, lineHeight: s.initial * 1.2, fontWeight: '600', color: tint.fg }}>
            {collectionInitial(name)}
          </Text>
        </View>
      )}
      <Text
        numberOfLines={1}
        style={{
          fontSize: s.text,
          lineHeight: Math.round(s.text * 1.3),
          color: selected ? colors.primaryForeground : colors.chipForeground,
        }}>
        {name ?? 'No collection'}
      </Text>
      {selected && (
        <Animated.View entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
          <Icon as={Check} size={s.text} color={colors.primaryForeground} />
        </Animated.View>
      )}
    </View>
  );
}
