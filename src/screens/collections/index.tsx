import { FlashList } from '@shopify/flash-list';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { CollectionChip } from '@/components/collection-chip';
import { ConfirmDialog, sheetBackgroundStyle, SheetActions, SheetField } from '@/components/sheet-kit';
import { TAB_BAR_CLEARANCE } from '@/components/glass-tab-bar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  activeCollectionsQuery,
  collectionPreviewRowsQuery,
  type CollectionWithCount,
  createCollection,
  groupCollectionRows,
  renameCollection,
  softDeleteCollection,
  uncategorizedPostsCountQuery,
} from '@/db/collections';
import { buildCollectionPreviews, type CollectionPreview, UNCATEGORIZED_KEY } from '@/lib/collection-previews';
import { filterCollectionsByName, matchesText } from '@/lib/post-filters';
import { THEME } from '@/lib/theme';
import { useNavSearchStore } from '@/stores/nav-search-store';

import { CollectionFolder } from './folder';
import { computeTileSize, GRID_PADDING, NUM_COLUMNS, TILE_MARGIN } from './tile-size';

const UNCATEGORIZED_ID = UNCATEGORIZED_KEY;

function useTileSize() {
  const { width } = useWindowDimensions();
  return computeTileSize(width);
}

type ActionsSheetMode = 'menu' | 'rename';

/** Feuille d'actions (renommer/supprimer) au long-press d'une tuile — remplace
 *  l'`Alert.alert` natif et le `MenuView` de `@expo/ui` (jugés trop génériques,
 *  visuellement décalés du reste de l'app) par un `BottomSheetModal` stylé
 *  comme le reste de l'app, cohérent avec les autres feuilles du projet
 *  (`post-detail-sheet.tsx`, `CollectionPickerSheet`). Renommer est un état
 *  interne de la feuille (plutôt que l'édition inline sur la tuile) ; la
 *  confirmation de suppression est un `Dialog` séparé (`@/components/ui/dialog`,
 *  React Native Reusables) plutôt qu'un état de plus dans la feuille — demandé
 *  explicitement pour distinguer visuellement « choisir une action » (feuille)
 *  de « confirmer une action destructrice » (dialog centré, overlay).
 *  `snapPoints` fixe + `enableDynamicSizing={false}` : même combo que
 *  `CollectionPickerSheet` (`post-fields-form.tsx`), le seul dont on sait
 *  qu'il gère correctement le clavier avec `BottomSheetTextInput` sur cette
 *  version de `@gorhom/bottom-sheet` — `enableDynamicSizing` + clavier n'est
 *  pas un combo documenté. `backdropComponent` : sans lui, la feuille n'a pas
 *  de zone tactile derrière elle, donc rien ne se ferme au tap en dehors. */
function CollectionActionsSheet({
  sheetRef,
  collection,
}: {
  sheetRef: RefObject<BottomSheetModal | null>;
  collection: CollectionWithCount;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [mode, setMode] = useState<ActionsSheetMode>('menu');
  const [name, setName] = useState(collection.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  const submitRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== collection.name) renameCollection(collection.id, trimmed);
    Keyboard.dismiss();
    sheetRef.current?.dismiss();
  };

  const handleDelete = () => {
    softDeleteCollection(collection.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: 'Collection deleted', visibilityTime: 1500 });
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['40%']}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        onDismiss={() => setMode('menu')}
        backgroundStyle={sheetBackgroundStyle(colors)}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
        <BottomSheetView className="px-6 pb-8 pt-2">
          {mode === 'rename' && (
            <View className="gap-4 py-2">
              <Text className="text-xl font-semibold">Rename</Text>
              <SheetField
                autoFocus
                value={name}
                onChangeText={setName}
                onSubmitEditing={submitRename}
                selectTextOnFocus
              />
              <SheetActions
                onCancel={() => {
                  setName(collection.name);
                  Keyboard.dismiss();
                  setMode('menu');
                }}
                confirmLabel="Rename"
                confirmDisabled={!name.trim()}
                onConfirm={submitRename}
              />
            </View>
          )}

          {mode === 'menu' && (
            <>
              <View className="flex-row items-center gap-3 pb-3 pt-1">
                <CollectionChip name={collection.name} size="md" />
                <Text variant="muted" className="text-sm">
                  {collection.postCount} post{collection.postCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setName(collection.name);
                  setMode('rename');
                }}
                className="flex-row items-center gap-3 border-b border-border py-4 active:opacity-60">
                <Icon as={Pencil} size={20} color={colors.foreground} />
                <Text className="text-base">Rename</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  sheetRef.current?.dismiss();
                  setConfirmOpen(true);
                }}
                className="flex-row items-center gap-3 py-4 active:opacity-60">
                <Icon as={Trash2} size={20} color={colors.destructive} />
                <Text className="text-base" style={{ color: colors.destructive }}>
                  Delete
                </Text>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${collection.name}"?`}
        description="The posts it contains are not deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}

