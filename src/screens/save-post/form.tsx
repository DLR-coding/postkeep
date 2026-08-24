import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, useColorScheme, View } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Controller, useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { db, schema } from '@/db';
import { createCollection } from '@/db/collections';
import { savePost } from '@/db/posts';
import { PLATFORM_META, type AnalyzedUrl } from '@/lib/share-url';
import { THEME } from '@/lib/theme';

import type { Prefill } from './index';

const collectionNameSchema = z.string().trim().min(1, 'Nom requis').max(60, 'Nom trop long');

type FormValues = {
  note: string;
  collectionIds: string[];
};

export function SavePostForm({
  analyzed,
  prefill,
}: {
  analyzed: AnalyzedUrl | null;
  prefill: Prefill;
}) {
  const { resetShareIntent } = useShareIntentContext();
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];

  const { data: collections } = useLiveQuery(
    db.select().from(schema.collections).where(isNull(schema.collections.deletedAt))
  );

  const { control, handleSubmit, setValue, getValues } = useForm<FormValues>({
    defaultValues: { note: prefill.note, collectionIds: prefill.collectionIds },
  });

  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const handleCreateCollection = useCallback(async () => {
    const parsed = collectionNameSchema.safeParse(newCollectionName);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? 'Nom invalide');
      return;
    }
    const collection = await createCollection(parsed.data);
    setValue('collectionIds', [...getValues('collectionIds'), collection.id]);
    setNewCollectionName('');
    setNameError(null);
    setCreatingCollection(false);
  }, [newCollectionName, setValue, getValues]);

  const onSubmit = useCallback(
    (values: FormValues) => {
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

        <View className="mt-6 gap-3">
          <Text variant="large">Collections</Text>
          <Controller
            control={control}
            name="collectionIds"
            render={({ field }) => (
              <View className="gap-3">
                {collections.map((collection) => {
                  const checked = field.value.includes(collection.id);
                  const toggle = () =>
                    field.onChange(
                      checked
                        ? field.value.filter((id) => id !== collection.id)
                        : [...field.value, collection.id]
                    );
                  return (
                    <View key={collection.id} className="flex-row items-center gap-3">
                      <Checkbox checked={checked} onCheckedChange={toggle} />
                      <Label onPress={toggle}>{collection.name}</Label>
                    </View>
                  );
                })}
              </View>
            )}
          />

          {creatingCollection ? (
            <View className="gap-2">
              <BottomSheetTextInput
                autoFocus
                value={newCollectionName}
                onChangeText={(text) => {
                  setNewCollectionName(text);
                  if (nameError) setNameError(null);
                }}
                onSubmitEditing={handleCreateCollection}
                placeholder="Nom de la collection"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              {nameError && <Text className="text-destructive">{nameError}</Text>}
              <View className="flex-row gap-2">
                <Button size="sm" onPress={handleCreateCollection}>
                  <Text>Ajouter</Text>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    setCreatingCollection(false);
                    setNewCollectionName('');
                    setNameError(null);
                  }}>
                  <Text>Annuler</Text>
                </Button>
              </View>
            </View>
          ) : (
            <Button variant="outline" size="sm" onPress={() => setCreatingCollection(true)}>
              <Text>+ Nouvelle collection</Text>
            </Button>
          )}
        </View>

        <View className="mt-6 gap-3">
          <Text variant="large">Note</Text>
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <BottomSheetTextInput
                value={field.value}
                onChangeText={field.onChange}
                multiline
                numberOfLines={4}
                placeholder="Ajouter une note…"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  styles.textarea,
                  { borderColor: colors.border, color: colors.foreground },
                ]}
              />
            )}
          />
        </View>

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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
