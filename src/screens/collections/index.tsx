import { FlashList } from '@shopify/flash-list';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Folder, FolderX, Pencil, Plus, Search, Trash2, X } from 'lucide-react-native';
import { type ReactNode, type RefObject, useCallback, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  activeCollectionsQuery,
  type CollectionWithCount,
  createCollection,
  groupCollectionRows,
  renameCollection,
  softDeleteCollection,
  uncategorizedPostsCountQuery,
} from '@/db/collections';
import { THEME } from '@/lib/theme';

import { computeTileSize, GRID_PADDING, NUM_COLUMNS, TILE_MARGIN } from './tile-size';

const UNCATEGORIZED_ID = 'none';

function useTileSize() {
  const { width } = useWindowDimensions();
  return computeTileSize(width);
}

function CollectionTile({
  size,
  onPress,
  onLongPress,
  children,
}: {
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-2 active:scale-95"
      style={{ width: size, height: size, margin: TILE_MARGIN }}>
      {children}
    </Pressable>
  );
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
    Toast.show({ type: 'success', text1: 'Collection supprimée', visibilityTime: 1500 });
    setConfirmOpen(false);
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['40%']}
        enableDynamicSizing={false}
        keyboardBehavior="fillParent"
        backdropComponent={renderBackdrop}
        onDismiss={() => setMode('menu')}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
        <BottomSheetView className="gap-1 px-4 pb-8 pt-2">
          {mode === 'rename' && (
            <View className="gap-3 px-2 py-3">
              <Text variant="large">Renommer</Text>
              <BottomSheetTextInput
                autoFocus
                value={name}
                onChangeText={setName}
                onSubmitEditing={submitRename}
                selectTextOnFocus
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onPress={() => {
                    setName(collection.name);
                    Keyboard.dismiss();
                    setMode('menu');
                  }}>
                  <Text>Annuler</Text>
                </Button>
                <Button className="flex-1" onPress={submitRename}>
                  <Text>Renommer</Text>
                </Button>
              </View>
            </View>
          )}

          {mode === 'menu' && (
            <>
              <Text variant="large" className="px-2 pb-2 pt-1" numberOfLines={1}>
                {collection.name}
              </Text>
              <Pressable
                onPress={() => {
                  setName(collection.name);
                  setMode('rename');
                }}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-muted">
                <Icon as={Pencil} size={20} color={colors.foreground} />
                <Text className="text-base">Renommer</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  sheetRef.current?.dismiss();
                  setConfirmOpen(true);
                }}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-muted">
                <Icon as={Trash2} size={20} color={colors.destructive} />
                <Text className="text-base" style={{ color: colors.destructive }}>
                  Supprimer
                </Text>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {collection.name} » ?</DialogTitle>
            <DialogDescription>Les posts qu’elle contient ne sont pas supprimés.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setConfirmOpen(false)}>
              <Text>Annuler</Text>
            </Button>
            <Button variant="destructive" onPress={handleDelete}>
              <Text>Supprimer</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CollectionCard({ collection, size }: { collection: CollectionWithCount; size: number }) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <CollectionTile
        size={size}
        onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collection.id, name: collection.name } })}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          sheetRef.current?.present();
        }}>
        <Icon as={Folder} size={28} color={colors.primary} />
        <Text numberOfLines={1} className="text-sm font-medium">
          {collection.name}
        </Text>
        <Text variant="muted" className="text-xs">
          {collection.postCount} post{collection.postCount > 1 ? 's' : ''}
        </Text>
      </CollectionTile>
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
      keyboardBehavior="fillParent"
      backdropComponent={renderBackdrop}
      onDismiss={() => setName('')}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetView className="gap-3 px-4 pb-8 pt-2">
        <Text variant="large" className="px-2 pb-1 pt-1">
          Nouvelle collection
        </Text>
        <BottomSheetTextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={submitCreate}
          placeholder="Nom"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              Keyboard.dismiss();
              sheetRef.current?.dismiss();
            }}>
            <Text>Annuler</Text>
          </Button>
          <Button className="flex-1" onPress={submitCreate}>
            <Text>Créer</Text>
          </Button>
        </View>
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

  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCollections = normalizedQuery
    ? collections.filter((collection) => collection.name.toLowerCase().includes(normalizedQuery))
    : collections;
  const showUncategorized =
    uncategorizedCount > 0 && (!normalizedQuery || 'sans collection'.includes(normalizedQuery));
  const nothingFound = !!normalizedQuery && !showUncategorized && filteredCollections.length === 0;

  const gridItems: GridItem[] = [
    ...(showUncategorized ? [{ type: 'uncategorized' as const, count: uncategorizedCount }] : []),
    ...filteredCollections.map((collection) => ({ type: 'collection' as const, collection })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Text className="px-5 pb-2 pt-4 text-3xl font-bold">Collections</Text>

      <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 mx-5 mb-3">
        <Icon as={Search} size={18} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une collection…"
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 py-2.5 text-base text-foreground"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer la recherche">
            <Icon as={X} size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <FlashList<GridItem>
        data={gridItems}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => (item.type === 'uncategorized' ? UNCATEGORIZED_ID : item.collection.id)}
        renderItem={({ item }) =>
          item.type === 'uncategorized' ? (
            <CollectionTile
              size={tileSize}
              onPress={() =>
                router.push({ pathname: '/collection/[id]', params: { id: UNCATEGORIZED_ID, name: 'Sans collection' } })
              }>
              <Icon as={FolderX} size={28} color={colors.mutedForeground} />
              <Text numberOfLines={1} className="text-sm font-medium">
                Sans collection
              </Text>
              <Text variant="muted" className="text-xs">
                {item.count} post{item.count > 1 ? 's' : ''}
              </Text>
            </CollectionTile>
          ) : (
            <CollectionCard collection={item.collection} size={tileSize} />
          )
        }
        ListEmptyComponent={
          nothingFound
            ? () => (
                <Text variant="muted" className="px-2 text-center">
                  Aucune collection ne correspond.
                </Text>
              )
            : undefined
        }
        contentContainerStyle={{ padding: GRID_PADDING - TILE_MARGIN }}
      />

      <Pressable
        onPress={() => createSheetRef.current?.present()}
        accessibilityLabel="Nouvelle collection"
        className="absolute h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/30 active:scale-95"
        style={{ right: 20, bottom: insets.bottom + 20 }}>
        <Icon as={Plus} size={26} color={colors.primaryForeground} />
      </Pressable>
      <CreateCollectionSheet sheetRef={createSheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
