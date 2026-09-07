import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackgroundProps,
  type BottomSheetFooterProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { ChevronUp, Trash2, X } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PostFieldsForm, type PostFormValues } from '@/components/post-fields-form';
import {
  groupPostRows,
  markPostOpened,
  postByIdQuery,
  postCollectionIdsQuery,
  savePost,
  softDeletePost,
  type PostListItem,
} from '@/db/posts';
import { detectPlatform, PLATFORM_META } from '@/lib/share-url';
import { THEME } from '@/lib/theme';
import { usePostDetailStore } from '@/stores/post-detail-store';

type Colors = (typeof THEME)['light'];
type PlatformMeta = (typeof PLATFORM_META)[keyof typeof PLATFORM_META];

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const PREVIEW_INDEX = 0;
const EDIT_INDEX = 1;

/** Fond animé : rayon des coins interpolé sur `animatedIndex`, plein (24px) à
 *  l'aperçu (50 %), nul en plein écran (édition) — pour que la feuille couvre
 *  vraiment tout l'écran une fois tirée en haut. */
function AnimatedBackground({ style, animatedIndex }: BottomSheetBackgroundProps) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const animatedStyle = useAnimatedStyle(() => {
    const radius = interpolate(animatedIndex.value, [PREVIEW_INDEX, EDIT_INDEX], [24, 0], Extrapolation.CLAMP);
    return { borderTopLeftRadius: radius, borderTopRightRadius: radius };
  });
  return (
    <Animated.View pointerEvents="none" style={[style, { backgroundColor: colors.card }, animatedStyle]} />
  );
}

/** Poignée de drag animée : s'efface en approchant du plein écran, où elle n'a
 *  plus de sens (rien à re-snapper au-dessus). */
function AnimatedHandle({ animatedIndex }: BottomSheetHandleProps) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [PREVIEW_INDEX, EDIT_INDEX], [1, 0], Extrapolation.CLAMP),
  }));
  return (
    <View className="items-center py-3">
      <Animated.View
        style={[
          { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.mutedForeground },
          animatedStyle,
        ]}
      />
    </View>
  );
}

