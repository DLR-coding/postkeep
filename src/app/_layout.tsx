import '../../global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, ThemeProvider, useRouter } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PortalHost } from '@rn-primitives/portal';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { db } from '@/db';
import migrations from '@/db/migrations/migrations';
import { NAV_THEME, THEME } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// Écoute le partage à la racine : nécessaire pour capter un nouveau partage quand
// l'app est déjà ouverte en arrière-plan (relance via singleTask, pas un cold start —
// +native-intent.tsx ne couvre que le cold start).
function ShareIntentRedirect() {
  const router = useRouter();
  const { hasShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent) {
      router.push('/shareintent');
    }
  }, [hasShareIntent, router]);

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
            La base de données n’a pas pu démarrer
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShareIntentProvider options={{ debug: __DEV__ }}>
        <ThemeProvider value={NAV_THEME[colorScheme]}>
          <AnimatedSplashOverlay />
          {/* Le partage n'est routé qu'une fois les migrations passées : l'écran de
              sauvegarde lit les collections dès son montage. */}
          {success && <ShareIntentRedirect />}
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="shareintent" options={{ presentation: 'modal' }} />
          </Stack>
          {!success && <MigrationGate error={error} />}
          <PortalHost />
        </ThemeProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
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
