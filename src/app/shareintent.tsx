// SMOKE TEST — validation expo-share-intent vs SDK 57 (fin étape 8 d'INIT.md).
// Affiche les données brutes reçues. L'écran de sauvegarde réel (collection + note) est hors
// scope de cette phase d'initialisation — voir INIT.md §7, périmètre V1, point 2.
import { useEffect } from 'react';
import { View } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function ShareIntentScreen() {
  const router = useRouter();
  const { shareIntent, hasShareIntent, resetShareIntent, error, isReady } =
    useShareIntentContext();

  useEffect(() => {
    if (isReady && !hasShareIntent) {
      router.replace('/');
    }
  }, [isReady, hasShareIntent, router]);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text>Chargement…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
        <Text className="text-destructive">{error}</Text>
        <Button
          onPress={() => {
            resetShareIntent();
            router.replace('/');
          }}>
          <Text>Retour</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4 bg-background p-6">
      <Text variant="large">Partage reçu (expo-share-intent) :</Text>
      <Text>type: {shareIntent.type ?? 'inconnu'}</Text>
      {shareIntent.text && <Text>text: {shareIntent.text}</Text>}
      {shareIntent.webUrl && <Text>webUrl: {shareIntent.webUrl}</Text>}
      <Button
        onPress={() => {
          resetShareIntent();
          router.replace('/');
        }}>
        <Text>Retour à l'accueil</Text>
      </Button>
    </View>
  );
}
