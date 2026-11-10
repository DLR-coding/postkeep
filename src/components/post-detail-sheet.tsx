import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
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
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { ChevronUp, Trash2, X } from 'lucide-react-native';

import Svg, { LinearGradient, Rect, Stop } from 'react-native-svg';

import { PostThumb } from '@/components/post-thumb';
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


const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Hauteur réservée par la poignée en haut de la feuille, même effacée en plein écran
 *  (opacité 0) : à retirer de la hauteur disponible pour le contenu d'édition. */
const HANDLE_HEIGHT = 28;

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
    <View className="items-center justify-center" style={{ height: HANDLE_HEIGHT }}>
      <Animated.View
        style={[
          { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.mutedForeground },
          animatedStyle,
        ]}
      />
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
  const { height: windowHeight } = useWindowDimensions();
  // Hauteur du contenu d'édition : bornée explicitement (dans `BottomSheetView`,
  // `flex: 1` ne l'est pas et le conteneur grandissait avec la note), moins la poignée
  // effacée et moins le clavier, au-dessus duquel le pied remonte.
  const keyboard = useAnimatedKeyboard();
  const editHeightStyle = useAnimatedStyle(() => ({
    height: windowHeight - HANDLE_HEIGHT - keyboard.height.value,
  }));
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
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
                  {!!displayedPost.url && (
                    <Button
                      variant="outline"
                      style={meta ? { borderColor: meta.color } : undefined}
                      onPress={handleOpen}>
                      <Text style={meta ? { color: meta.color } : undefined}>
                        Open
                      </Text>
                    </Button>
                  )}
                  <Button className="flex-1" onPress={onSave}>
                    <Text>Save</Text>
                  </Button>
                  <Button variant="destructive" onPress={handleDelete}>
                    <Icon as={Trash2} className="text-white" size={16} />
                  </Button>
                </>
              ) : (
                <View className="flex-1 overflow-hidden rounded-md">
                  {platform === 'instagram' && (
                    <Svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 1 1"
                      preserveAspectRatio="none"
                      style={{ position: 'absolute' }}>
                      <LinearGradient id="open-ig" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#f7a24a" />
                        <Stop offset="0.55" stopColor="#e4405f" />
                        <Stop offset="1" stopColor="#a33ab9" />
                      </LinearGradient>
                      <Rect width="1" height="1" fill="url(#open-ig)" />
                    </Svg>
                  )}
                  <Button
                    className="w-full"
                    style={{ backgroundColor: platform === 'instagram' ? 'transparent' : (meta?.color ?? undefined) }}
                    onPress={handleOpen}>
                    <Text className={meta ? 'text-white' : undefined}>
                      Open in {meta?.label ?? 'the original app'}
                    </Text>
                  </Button>
                </View>
              )}
            </Animated.View>
          </View>
        </BottomSheetFooter>
      );
    },
    [displayedPost, index, insets.bottom, meta, platform, handleOpen, onSave, handleDelete]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['50%', '100%']}
      topInset={0}
      enableDynamicSizing={false}
      enablePanDownToClose={index !== EDIT_INDEX}
      // En édition, un glissé dans la note doit la faire défiler, pas replier la feuille
      // (fermeture par ✕ ou retour Android).
      enableContentPanningGesture={index !== EDIT_INDEX}
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
        <BottomSheetView>
          <Animated.View style={[styles.editContent, { paddingBottom: footerHeight }, editHeightStyle]}>
          <View className="flex-row justify-end">
            <Pressable onPress={() => sheetRef.current?.dismiss()} hitSlop={8} accessibilityLabel="Close">
              <Icon as={X} size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Animated.View
            style={styles.editContentGrow}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}>
            {/* Clavier ouvert : en-tête et collections repliés, la note prend la place
                (sinon 0 dp entre l'en-tête et le pied remonté, mesuré sur un S23). */}
            {!keyboardOpen && (
            <View className="flex-row items-center gap-2.5">
              <PostThumb post={displayedPost} width={34} />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold">{meta?.label ?? 'Text'}</Text>
                <Text variant="muted" className="text-[11px]" numberOfLines={1}>
                  Saved {dateFormatter.format(displayedPost.createdAt)}
                  {displayedPost.url ? ` · ${displayedPost.url.replace(/^https?:\/\/(www\.)?/, '')}` : ''}
                </Text>
              </View>
            </View>
            )}
            <PostFieldsForm control={control} variant="chips" hideCollections={keyboardOpen} />
          </Animated.View>
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
              <View className="flex-row gap-3.5">
                <PostThumb post={displayedPost} width={92} />
                <View className="min-w-0 flex-1 gap-1.5 pt-1">
                  <Text className="text-[15px] font-semibold">{meta?.label ?? 'Text'}</Text>
                  {!!displayedPost.url && (
                    <Text variant="muted" className="text-[11px]" numberOfLines={1} selectable>
                      {displayedPost.url}
                    </Text>
                  )}
                  <View className="flex-row flex-wrap gap-1">
                    {(displayedPost.collectionNames.length > 0
                      ? displayedPost.collectionNames
                      : ['No collection']
                    ).map((name) => (
                      <View key={name} className="rounded-full bg-chip px-2 py-0.5">
                        <Text className="text-[11px] text-chip-foreground">{name}</Text>
                      </View>
                    ))}
                  </View>
                  <Text variant="muted" className="text-[11px]">
                    Saved {dateFormatter.format(displayedPost.createdAt)}
                  </Text>
                </View>
              </View>

              {!!displayedPost.caption && (
                <View className="mt-5 gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Caption
                  </Text>
                  <Text selectable className="text-[13px] leading-[1.4]">
                    {displayedPost.caption}
                  </Text>
                </View>
              )}

              {!!displayedPost.note && (
                <View className="mt-5 gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Note
                  </Text>
                  <View className="rounded-xl bg-note px-3 py-2.5" style={{ borderCurve: 'continuous' }}>
                    <Text selectable className="text-[13px] leading-[1.4]">
                      {displayedPost.note}
                    </Text>
                  </View>
                </View>
              )}

              <View className="mt-6 flex-row items-center justify-center gap-1 opacity-60">
                <Icon as={ChevronUp} size={12} color={colors.mutedForeground} />
                <Text variant="muted" className="text-xs">
                  Pull up to edit
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
