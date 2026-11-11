import { type RefObject, useCallback, useRef, useState } from 'react';
import { Linking, Pressable, Share, useColorScheme, View } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { ChevronRight, CodeXml, Info, LogOut, RefreshCw, Share2, Trash2, UserRound } from 'lucide-react-native';

import { AccountSheet } from '@/components/account-sheet';
import { SectionLabel } from '@/components/post-fields-form';
import { ConfirmDialog, sheetBackgroundStyle } from '@/components/sheet-kit';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { activePostsQuery, groupPostRows } from '@/db/posts';
import { buildExport, type ThemePreference } from '@/lib/settings-logic';
import { loadThemePreference, saveThemePreference } from '@/lib/settings';
import { deleteAccount, requestSync, signOut } from '@/lib/sync/account';
import { syncStatusLabel } from '@/lib/sync-status';
import { THEME } from '@/lib/theme';
import { useAccountStore } from '@/stores/account-store';

const REPO_URL = 'https://github.com/DLR-coding/postkeep';
/** Hôte des dialogues ouverts depuis la feuille, pour qu'ils passent au-dessus d'elle. */
const SETTINGS_PORTAL = 'settings-sheet';

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
  destructive,
  last,
}: {
  icon: typeof Share2;
  label: string;
  detail?: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
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
      <Icon as={icon} size={20} color={destructive ? colors.destructive : colors.foreground} />
      <Text className={`flex-1 text-base ${destructive ? 'text-destructive' : ''}`}>{label}</Text>
      {!!detail && (
        <Text variant="muted" className="text-sm">
          {detail}
        </Text>
      )}
      {onPress && !disabled && <Icon as={ChevronRight} size={18} color={colors.mutedForeground} />}
    </Pressable>
  );
}

/** Section « Account » : déconnecté, une ligne qui ouvre `AccountSheet` ; connecté, l'email,
 *  l'état de la synchro (appui = relancer), la déconnexion et la suppression du compte,
 *  confirmées par `ConfirmDialog` dans le `PortalHost` de la feuille. */
function AccountSection() {
  const { userId, email, status, lastSyncedAt, error } = useAccountStore();
  const accountSheetRef = useRef<BottomSheetModal>(null);
  const [confirm, setConfirm] = useState<'signOut' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setActionError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const closeConfirm = (open: boolean) => {
    if (!open) setConfirm(null);
  };

  return (
    <View>
      <SectionLabel>Account</SectionLabel>
      {/* Montée dans les deux états : la connexion réussie bascule la section avant que la
          feuille ne se ferme, elle ne doit pas être démontée en plein vol. */}
      <AccountSheet sheetRef={accountSheetRef} />
      {userId ? (
        <>
          <Row icon={UserRound} label={email ?? 'Signed in'} />
          <Row
            icon={RefreshCw}
            label={syncStatusLabel({ status, lastSyncedAt, error })}
            onPress={status === 'syncing' ? undefined : requestSync}
          />
          <Row icon={LogOut} label="Sign out" onPress={() => setConfirm('signOut')} disabled={busy} />
          <Row
            icon={Trash2}
            label="Delete account"
            onPress={() => setConfirm('delete')}
            disabled={busy}
            destructive
            last={!actionError}
          />
          {!!actionError && <Text className="pt-2 text-sm text-destructive">{actionError}</Text>}
        </>
      ) : (
        <Row
          icon={UserRound}
          label="Sign in"
          detail="Sync & backup"
          onPress={() => accountSheetRef.current?.present()}
          last
        />
      )}
      <ConfirmDialog
        open={confirm === 'signOut'}
        onOpenChange={closeConfirm}
        title="Sign out?"
        description="Your posts will be removed from this phone. They stay in your account."
        confirmLabel="Sign out"
        destructive={false}
        onConfirm={() => run(signOut)}
        portalHost={SETTINGS_PORTAL}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={closeConfirm}
        title="Delete your account?"
        description="This permanently deletes your account and all its posts."
        confirmLabel="Delete account"
        onConfirm={() => run(deleteAccount)}
        portalHost={SETTINGS_PORTAL}
      />
    </View>
  );
}

/** Paramètres : apparence, compte et synchro, export des posts, à propos. Ouverte par le
 *  bouton ⚙ de l'écran All posts. */
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

        <AccountSection />

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
      <PortalHost name={SETTINGS_PORTAL} />
    </BottomSheetModal>
  );
}
