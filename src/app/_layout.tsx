import '../../global.css';

import { Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';

import { PortalHost } from '@rn-primitives/portal';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { NAV_THEME } from '@/lib/theme';

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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShareIntentProvider options={{ debug: __DEV__ }}>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <AnimatedSplashOverlay />
          <ShareIntentRedirect />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="shareintent" options={{ presentation: 'modal' }} />
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}
