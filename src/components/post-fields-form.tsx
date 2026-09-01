import { type RefObject, useRef, useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Controller, type Control } from 'react-hook-form';
import { isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Check, Plus, X } from 'lucide-react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { db, schema } from '@/db';
import { createCollection } from '@/db/collections';
import type { Collection } from '@/db/schema';
import { THEME } from '@/lib/theme';

const collectionNameSchema = z.string().trim().min(1, 'Nom requis').max(60, 'Nom trop long');

export type PostFormValues = {
  note: string;
  collectionIds: string[];
};

type CollectionField = {
  value: string[];
  onChange: (value: string[]) => void;
};

/** Grille de pills + recherche + création inline — le picker complet, partagé entre
 *  le rendu direct (`variant="picker"`) et la feuille empilée de `variant="chips"`.
 *  Toujours rendu à l'intérieur d'une `BottomSheetModal` (les deux usages en sont
 *  une), d'où `BottomSheetTextInput` sans condition. */
function CollectionPicker({
  field,
  collections,
}: {
  field: CollectionField;
  collections: Collection[];
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [search, setSearch] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const handleCreateCollection = async () => {
    const parsed = collectionNameSchema.safeParse(newCollectionName);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? 'Nom invalide');
      return;
    }
    const collection = await createCollection(parsed.data);
    field.onChange([...field.value, collection.id]);
    setNewCollectionName('');
    setNameError(null);
    setCreatingCollection(false);
    setSearch('');
  };

  // Sélectionnées toujours visibles (même hors filtre, pour ne jamais « perdre »
  // sa sélection en tapant une recherche) — seules les non sélectionnées passent
  // par le filtre.
  const query = search.trim().toLowerCase();
  const visible = collections.filter(
    (collection) =>
      field.value.includes(collection.id) || !query || collection.name.toLowerCase().includes(query)
  );

  return (
    <>
      {collections.length > 6 && (
        <BottomSheetTextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une collection…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
      )}

      <View className="flex-row flex-wrap gap-2">
        {visible.map((collection) => {
          const checked = field.value.includes(collection.id);
          const toggle = () =>
            field.onChange(
              checked
                ? field.value.filter((id) => id !== collection.id)
                : [...field.value, collection.id]
            );
          return (
            <Pressable
              key={collection.id}
              onPress={toggle}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
              style={{ backgroundColor: checked ? colors.primary : colors.muted }}>
              {checked && <Icon as={Check} size={12} color={colors.primaryForeground} />}
              <Text
                className="text-sm"
                style={{ color: checked ? colors.primaryForeground : colors.foreground }}>
                {collection.name}
              </Text>
            </Pressable>
          );
        })}
        {visible.length === 0 && (
          <Text variant="muted" className="text-sm">
            Aucune collection ne correspond.
          </Text>
        )}
      </View>

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
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            setNewCollectionName(search.trim());
            setCreatingCollection(true);
          }}>
          <Text>
            {query && visible.length === 0
              ? `+ Créer « ${search.trim()} »`
              : '+ Nouvelle collection'}
          </Text>
        </Button>
      )}
    </>
  );
}

/** Feuille empilée par-dessus la feuille appelante (le `BottomSheetModalProvider`
 *  racine supporte l'empilement) — héberge le `CollectionPicker` complet, ouverte
 *  depuis la chip « + » de `CollectionChips`. Se ferme par son propre geste
 *  pan-down ; aucune fermeture automatique à la sélection ou à la création.
 *  `stackBehavior="push"` : le comportement par défaut (`switch`) minimise la
 *  feuille déjà montée dès que celle-ci s'enregistre auprès du
 *  `BottomSheetModalProvider` — ici la feuille appelante (aperçu/édition du
 *  post), qui doit rester exactement où elle est pendant que le picker
 *  s'ouvre par-dessus. */
function CollectionPickerSheet({
  sheetRef,
  field,
  collections,
}: {
  sheetRef: RefObject<BottomSheetModal | null>;
  field: CollectionField;
  collections: Collection[];
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <BottomSheetModal
      ref={sheetRef}
      stackBehavior="push"
      snapPoints={['60%']}
      enableDynamicSizing={false}
      keyboardBehavior="fillParent"
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetScrollView contentContainerStyle={styles.pickerContent} keyboardShouldPersistTaps="handled">
        <Text variant="large">Collections</Text>
        <CollectionPicker field={field} collections={collections} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/** Liste horizontale de chips retirables pour les collections sélectionnées —
 *  remplace la grille de pills dans l'écran d'édition (`variant="chips"`). La
 *  chip finale « + » ouvre le picker complet dans `CollectionPickerSheet`. */
function CollectionChips({
  field,
  collections,
}: {
  field: CollectionField;
  collections: Collection[];
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const pickerRef = useRef<BottomSheetModal>(null);
  const selected = collections.filter((collection) => field.value.includes(collection.id));

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {selected.map((collection) => (
          <View
            key={collection.id}
            className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.muted }}>
            <Text className="text-sm">{collection.name}</Text>
            <Pressable
              onPress={() => field.onChange(field.value.filter((id) => id !== collection.id))}
              hitSlop={8}
              accessibilityLabel={`Retirer ${collection.name}`}>
              <Icon as={X} size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => pickerRef.current?.present()}
          accessibilityLabel="Ajouter une collection"
          className="items-center justify-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: colors.muted }}>
          <Icon as={Plus} size={14} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>
      <CollectionPickerSheet sheetRef={pickerRef} field={field} collections={collections} />
    </>
  );
}

/** Bloc « Collections + Note », partagé entre le formulaire de sauvegarde
 *  (`src/screens/save-post/form.tsx`, partage OS) et la feuille de détail en mode
 *  édition (`src/components/post-detail-sheet.tsx`) — les deux dans un
 *  `BottomSheet`. `variant` choisit l'UI des collections : `picker` (grille de
 *  pills + recherche + création, défaut) pour la première sauvegarde, `chips`
 *  (liste retirable + picker en feuille empilée) pour l'édition. */
export function PostFieldsForm({
  control,
  variant = 'picker',
}: {
  control: Control<PostFormValues>;
  variant?: 'picker' | 'chips';
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { data: collections } = useLiveQuery(
    db.select().from(schema.collections).where(isNull(schema.collections.deletedAt))
  );

  const collectionsBlock = (
    <View className="mt-6 gap-3">
      <Text variant="large">Collections</Text>
      <Controller
        control={control}
        name="collectionIds"
        render={({ field }) =>
          variant === 'chips' ? (
            <CollectionChips field={field} collections={collections} />
          ) : (
            <CollectionPicker field={field} collections={collections} />
          )
        }
      />
    </View>
  );

  const noteBlock = (
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
            style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.foreground }]}
          />
        )}
      />
    </View>
  );

  // Collections sous Note en mode édition (chips) ; ordre inchangé pour la
  // première sauvegarde (picker), dont l'UI ne doit pas bouger.
  return variant === 'chips' ? (
    <>
      {noteBlock}
      {collectionsBlock}
    </>
  ) : (
    <>
      {collectionsBlock}
      {noteBlock}
    </>
  );
}

const styles = StyleSheet.create({
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
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  pickerContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 12,
  },
});
