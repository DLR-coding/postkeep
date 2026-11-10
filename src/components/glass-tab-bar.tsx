import type { RefObject } from 'react';
import { Pressable, TextInput, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { Folder, List, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { THEME } from '@/lib/theme';
import { useNavSearchStore } from '@/stores/nav-search-store';

const BAR_HEIGHT = 52;
const BAR_BOTTOM_MARGIN = 24;
const SIDE_MARGIN = 14;

/** Espace à réserver sous une liste pour que sa dernière ligne ne passe pas sous
 *  la barre : à additionner à `insets.bottom`. */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_BOTTOM_MARGIN;

/** Verre dépoli : vrai flou (`BlurView`, Android 12+) puis voile translucide du
 *  thème par-dessus. `overflow: 'hidden'` sur le parent parce que `BlurView`
 *  ignore `borderRadius` (doc expo-blur v57). */
function Glass({
  blurTarget,
  className,
  children,
}: {
  blurTarget: RefObject<View | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
 *  Posts / Collections à droite. Frère du `BlurTargetView` qui contient les onglets
 *  (voir `src/app/(tabs)/_layout.tsx`) : `BlurView` doit être à côté de sa cible. */
export function GlassTabBar({ blurTarget }: { blurTarget: RefObject<View | null> }) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onCollections = usePathname().startsWith('/collections');
  const { query, setQuery, clear } = useNavSearchStore();

  const go = (path: '/' | '/collections') => {
    if ((path === '/collections') === onCollections) return;
    clear();
    router.navigate(path);
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute flex-row items-center gap-2"
      style={{ left: SIDE_MARGIN, right: SIDE_MARGIN, bottom: BAR_BOTTOM_MARGIN + insets.bottom }}>
      <Glass blurTarget={blurTarget} className="flex-1">
        <View className="flex-1 flex-row items-center gap-2 px-4" style={{ height: BAR_HEIGHT }}>
          <Icon as={Search} size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={onCollections ? 'Search collections' : 'Search notes and links'}
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

      <Glass blurTarget={blurTarget}>
        <View className="flex-row gap-1 p-1.5">
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
              className="h-10 w-10 items-center justify-center rounded-full"
              style={active ? { backgroundColor: colors.primary } : undefined}>
              <Icon as={icon} size={18} color={active ? colors.primaryForeground : colors.foreground} />
            </Pressable>
          ))}
        </View>
      </Glass>
    </View>
  );
}
