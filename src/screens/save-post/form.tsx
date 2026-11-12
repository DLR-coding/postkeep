import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, useColorScheme, View } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import { PlatformSticker } from '@/components/platform-sticker';
import { sheetBackgroundStyle } from '@/components/sheet-kit';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { PostFieldsForm, type PostFormValues } from '@/components/post-fields-form';
import { savePost, setPostMetadata } from '@/db/posts';
import { extractCaptionFromText, PLATFORM_META, type AnalyzedUrl } from '@/lib/share-url';
import { fetchOEmbed } from '@/lib/oembed';
import { useExtractMetadata } from '@/lib/webview-metadata';
import { THEME } from '@/lib/theme';

import type { Prefill } from './index';

export function SavePostForm({
  analyzed,
  prefill,
  sharedText,
  metaTitle,
}: {
  analyzed: AnalyzedUrl | null;
  prefill: Prefill;
  sharedText?: string | null;
  metaTitle?: string | null;
}) {
  const { resetShareIntent } = useShareIntentContext();
  const { extractMetadata } = useExtractMetadata();
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];

  const { control, handleSubmit } = useForm<PostFormValues>({
    defaultValues: { note: prefill.note, collectionIds: prefill.collectionIds },
  });
  const [isSaving, setIsSaving] = useState(false);

  // Android suspend les timers JS quand l'app passe en arrière-plan : si l'utilisateur
  // quitte pendant l'enregistrement, le `onHide` du toast ne part qu'à la réouverture
  // suivante et `exitApp()` fermerait alors l'app qu'il vient d'ouvrir.
  const leftDuringSave = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') leftDuringSave.current = true;
    });
    return () => sub.remove();
  }, []);

  const onSubmit = useCallback(
    async (values: PostFormValues) => {
      setIsSaving(true);
      leftDuringSave.current = false;

      // Enregistré tout de suite, avant la récupération des métadonnées : si l'app passe
      // en arrière-plan (timers gelés) ou est tuée pendant « Saving… », le post existe
      // déjà ; le rattrapage (`src/components/metadata-backfill.tsx`) le complétera.
      // Caption priority:
      // 1. Metadata from WebView/oEmbed — most accurate (applied below)
      // 2. meta.title from Android EXTRA_TITLE — some apps set this
      // 3. Caption extracted from shared text (text minus URL)
      const captionFromText = extractCaptionFromText(sharedText, analyzed?.url);
      const postId = savePost({
        id: prefill.postId,
        url: analyzed?.url ?? null,
        note: values.note.trim() || null,
        collectionIds: values.collectionIds,
        // undefined : un re-partage n'efface pas les métadonnées d'un post déjà enregistré.
        caption: metaTitle ?? captionFromText ?? undefined,
      });

      // Récupération des métadonnées selon la plateforme :
      // - Instagram/TikTok : WebView (les plateformes rendent les og:* côté client)
      // - X/Twitter : oEmbed API (fonctionne)
      // - Reddit : flux RSS du post (titre + miniature), sinon oEmbed (titre)
      // - Autres : pas de récupération
      // Échec de récupération (null) → rien n'est remplacé (`setPostMetadata`).
      if (analyzed?.url) {
        if (analyzed.platform === 'instagram' || analyzed.platform === 'tiktok') {
          await setPostMetadata(postId, await extractMetadata(analyzed.url));
        } else if (analyzed.platform === 'x' || analyzed.platform === 'reddit') {
          await setPostMetadata(postId, await fetchOEmbed(analyzed.url, analyzed.platform));
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // `resetShareIntent()` déclenche `hasShareIntent: false` chez le parent,
      // qui redirige vers `/` — repoussé à la fin du toast pour ne pas couper
      // la confirmation avant que PostKeep ne quitte l'app.
      Toast.show({
        type: 'success',
        text1: 'Saved',
        visibilityTime: 1200,
        onHide: () => {
          resetShareIntent();
          // Déjà quittée : on reste sur l'accueil au lieu de refermer l'app.
          if (!leftDuringSave.current) BackHandler.exitApp();
        },
      });
    },
    [analyzed, prefill.postId, resetShareIntent, sharedText, metaTitle, extractMetadata]
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
      backgroundStyle={sheetBackgroundStyle(colors)}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text className="text-xl font-semibold">Save post</Text>
        <View className="mt-4 flex-row items-center gap-3">
          {analyzed?.platform ? (
            <PlatformSticker platform={analyzed.platform} size="md" />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Text variant="muted" className="font-bold">
                ?
              </Text>
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold">{platform?.label ?? 'Unrecognized link'}</Text>
            {analyzed?.url && (
              <Text variant="muted" className="text-[11px]" numberOfLines={1}>
                {analyzed.url}
              </Text>
            )}
          </View>
        </View>

        <PostFieldsForm control={control} />

        <Button className="mt-6 h-12 rounded-2xl" onPress={() => handleSubmit(onSubmit)()} disabled={isSaving}>
          <Text className="font-semibold">{isSaving ? 'Saving…' : 'Save'}</Text>
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
