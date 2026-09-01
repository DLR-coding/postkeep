import { useCallback } from 'react';
import { BackHandler, StyleSheet, useColorScheme, View } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { PostFieldsForm, type PostFormValues } from '@/components/post-fields-form';
import { savePost } from '@/db/posts';
import { PLATFORM_META, type AnalyzedUrl } from '@/lib/share-url';
import { THEME } from '@/lib/theme';

import type { Prefill } from './index';

export function SavePostForm({
  analyzed,
  prefill,
}: {
  analyzed: AnalyzedUrl | null;
  prefill: Prefill;
}) {
  const { resetShareIntent } = useShareIntentContext();
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];

  const { control, handleSubmit } = useForm<PostFormValues>({
    defaultValues: { note: prefill.note, collectionIds: prefill.collectionIds },
  });

  const onSubmit = useCallback(
    (values: PostFormValues) => {
      savePost({
        id: prefill.postId,
        url: analyzed?.url ?? null,
        note: values.note.trim() || null,
        collectionIds: values.collectionIds,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // `resetShareIntent()` déclenche `hasShareIntent: false` chez le parent,
      // qui redirige vers `/` — repoussé à la fin du toast pour ne pas couper
      // la confirmation avant que PostKeep ne quitte l'app.
      Toast.show({
        type: 'success',
        text1: 'Enregistré',
        visibilityTime: 1200,
        onHide: () => {
          resetShareIntent();
          BackHandler.exitApp();
        },
      });
    },
    [analyzed?.url, prefill.postId, resetShareIntent]
  );

  const platform = analyzed?.platform ? PLATFORM_META[analyzed.platform] : null;

  return (
    <BottomSheet
      index={0}
      snapPoints={['90%']}
      enableDynamicSizing={false}
      // ponytail: pas de fermeture par balayage — aucun parcours d'annulation
      // n'est spécifié pour cette phase, un swipe accidentel laisserait la
      // feuille fermée sans revenir à l'app d'origine ni réinitialiser le
      // partage. Le bouton retour Android (route modale expo-router) reste le
      // chemin d'annulation.
      enablePanDownToClose={false}
      keyboardBehavior="fillParent"
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: platform?.color ?? colors.muted }}>
            <Text
              className="text-xs font-bold"
              style={{ color: platform ? '#fff' : colors.mutedForeground }}>
              {platform?.badge ?? '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text variant="small">{platform?.label ?? 'Lien non reconnu'}</Text>
            {analyzed?.url && (
              <Text variant="muted" numberOfLines={1}>
                {analyzed.url}
              </Text>
            )}
          </View>
        </View>

        <PostFieldsForm control={control} />

        <Button className="mt-6" onPress={handleSubmit(onSubmit)}>
          <Text>Enregistrer</Text>
        </Button>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 48,
  },
});