function PlatformHeader({ url, meta, colors }: { url: string | null; meta: PlatformMeta | null; colors: Colors }) {
  return (
    <View className="flex-row items-center gap-3">
      <View
        className="h-12 w-12 items-center justify-center rounded-full shadow-sm shadow-black/10"
        style={{ backgroundColor: meta?.color ?? colors.muted }}>
        <Text className="text-sm font-bold" style={{ color: meta ? '#fff' : colors.mutedForeground }}>
          {meta?.badge ?? '?'}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold">{meta?.label ?? 'Texte'}</Text>
        {!!url && (
          <Text variant="muted" className="text-xs" numberOfLines={1} selectable>
            {url}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Feuille unique montée une fois à la racine (`_layout.tsx`) : aperçu léger au
 *  tap sur une carte, sans navigation. La tirer jusqu'en haut (snapPoint plein
 *  écran) morphe son contenu en formulaire d'édition — pattern « Now Playing »
 *  (Spotify/Apple Podcasts/Gmail compose) : un seul geste continu, pas de route
 *  séparée. `BottomSheetModal` hérite des mêmes props clavier que `BottomSheet`
 *  (`keyboardBehavior`, `android_keyboardInputMode`) déjà validées sur appareil
 *  par `src/screens/save-post/form.tsx` — le formulaire n'a donc pas besoin de
 *  `KeyboardAwareScrollView` ici, contrairement à l'ancien écran séparé. */
export function PostDetailSheet() {
  const postId = usePostDetailStore((s) => s.postId);
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [index, setIndex] = useState(PREVIEW_INDEX);
  const [isDeleting, setIsDeleting] = useState(false);
  // `BottomSheetView` (contenu non-scrollable de l'édition, cf. plus bas) n'a
  // pas l'ajustement automatique de marge qu'offre `enableFooterMarginAdjustment`
  // sur les composants scrollables — mesuré via `onLayout` sur le footer.
  const [footerHeight, setFooterHeight] = useState(0);

  // Repart de l'aperçu à chaque nouveau post ouvert (y compris en passant
  // directement d'un post à un autre sans fermer la feuille entre les deux) —
  // ajustement pendant le rendu plutôt que dans un effet, comme `frozenPost`
  // plus bas : on évite un rendu en cascade pour une réinitialisation qui ne
  // dépend que d'un changement de prop.
  const [lastPostId, setLastPostId] = useState<string | null>(null);
  if (postId !== lastPostId) {
    setLastPostId(postId);
    if (postId && index !== PREVIEW_INDEX) setIndex(PREVIEW_INDEX);
  }

  // `useLiveQuery(query, deps)` — `deps` vaut `[]` par défaut dans le driver
  // (node_modules/drizzle-orm/expo-sqlite/query.js) : sans le passer, l'effet
  // interne ne s'exécute qu'au montage et ne se relance jamais. Ce composant
  // reste monté à la racine et change de post dans le temps, contrairement au
  // reste de l'app où chaque écran est remonté à chaque navigation.
  const { data: rows } = useLiveQuery(postByIdQuery(postId ?? ''), [postId]);
  const post = useMemo(() => groupPostRows(rows)[0] ?? null, [rows]);
  const { data: collectionRows } = useLiveQuery(postCollectionIdsQuery(postId ?? ''), [postId]);
  const collectionIds = useMemo(() => collectionRows.map((row) => row.collectionId), [collectionRows]);

  // Garde anti-flash : `deleted_at` posé fait disparaître la ligne de la requête
  // réactive avant la fin de l'animation de fermeture de la feuille.
  const [frozenPost, setFrozenPost] = useState<PostListItem | null>(null);
  if (!isDeleting && frozenPost !== post) setFrozenPost(post);
  const displayedPost = isDeleting ? frozenPost : post;

  const { control, handleSubmit, reset } = useForm<PostFormValues>({
    defaultValues: { note: '', collectionIds: [] },
  });

  useEffect(() => {
    if (post) reset({ note: post.note ?? '', collectionIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, collectionIds.join(',')]);

  useEffect(() => {
    if (postId) sheetRef.current?.present();
  }, [postId]);

  // `@gorhom/bottom-sheet` n'écoute pas le bouton retour Android lui-même —
  // vérifié dans ses sources, aucune référence à `hardwareBackPress`. En plein
  // écran (édition), le retour re-snap à l'aperçu au lieu de fermer — il faut
  // deux gestes distincts pour quitter complètement, comme le bouton « X ».
  useEffect(() => {
    if (!postId) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === EDIT_INDEX) {
        sheetRef.current?.snapToIndex(PREVIEW_INDEX);
      } else {
        sheetRef.current?.dismiss();
      }
      return true;
    });
    return () => sub.remove();
  }, [postId, index]);

  const platform = displayedPost?.url ? detectPlatform(displayedPost.url) : null;
  const meta = platform ? PLATFORM_META[platform] : null;

  const handleOpen = useCallback(() => {
    if (!post?.url) return;
    Linking.openURL(post.url);
    markPostOpened(post.id);
    Haptics.selectionAsync();
  }, [post]);

  const onSave = useCallback(
    () =>
      handleSubmit((values) => {
        if (!postId) return;
        savePost({
          id: postId,
          url: post?.url ?? null,
          note: values.note.trim() || null,
          collectionIds: values.collectionIds,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        sheetRef.current?.dismiss();
      })(),
    [handleSubmit, postId, post?.url]
  );

  const handleDelete = useCallback(() => {
    if (!postId) return;
    Alert.alert('Delete this post?', 'It will disappear from PostKeep.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setIsDeleting(true);
          softDeletePost(postId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          sheetRef.current?.dismiss();
        },
      },
    ]);
  }, [postId]);

  const handleSheetChange = useCallback((newIndex: number) => {
    setIndex(newIndex);
  }, []);

  const handleDismiss = useCallback(() => {
    // Point de passage unique pour toute fermeture (Enregistrer, Supprimer,
    // pan-down, bouton retour) — le clavier ne se ferme pas tout seul quand
    // la feuille est retirée programmatiquement pendant l'édition.
    Keyboard.dismiss();
    usePostDetailStore.getState().close();
    setIsDeleting(false);
    setFrozenPost(null);
    setIndex(PREVIEW_INDEX);
  }, []);

  // Épinglé en bas via `footerComponent` (`BottomSheetFooter`) : reste visible
  // quel que soit l'index de snap, contrairement à un bouton dans le contenu
  // défilant qui passait sous la ligne de flottaison en ouverture partielle.
  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => {
      if (!displayedPost) return null;
      // Hors édition, pas de bouton si le post n'a pas d'URL ouvrable — en
      // édition, Enregistrer/Supprimer ne dépendent pas de l'URL.
      if (index !== EDIT_INDEX && !displayedPost.url) return null;
      return (
        <BottomSheetFooter {...footerProps}>
          <View
            className="gap-2 border-t border-border bg-card px-6 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
            <Animated.View
              key={index}
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(100)}
              className="flex-row gap-2">
              {index === EDIT_INDEX ? (
                <>
                  <Button className="flex-1" onPress={onSave}>
                    <Text>Save</Text>
                  </Button>
                  <Button variant="destructive" onPress={handleDelete}>
                    <Icon as={Trash2} className="text-white" size={16} />
                    <Text>Delete</Text>
                  </Button>
                </>
              ) : (
                <Button
                  className="flex-1"
                  style={meta ? { backgroundColor: meta.color } : undefined}
                  onPress={handleOpen}>
                  <Text style={meta ? { color: '#fff' } : undefined}>
                    Open in {meta?.label ?? 'the original app'}
                  </Text>
                </Button>
              )}
            </Animated.View>
          </View>
        </BottomSheetFooter>
      );
    },
    [displayedPost, index, insets.bottom, meta, handleOpen, onSave, handleDelete]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['50%', '100%']}
      topInset={0}
      enableDynamicSizing={false}
      enablePanDownToClose={index !== EDIT_INDEX}
      keyboardBehavior="fillParent"
      onChange={handleSheetChange}
      onDismiss={handleDismiss}
      footerComponent={renderFooter}
      backgroundComponent={AnimatedBackground}
      handleComponent={AnimatedHandle}>
      {displayedPost && index === EDIT_INDEX ? (
        // Vue non-scrollable en plein écran : seule la Note défile (dans
        // `PostFieldsForm`, hauteur mesurée puis fixée en dur sur le
        // `TextInput` — Android ignore la hauteur résolue par flexGrow pour
        // un `TextInput` multiline et le laisse grandir avec son contenu).
        // La page elle-même ne doit pas défiler : Collections doit rester
        // visible pendant qu'on lit/édite la fin d'une longue note.
        <BottomSheetView
          style={[styles.editContent, { paddingBottom: footerHeight }]}>
          <View className="flex-row justify-end">
            <Pressable onPress={() => sheetRef.current?.dismiss()} hitSlop={8} accessibilityLabel="Close">
              <Icon as={X} size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Animated.View
            style={styles.editContentGrow}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}>
            <PlatformHeader url={displayedPost.url} meta={meta} colors={colors} />
            <PostFieldsForm control={control} variant="chips" />
          </Animated.View>
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView
          contentContainerStyle={styles.previewContent}
          enableFooterMarginAdjustment
          keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-end">
            <Pressable onPress={() => sheetRef.current?.dismiss()} hitSlop={8} accessibilityLabel="Close">
              <Icon as={X} size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {!displayedPost ? (
            <Text variant="muted">This post no longer exists.</Text>
          ) : (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <PlatformHeader url={displayedPost.url} meta={meta} colors={colors} />

              {!!displayedPost.note && (
              <View className="mt-6 gap-2">
                <Text variant="large">Note</Text>
                <View className="rounded-xl bg-muted p-3.5" style={{ borderCurve: 'continuous' }}>
                  <Text selectable className="text-sm leading-5">
                    {displayedPost.note}
                  </Text>
                </View>
              </View>
            )}

            {displayedPost.collectionNames.length > 0 && (
              <View className="mt-6 gap-2">
                <Text variant="large">Collections</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {displayedPost.collectionNames.map((name) => (
                    <View key={name} className="rounded-full bg-muted px-2.5 py-1">
                      <Text variant="muted" className="text-xs">
                        {name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text variant="muted" className="mt-8 text-xs">
              Edited on {dateFormatter.format(displayedPost.updatedAt)}
            </Text>

            <View className="mt-6 flex-row items-center justify-center gap-1 opacity-60">
              <Icon as={ChevronUp} size={12} color={colors.mutedForeground} />
              <Text variant="muted" className="text-xs">
                Tirer vers le haut pour modifier
              </Text>
            </View>
            </Animated.View>
          )}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  previewContent: {
    padding: 24,
  },
  editContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  editContentGrow: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
  },
});
