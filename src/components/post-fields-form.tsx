import { type RefObject, useEffect, useRef, useState } from 'react';
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
          placeholder="Search for a collection…"
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
            No matching collection.
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
            placeholder="Collection name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          {nameError && <Text className="text-destructive">{nameError}</Text>}
          <View className="flex-row gap-2">
            <Button size="sm" onPress={handleCreateCollection}>
              <Text>Add</Text>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setCreatingCollection(false);
                setNewCollectionName('');
                setNameError(null);
              }}>
              <Text>Cancel</Text>
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
              ? `+ Create "${search.trim()}"`
              : '+ New collection'}
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

/** Grille de chips retirables pour les collections sélectionnées, repliée sur
 *  2 lignes fixes puis scrollable à l'horizontal au-delà (les chips
 *  remplissent les 2 lignes d'une colonne avant d'ouvrir la suivante à
 *  droite) — remplace la grille de pills dans l'écran d'édition
 *  (`variant="chips"`). La chip finale « + » ouvre le picker complet dans
 *  `CollectionPickerSheet`. */
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
      <ScrollView
        horizontal
        style={styles.chipsScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsWrap}>
        {selected.map((collection) => (
          <View
            key={collection.id}
            className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.muted }}>
            <Text className="text-sm">{collection.name}</Text>
            <Pressable
              onPress={() => field.onChange(field.value.filter((id) => id !== collection.id))}
              hitSlop={8}
              accessibilityLabel={`Remove ${collection.name}`}>
              <Icon as={X} size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => pickerRef.current?.present()}
          accessibilityLabel="Add a collection"
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
  const [noteInputHeight, setNoteInputHeight] = useState(0);
  // ponytail: debug temporaire pour instrumenter le bug de hauteur de la Note
  // (chaque valeur vient d'un `onLayout`/`onContentSizeChange` distinct pour
  // localiser où la taille du texte contamine la chaîne flex) — à retirer une
  // fois le vrai fix posé.
  const [debug, setDebug] = useState({ outer: 0, collections: 0, noteBlock: 0, noteWrapper: 0, content: 0 });
  // ponytail: doublon Metro du bandeau à l'écran, pour ne rien perdre si le
  // bandeau est masqué par le clavier — à retirer avec le reste du debug.
  useEffect(() => {
    console.log('[note-debug]', debug);
  }, [debug]);
  const { data: collections } = useLiveQuery(
    db.select().from(schema.collections).where(isNull(schema.collections.deletedAt))
  );

  const collectionsBlock = (
    <View
      className="mt-6 gap-3"
      onLayout={(e) => {
        const height = e.nativeEvent?.layout?.height;
        if (height == null) return;
        setDebug((d) => ({ ...d, collections: height }));
      }}>
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
    <View
      className={variant === 'chips' ? 'mt-6 min-h-0 flex-1 gap-3' : 'mt-6 gap-3'}
      onLayout={(e) => {
        const height = e.nativeEvent?.layout?.height;
        if (height == null) return;
        setDebug((d) => ({ ...d, noteBlock: height }));
      }}>
      <Text variant="large">Note</Text>
      <Controller
        control={control}
        name="note"
        render={({ field }) => {
          const input = (
            <BottomSheetTextInput
              value={field.value}
              onChangeText={field.onChange}
              onContentSizeChange={(e) => {
                const height = e.nativeEvent?.contentSize?.height;
                if (height == null) return;
                setDebug((d) => ({ ...d, content: height }));
              }}
              multiline
              numberOfLines={variant === 'chips' ? undefined : 4}
              placeholder="Add a note…"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                // Une fois mesurée (ci-dessous), la hauteur est fixée en dur
                // plutôt que par flex : sur Android, un `TextInput` multiline
                // ignore la hauteur résolue par `flexGrow`/`flexBasis` et
                // grandit avec son contenu au lieu de scroller en interne.
                variant === 'chips'
                  ? noteInputHeight
                    ? { height: noteInputHeight, textAlignVertical: 'top' }
                    : styles.textareaFlex
                  : styles.textarea,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />
          );
          return variant === 'chips' ? (
            <View
              className="min-h-0 flex-1"
              onLayout={(e) => {
                const height = e.nativeEvent?.layout?.height;
                if (height == null) return;
                setNoteInputHeight(height);
                setDebug((d) => ({ ...d, noteWrapper: height }));
              }}>
              {input}
            </View>
          ) : (
            input
          );
        }}
      />
    </View>
  );

  // Collections en haut / Note en dessous en mode édition (chips), Note prend
  // le reste de l'espace (`flex-1`) pour scroller elle-même plutôt que la page
  // entière ; ordre inchangé pour la première sauvegarde (picker), dont l'UI
  // ne doit pas bouger. `min-h-0` partout dans la chaîne : par défaut un enfant
  // flex ne rétrécit pas sous la taille de son contenu (`minHeight: auto` côté
  // Yoga, comme en CSS), ce qui empêchait la Note de céder sa place réelle.
  return variant === 'chips' ? (
    <View
      className="min-h-0 flex-1"
      onLayout={(e) => {
        const height = e.nativeEvent?.layout?.height;
        if (height == null) return;
        setDebug((d) => ({ ...d, outer: height }));
      }}>
      {/* ponytail: overlay de debug temporaire, à retirer avec le reste de
          l'instrumentation une fois la vraie fuite localisée. */}
      <View pointerEvents="none" style={styles.debugOverlay}>
        <Text style={styles.debugText}>
          outer={debug.outer.toFixed(0)} collections={debug.collections.toFixed(0)}{'\n'}
          noteBlock={debug.noteBlock.toFixed(0)} noteWrapper={debug.noteWrapper.toFixed(0)}{'\n'}
          content={debug.content.toFixed(0)}
        </Text>
      </View>
      {collectionsBlock}
      {noteBlock}
    </View>
  ) : (
    <>
      {collectionsBlock}
      {noteBlock}
    </>
  );
}

// ~2 lignes de chips (hauteur ~32px chacune + gap) — hauteur fixe (pas
// `maxHeight`) : un `flexWrap: 'wrap'` en colonne a besoin d'une taille de
// l'axe croisé définie pour savoir quand ouvrir une nouvelle colonne.
const CHIPS_HEIGHT = 76;

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
  textareaFlex: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    height: CHIPS_HEIGHT,
  },
  chipsWrap: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: CHIPS_HEIGHT,
    gap: 8,
    paddingVertical: 2,
  },
  pickerContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 12,
  },
  // ponytail: debug temporaire (cf. plus haut), à retirer avec le reste.
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: 'rgba(255,0,0,0.85)',
    padding: 4,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
