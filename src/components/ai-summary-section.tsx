import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { SectionLabel } from '@/components/post-fields-form';
import { ConfirmDialog } from '@/components/sheet-kit';
import { Text } from '@/components/ui/text';
import { setPostAiSummary } from '@/db/posts';
import { startAiSummaries } from '@/lib/ai-runner';
import { loadAiSettings } from '@/lib/ai-settings';
import { RADIUS } from '@/lib/design';
import { THEME } from '@/lib/theme';
import { useAiSummaryStore } from '@/stores/ai-summary-store';

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" className="active:opacity-60">
      <Text className="text-sm font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}

/** Résumé IA d'un post dans l'aperçu (ARCHITECTURE.md §13) : modifiable sur place,
 *  « Summarize » s'il manque, « Redo » (confirmé) pour le remplacer. Caché si l'IA n'est
 *  pas configurée et que le post n'a pas de résumé. */
export function AiSummarySection({
  postId,
  aiSummary,
  hasUrl,
  portalHost,
}: {
  postId: string;
  aiSummary: string | null;
  hasUrl: boolean;
  portalHost: string;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [enabled, setEnabled] = useState(false);
  const entry = useAiSummaryStore((s) => s.queue[postId]);
  const running = useAiSummaryStore((s) => s.running === postId);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmRedo, setConfirmRedo] = useState(false);

  useEffect(() => {
    loadAiSettings().then((s) => setEnabled(!!s));
  }, []);

  if (!aiSummary && !enabled && !entry) return null;

  const canRun = enabled && hasUrl;
  // En file sans échec encore : le service va le prendre (ou le prend déjà).
  const busy = running || (!!entry && !entry.error);
  const request = (overwrite: boolean) => {
    useAiSummaryStore.getState().enqueue(postId, overwrite);
    startAiSummaries();
    Haptics.selectionAsync();
  };
  const saveDraft = () => {
    setPostAiSummary(postId, draft?.trim() || null, true);
    setDraft(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View className="mt-5 gap-1.5">
      <SectionLabel>AI summary</SectionLabel>
      {busy ? (
        <View className="flex-row items-center gap-2 py-1">
          <ActivityIndicator size="small" color={colors.mutedForeground} />
          <Text variant="muted" className="text-[13px]">
            Summarizing…
          </Text>
        </View>
      ) : draft !== null ? (
        <>
          <BottomSheetTextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            placeholder="What the video shows"
            placeholderTextColor={colors.mutedForeground}
            style={{
              minHeight: 96,
              borderRadius: RADIUS.control,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              lineHeight: 18,
              textAlignVertical: 'top',
              color: colors.foreground,
              backgroundColor: colors.note,
            }}
          />
          <View className="flex-row justify-end gap-5 pt-1">
            <Action label="Cancel" onPress={() => setDraft(null)} />
            <Action label="Save" onPress={saveDraft} />
          </View>
        </>
      ) : (
        <>
          {!!aiSummary && (
            <View className="rounded-xl bg-note px-3 py-2.5" style={{ borderCurve: 'continuous' }}>
              <Text selectable className="text-[13px] leading-[1.4]">
                {aiSummary}
              </Text>
            </View>
          )}
          {!aiSummary && !!entry?.error && (
            <Text variant="muted" className="text-[13px] leading-[1.4]">
              Couldn&apos;t summarize: {entry.error}
            </Text>
          )}
          <View className="flex-row gap-5 pt-1">
            {!!aiSummary && <Action label="Edit" onPress={() => setDraft(aiSummary)} />}
            {canRun && !!aiSummary && <Action label="Redo" onPress={() => setConfirmRedo(true)} />}
            {canRun && !aiSummary && <Action label={entry?.error ? 'Try again' : 'Summarize'} onPress={() => request(false)} />}
          </View>
        </>
      )}
      <ConfirmDialog
        open={confirmRedo}
        onOpenChange={setConfirmRedo}
        title="Replace the summary?"
        description="The AI will watch the video again. The current summary, including your edits, will be replaced."
        confirmLabel="Replace"
        onConfirm={() => request(true)}
        portalHost={portalHost}
      />
    </View>
  );
}
