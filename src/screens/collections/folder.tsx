import { Pressable, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';

import { PlatformSticker } from '@/components/platform-sticker';
import { Text } from '@/components/ui/text';
import type { CollectionPreview } from '@/lib/collection-previews';
import { RADIUS } from '@/lib/design';
import { THEME } from '@/lib/theme';

/** Feuilles qui dépassent du dossier : position horizontale et inclinaison (maquette A). */
const SHEETS = [
  { left: '14%', rotate: '-8deg', top: '4%' },
  { left: '31%', rotate: '2deg', top: '1%' },
  { left: '48%', rotate: '10deg', top: '4%' },
] as const;

/** Dossier en verre dépoli de l'écran Collections (spec, objectif 1) : dos avec onglet,
 *  jusqu'à 3 feuilles, façade translucide SANS `BlurView` (un flou par tuile dans une
 *  grille qui défile a un coût inconnu), autocollant de la plateforme dominante.
 *  `virtual` : pseudo-dossier « No collection », façade en pointillés, sans autocollant. */
export function CollectionFolder({
  name,
  count,
  preview,
  virtual,
  size,
  onPress,
  onLongPress,
}: {
  name: string;
  count: number;
  preview: CollectionPreview | undefined;
  virtual?: boolean;
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const height = Math.round(size * 0.86);
  const thumbnails = preview?.thumbnails ?? [];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${name}, ${count} post${count === 1 ? '' : 's'}`}
      style={({ pressed }) => ({ width: size, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ width: size, height }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: height * 0.14,
            bottom: 0,
            borderRadius: RADIUS.card,
            backgroundColor: colors.folderBack,
          }}
        />
        {/* Onglet du dossier. Il descend dans le dos jusqu'au bas de son coin arrondi
            (13 + RADIUS.card) : plus court, l'arrondi du dos restait visible dessous et
            dessinait une encoche en haut à gauche (vu sur appareil, absent de la maquette). */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: height * 0.14 - 13,
            width: size * 0.44,
            height: 13 + RADIUS.card,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            backgroundColor: colors.folderBack,
          }}
        />
        {SHEETS.map((sheet, i) => {
          const thumb = thumbnails[i];
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: sheet.left,
                top: sheet.top,
                width: size * 0.38,
                aspectRatio: 3 / 3.4,
                borderRadius: 6,
                overflow: 'hidden',
                backgroundColor: colors.folderSheet,
                transform: [{ rotate: sheet.rotate }],
                shadowColor: '#000',
                shadowOpacity: 0.14,
                shadowRadius: 2,
                elevation: 1,
              }}>
              {thumb ? (
                <Image source={{ uri: thumb }} contentFit="cover" style={{ height: '36%', margin: 6, marginBottom: 0, borderRadius: 3 }} />
              ) : null}
              <View style={{ height: 3, margin: 7, marginBottom: 0, borderRadius: 2, backgroundColor: colors.folderSheetLine }} />
              <View style={{ height: 3, width: '55%', margin: 7, marginBottom: 0, borderRadius: 2, backgroundColor: colors.folderSheetLine }} />
            </View>
          );
        })}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: height * 0.3,
            borderRadius: RADIUS.card,
            backgroundColor: colors.folderFront,
            borderWidth: virtual ? 1.5 : 1,
            borderStyle: virtual ? 'dashed' : 'solid',
            borderColor: virtual ? colors.folderSheetLine : colors.folderFrontBorder,
            // Ombre portée de la maquette (0 10px 20px -12px), absente du dossier virtuel.
            ...(virtual
              ? null
              : { boxShadow: '0px 8px 16px -10px rgba(30, 35, 50, 0.45)' }),
          }}>
          {preview?.platform && !virtual && (
            <View style={{ position: 'absolute', right: '10%', bottom: '12%' }}>
              <PlatformSticker platform={preview.platform} size="md" />
            </View>
          )}
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-center gap-1.5">
        <Text numberOfLines={1} className="shrink text-[13.5px] font-medium">
          {name}
        </Text>
        <View className="rounded-full bg-chip px-1.5 py-0.5">
          <Text className="text-[11px] font-semibold text-chip-foreground">{count}</Text>
        </View>
      </View>
    </Pressable>
  );
}
