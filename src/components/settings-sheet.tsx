import { type RefObject, useCallback, useState } from 'react';
import { Linking, Pressable, Share, useColorScheme, View } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { ChevronRight, CodeXml, Info, Share2, UserRound } from 'lucide-react-native';

import { SectionLabel } from '@/components/post-fields-form';
import { sheetBackgroundStyle } from '@/components/sheet-kit';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { activePostsQuery, groupPostRows } from '@/db/posts';
import { buildExport, type ThemePreference } from '@/lib/settings-logic';
import { loadThemePreference, saveThemePreference } from '@/lib/settings';
import { THEME } from '@/lib/theme';

const REPO_URL = 'https://github.com/DLR-coding/postkeep';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function Row({
  icon,
  label,
  detail,
  onPress,
  disabled,
  last,
}: {
  icon: typeof Share2;
  label: string;
  detail?: string;
  onPress?: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 py-4 active:opacity-60 ${last ? '' : 'border-b border-border'}`}
      style={disabled ? { opacity: 0.5 } : undefined}>
      <Icon as={icon} size={20} color={colors.foreground} />
      <Text className="flex-1 text-base">{label}</Text>
      {!!detail && (
        <Text variant="muted" className="text-sm">
          {detail}
        </Text>
      )}
      {onPress && !disabled && <Icon as={ChevronRight} size={18} color={colors.mutedForeground} />}
    </Pressable>
  );
}

/** Paramètres : apparence, compte (à venir avec la synchronisation, V1.5), export des
 *  posts, à propos. Ouverte par le bouton ⚙ de l'écran All posts. */
export function SettingsSheet({ sheetRef }: { sheetRef: RefObject<BottomSheetModal | null> }) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [theme, setTheme] = useState<ThemePreference>(loadThemePreference);
  const version = Constants.expoConfig?.version ?? '?';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  const exportPosts = async () => {
    const posts = groupPostRows(await activePostsQuery());
    // shortcut: partage du JSON en texte (feuille de partage Android : Drive, e-mail,
    // notes…), sans écrire de fichier — limite pratique ~500 Ko de texte via Intent ;
    // passer à expo-file-system + expo-sharing si la bibliothèque devient très grosse.
    await Share.share({ title: 'PostKeep export', message: buildExport(posts) });
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['75%']}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBackgroundStyle(colors)}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8, gap: 20 }}>
        <Text className="text-xl font-semibold">Settings</Text>

        <View className="gap-2">
          <SectionLabel>Appearance</SectionLabel>
          <View className="flex-row gap-1.5 rounded-2xl bg-note p-1.5">
            {THEMES.map((t) => {
              const active = t.value === theme;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setTheme(t.value);
                    saveThemePreference(t.value);
                    Haptics.selectionAsync();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  className={`h-10 flex-1 items-center justify-center rounded-xl ${active ? 'bg-primary' : ''}`}>
                  <Text className={`text-sm font-semibold ${active ? 'text-primary-foreground' : ''}`}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <SectionLabel>Account</SectionLabel>
          <Row icon={UserRound} label="Sign in" detail="Coming soon" disabled last />
        </View>

        <View>
          <SectionLabel>Data</SectionLabel>
          <Row icon={Share2} label="Export all posts" detail="JSON" onPress={exportPosts} last />
        </View>

        <View>
          <SectionLabel>About</SectionLabel>
          <Row icon={CodeXml} label="Source code" onPress={() => Linking.openURL(REPO_URL)} />
          <Row icon={Info} label="Version" detail={version} last />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
