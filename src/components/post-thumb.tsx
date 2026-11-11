import { Text as RNText, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { PlatformSticker } from '@/components/platform-sticker';
import { Text } from '@/components/ui/text';
import { splitHighlight } from '@/lib/post-filters';
import { detectPlatform, isVerticalVideo, type Platform } from '@/lib/share-url';
import { THEME } from '@/lib/theme';

type ThumbPost = {
  url: string | null;
  caption: string | null;
  note: string | null;
  thumbnailUrl: string | null;
};

/** En dessous de cette largeur (px) l'extrait de texte est illisible : on ne garde
 *  que le fond et l'autocollant (en-tête compact de l'édition). */
const MIN_WIDTH_FOR_TEXT = 50;

/** Fond de la vignette de secours (option 6A). Couleurs de marque : seules couleurs
 *  en dur autorisées (spec, contraintes). Plateforme inconnue → `null`, le parent
 *  utilise le jeton `muted`. */
function PlatformBackdrop({ platform, width, height }: { platform: Platform; width: number; height: number }) {
  if (platform === 'instagram') {
    return (
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="bg-ig" x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor="#f7b049" />
            <Stop offset="0.52" stopColor="#e4405f" />
            <Stop offset="1" stopColor="#8a3ab9" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#bg-ig)" />
      </Svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="bg-cyan" cx="0.25" cy="0.15" r="0.6">
            <Stop offset="0" stopColor="#25f4ee" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#25f4ee" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bg-pink" cx="0.85" cy="0.9" r="0.6">
            <Stop offset="0" stopColor="#fe2c55" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#fe2c55" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="#121214" />
        <Circle cx={width * 0.25} cy={height * 0.15} r={width * 0.9} fill="url(#bg-cyan)" />
        <Circle cx={width * 0.85} cy={height * 0.9} r={width * 0.9} fill="url(#bg-pink)" />
      </Svg>
    );
  }
  // Reddit : son orange ; X et Threads : gris très foncé.
  const backdrop = platform === 'reddit' ? '#FF4500' : '#16171b';
  return <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: backdrop }} />;
}

/** Texte avec le terme de recherche surligné (jaune, lisible sur tous les fonds). */
export function HighlightedText({ text, query, ...rest }: { text: string; query?: string } & React.ComponentProps<typeof Text>) {
  return (
    <Text {...rest}>
      {splitHighlight(text, query ?? '').map((seg, i) =>
        seg.match ? (
          // `Text` de React Native, pas celui de l'UI : ce dernier impose sa propre taille
          // de police au lieu d'hériter de celle du parent (constaté sur appareil).
          <RNText key={i} style={{ backgroundColor: '#ffe58a', color: '#111' }}>
            {seg.text}
          </RNText>
        ) : (
          seg.text
        )
      )}
    </Text>
  );
}

/** Vignette 9:16 d'un post (refonte, tâche 5) : vidéo verticale plein cadre, image
 *  d'un autre format centrée sur un fond flouté de la même image, sinon vignette de
 *  secours 6A (couleur de plateforme + extrait du texte + autocollant). */
export function PostThumb({
  post,
  width,
  highlightQuery,
  stickerAt = 'bottom-left',
  radius: radiusOverride,
  children,
}: {
  post: ThumbPost;
  width: number;
  highlightQuery?: string;
  /** Grille : autocollant en haut à droite, la légende occupe le bas. */
  stickerAt?: 'bottom-left' | 'top-right';
  /** Rayon des coins ; par défaut proportionnel à la largeur. */
  radius?: number;
  /** Calque posé sur la miniature (légende de la grille). */
  children?: React.ReactNode;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const platform = post.url ? detectPlatform(post.url) : null;
  const height = Math.round((width * 16) / 9);
  // Coins de vignette proportionnels et continus (squircle sur iOS ; Android arrondit).
  const radius = radiusOverride ?? width * 0.2;
  const vertical = isVerticalVideo(post.url, platform);
  const frame = { width, height, borderRadius: radius, borderCurve: 'continuous' as const, overflow: 'hidden' as const };
  const sticker = platform ? (
    <View
      style={
        stickerAt === 'top-right'
          ? { position: 'absolute', right: 5, top: 5, transform: [{ rotate: '10deg' }] }
          : { position: 'absolute', left: 5, bottom: 5 }
      }>
      <PlatformSticker platform={platform} size="sm" />
    </View>
  ) : null;

  if (post.thumbnailUrl) {
    return (
      <View style={[frame, { backgroundColor: colors.muted }]}>
        {vertical ? (
          <Image source={{ uri: post.thumbnailUrl }} contentFit="cover" style={{ width, height }} />
        ) : (
          <>
            {/* Flou statique de l'image, calculé une fois (spec, anti-objectifs). */}
            <Image source={{ uri: post.thumbnailUrl }} contentFit="cover" blurRadius={12} style={{ width, height }} />
            <Image
              source={{ uri: post.thumbnailUrl }}
              contentFit="contain"
              style={{ position: 'absolute', top: 0, left: 0, width, height }}
            />
          </>
        )}
        {vertical && (
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: 6,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: 'rgba(0,0,0,0.38)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                marginLeft: 2,
                borderLeftWidth: 6,
                borderTopWidth: 4,
                borderBottomWidth: 4,
                borderLeftColor: '#fff',
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
              }}
            />
          </View>
        )}
        {children}
        {sticker}
      </View>
    );
  }

  const text = post.caption ?? post.note ?? '';
  const onBrand = !!platform;
  return (
    <View style={[frame, { backgroundColor: colors.muted }]}>
      {platform && <PlatformBackdrop platform={platform} width={width} height={height} />}
      {width >= MIN_WIDTH_FOR_TEXT && !!text && (
        <HighlightedText
          text={text}
          query={highlightQuery}
          numberOfLines={7}
          style={{
            margin: width * 0.1,
            // Autocollant en haut à droite (grille) : le texte commence sous lui.
            marginTop: stickerAt === 'top-right' ? 34 : width * 0.1,
            marginBottom: stickerAt === 'top-right' ? width * 0.1 : width * 0.45,
            fontSize: Math.max(8, width * 0.118),
            lineHeight: Math.max(8, width * 0.118) * 1.35,
            fontWeight: '600',
            color: onBrand ? '#fff' : colors.foreground,
          }}
        />
      )}
      {sticker}
    </View>
  );
}