function CollectionCard({
  collection,
  size,
  preview,
}: {
  collection: CollectionWithCount;
  size: number;
  preview: CollectionPreview | undefined;
}) {
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <CollectionFolder
        name={collection.name}
        count={collection.postCount}
        preview={preview}
        size={size}
        onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collection.id, name: collection.name } })}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          sheetRef.current?.present();
        }}
      />
      <CollectionActionsSheet sheetRef={sheetRef} collection={collection} />
    </>
  );
}

/** Feuille de création, ouverte depuis le bouton flottant — même combo
 *  `snapPoints`/`enableDynamicSizing`/`backdropComponent` que
 *  `CollectionActionsSheet` pour les mêmes raisons (clavier + tap-outside). */
function CreateCollectionSheet({ sheetRef }: { sheetRef: RefObject<BottomSheetModal | null> }) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [name, setName] = useState('');

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (trimmed) await createCollection(trimmed);
    Keyboard.dismiss();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['40%']}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      onDismiss={() => setName('')}
      backgroundStyle={sheetBackgroundStyle(colors)}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetView className="gap-4 px-6 pb-8 pt-2">
        <Text className="text-xl font-semibold">New collection</Text>
        <SheetField autoFocus value={name} onChangeText={setName} onSubmitEditing={submitCreate} placeholder="Name" />
        {/* Aperçu de la puce telle qu'elle apparaîtra (teinte calculée depuis le nom). */}
        <View style={{ minHeight: 32, justifyContent: 'center' }}>
          {name.trim() ? (
            <CollectionChip name={name.trim()} size="md" />
          ) : (
            <Text variant="muted" className="text-sm">
              Its colour comes from its name.
            </Text>
          )}
        </View>
        <SheetActions
          onCancel={() => {
            Keyboard.dismiss();
            sheetRef.current?.dismiss();
          }}
          confirmLabel="Create"
          confirmDisabled={!name.trim()}
          onConfirm={submitCreate}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

type GridItem = { type: 'uncategorized'; count: number } | { type: 'collection'; collection: CollectionWithCount };

export function CollectionsScreen() {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tileSize = useTileSize();
  const createSheetRef = useRef<BottomSheetModal>(null);
  const { data: collectionRows } = useLiveQuery(activeCollectionsQuery());
  const collections = groupCollectionRows(collectionRows);
  const { data: uncategorizedRows } = useLiveQuery(uncategorizedPostsCountQuery());
  const uncategorizedCount = uncategorizedRows[0]?.count ?? 0;
  const { data: previewRows } = useLiveQuery(collectionPreviewRowsQuery());
  const previews = useMemo(() => buildCollectionPreviews(previewRows), [previewRows]);
  const totalPosts = useMemo(() => new Set(previewRows.map((row) => row.postId)).size, [previewRows]);

  const query = useNavSearchStore((s) => s.query).trim();
  const filteredCollections = filterCollectionsByName(collections, query);
  const showUncategorized = uncategorizedCount > 0 && (!query || matchesText('No collection', query));
  const nothingFound = !!query && !showUncategorized && filteredCollections.length === 0;

  const gridItems: GridItem[] = [
    ...(showUncategorized ? [{ type: 'uncategorized' as const, count: uncategorizedCount }] : []),
    ...filteredCollections.map((collection) => ({ type: 'collection' as const, collection })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-1 pt-4">
        <Text className="text-3xl font-bold">Collections</Text>
        <Pressable
          onPress={() => createSheetRef.current?.present()}
          accessibilityLabel="New collection"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary active:scale-95">
          <Icon as={Plus} size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
      <Text variant="muted" className="px-5 pb-3 text-xs">
        {collections.length} collection{collections.length === 1 ? '' : 's'} · {totalPosts} post
        {totalPosts === 1 ? '' : 's'}
      </Text>

      <FlashList<GridItem>
        // Glisser la liste ferme le clavier : sans ça, pendant une recherche, les
        // derniers résultats restent sous le clavier et la barre (edge-to-edge).
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        data={gridItems}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => (item.type === 'uncategorized' ? UNCATEGORIZED_ID : item.collection.id)}
        renderItem={({ item }) => (
          <View style={{ margin: TILE_MARGIN }}>
            {item.type === 'uncategorized' ? (
              <CollectionFolder
                name="No collection"
                count={item.count}
                preview={previews.get(UNCATEGORIZED_KEY)}
                virtual
                size={tileSize}
                onPress={() =>
                  router.push({ pathname: '/collection/[id]', params: { id: UNCATEGORIZED_ID, name: 'No collection' } })
                }
              />
            ) : (
              <CollectionCard
                collection={item.collection}
                size={tileSize}
                preview={previews.get(item.collection.id)}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          nothingFound
            ? () => (
                <Text variant="muted" className="px-2 text-center">
                  No matching collection.
                </Text>
              )
            : undefined
        }
        contentContainerStyle={{
          padding: GRID_PADDING - TILE_MARGIN,
          paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + 16,
        }}
      />

      <CreateCollectionSheet sheetRef={createSheetRef} />
    </SafeAreaView>
  );
}
