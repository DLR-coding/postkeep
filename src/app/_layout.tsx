import '../../global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';

import { PortalHost } from '@rn-primitives/portal';

import { MetadataBackfill } from '@/components/metadata-backfill';
import { PostDetailSheet } from '@/components/post-detail-sheet';
import { db } from '@/db';
import { useAccountSync } from '@/hooks/use-account-sync';
import migrations from '@/db/migrations/migrations';
import { NAV_THEME, THEME } from '@/lib/theme';
import { MetadataExtractorProvider } from '@/lib/webview-metadata';
import { PIN_SHARE_URL } from '@/screens/onboarding/pin-step';
import { useAccountStore } from '@/stores/account-store';
import { applyThemePreference, loadThemePreference } from '@/lib/settings';

// Thème choisi dans les Paramètres, appliqué avant le premier rendu.
applyThemePreference(loadThemePreference());

SplashScreen.preventAutoHideAsync();

// Écoute le partage à la racine : nécessaire pour capter un nouveau partage quand
// l'app est déjà ouverte en arrière-plan (relance via singleTask, pas un cold start —
// +native-intent.tsx ne couvre que le cold start).
//
// Compte obligatoire : sans session, le partage attend (il reste dans le contexte) et s'ouvre
// une fois le compte créé. Le lien partagé depuis la page d'épinglage de l'onboarding est
// ignoré : l'utilisateur a touché PostKeep au lieu de seulement l'épingler.
function ShareIntentRedirect() {
  const router = useRouter();
  const userId = useAccountStore((s) => s.userId);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    if ((shareIntent.webUrl ?? shareIntent.text ?? '').startsWith(PIN_SHARE_URL)) {
      resetShareIntent();
      return;
    }
    if (userId) router.push('/shareintent');
  }, [hasShareIntent, shareIntent, resetShareIntent, userId, router]);

  return null;
}

/** Compte obligatoire : sans session, l'app ouvre l'onboarding (ou son étape du compte). */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const authReady = useAccountStore((s) => s.authReady);
  const userId = useAccountStore((s) => s.userId);

  useEffect(() => {
    if (authReady && !userId && segments[0] !== 'onboarding') router.replace('/onboarding');
  }, [authReady, userId, segments, router]);

  return null;
}

/**
 * Calque d'attente/erreur des migrations.
 *
 * C'est un calque et non un rendu alternatif parce que le Stack doit rester monté :
 * expo-router refuse une navigation tant que le navigateur racine n'existe pas, et
 * un partage peut arriver dès la première frame.
 *
 * zIndex volontairement sous celui du splash (1000) : dans le cas normal les
 * migrations finissent avant la fin de l'animation et ce calque n'est jamais vu.
 */
function MigrationGate({ error }: { error?: Error }) {
  // `useColorScheme()` renvoie null ou 'unspecified' selon la plateforme : `?? 'light'`
  // ne suffit pas à retomber sur un thème valide.
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.gate, { backgroundColor: colors.background }]}>
      {error ? (
        <>
          <Text style={[styles.gateTitle, { color: colors.destructive }]}>
            The database could not start
          </Text>
          <Text style={[styles.gateDetail, { color: colors.mutedForeground }]}>
            {error.message}
          </Text>
        </>
      ) : (
        <ActivityIndicator color={colors.foreground} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { success, error } = useMigrations(db, migrations);
  useAccountSync(success);
  const authReady = useAccountStore((s) => s.authReady);

  // Le splash attend aussi la session : sinon l'accueil apparaîtrait un instant avant que la
  // barrière du compte n'ouvre l'onboarding.
  useEffect(() => {
    if ((success && authReady) || error) {
      SplashScreen.hideAsync();
    }
  }, [success, authReady, error]);

  return (
    <KeyboardProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ShareIntentProvider options={{ debug: __DEV__ }}>
          <ThemeProvider value={NAV_THEME[colorScheme]}>
            {/* Icônes de la barre d'état selon le thème : sans ça elles restaient
                blanches en mode clair depuis la barre d'onglets JS (refonte). */}
            <StatusBar style="auto" />
            <BottomSheetModalProvider>
              <MetadataExtractorProvider>
                {/* Le partage n'est routé qu'une fois les migrations passées : l'écran de
                    sauvegarde lit les collections dès son montage. */}
                {success && <ShareIntentRedirect />}
                {success && <AuthGate />}
                {success && <MetadataBackfill />}
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="shareintent" options={{ presentation: 'modal', headerShown: false }} />
                  <Stack.Screen name="collection/[id]" />
                  <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
                </Stack>
                <PostDetailSheet />
                {!success && <MigrationGate error={error} />}
                <PortalHost />
                <Toast />
              </MetadataExtractorProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </ShareIntentProvider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    zIndex: 999,
  },
  gateTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  gateDetail: {
    fontSize: 13,
    textAlign: 'center',
  },
});
