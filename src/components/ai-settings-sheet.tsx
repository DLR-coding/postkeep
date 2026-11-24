import { type RefObject, useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, useColorScheme, View } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import notifee from 'react-native-notify-kit';

import { SectionLabel } from '@/components/post-fields-form';
import { Segmented, SheetField, sheetBackgroundStyle } from '@/components/sheet-kit';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { listModels } from '@/lib/ai-client';
import { clearAiSettings, loadAiSettings, saveAiSettings } from '@/lib/ai-settings';
import type { AiSettings, SummaryLanguage } from '@/lib/ai-summary';
import { THEME } from '@/lib/theme';

const LANGUAGES: { value: SummaryLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
];

/** Puces de choix d'un modèle parmi ceux renvoyés par `GET /models`. */
function ModelChoice({
  models,
  value,
  onChange,
  noneLabel,
}: {
  models: string[];
  value: string | null;
  onChange: (model: string | null) => void;
  noneLabel?: string;
}) {
  const options: (string | null)[] = noneLabel ? [null, ...models] : models;
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((m) => {
        const active = m === value;
        return (
          <Pressable
            key={m ?? 'none'}
            onPress={() => onChange(m)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-note'}`}>
            <Text className={`text-xs font-semibold ${active ? 'text-primary-foreground' : ''}`}>{m ?? noneLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Service IA du résumé des vidéos (ARCHITECTURE.md §13), empilé sur les paramètres.
 *  La clé enregistrée n'est jamais réaffichée : champ vide = garder la clé. */
export function AiSettingsSheet({
  sheetRef,
  onSaved,
}: {
  sheetRef: RefObject<BottomSheetModal | null>;
  onSaved: (settings: AiSettings | null) => void;
}) {
  const colors = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [current, setCurrent] = useState<AiSettings | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [videoModel, setVideoModel] = useState<string | null>(null);
  const [transcriptionModel, setTranscriptionModel] = useState<string | null>(null);
  const [language, setLanguage] = useState<SummaryLanguage>('en');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  const reset = async () => {
    const s = await loadAiSettings();
    setCurrent(s);
    setBaseUrl(s?.baseUrl ?? '');
    setApiKey('');
    setVideoModel(s?.videoModel ?? null);
    setTranscriptionModel(s?.transcriptionModel ?? null);
    setLanguage(s?.language ?? 'en');
    // Avant tout chargement, seuls les modèles enregistrés sont proposés.
    setModels([s?.videoModel, s?.transcriptionModel].filter((m): m is string => !!m));
    setError(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const key = apiKey.trim() || current?.apiKey || '';

  const loadModels = () =>
    run(async () => {
      Keyboard.dismiss();
      const list = await listModels(baseUrl, key);
      setModels(list);
      if (videoModel && !list.includes(videoModel)) setVideoModel(null);
      if (transcriptionModel && !list.includes(transcriptionModel)) setTranscriptionModel(null);
    });

  const save = () =>
    run(async () => {
      const saved = await saveAiSettings({ baseUrl, apiKey: key, videoModel: videoModel ?? '', transcriptionModel, language });
      // La notification « Analyse du post… » ; un refus n'empêche rien (§13).
      await notifee.requestPermission().catch(() => undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(saved);
      sheetRef.current?.dismiss();
    });

  const turnOff = () =>
    run(async () => {
      await clearAiSettings();
      onSaved(null);
      sheetRef.current?.dismiss();
    });

  return (
    <BottomSheetModal
      ref={sheetRef}
      stackBehavior="push"
      snapPoints={['85%']}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onChange={(index) => index === 0 && reset()}
      backgroundStyle={sheetBackgroundStyle(colors)}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8, gap: 12 }}>
        <Text className="text-xl font-semibold">AI summary</Text>
        <Text variant="muted" className="text-sm">
          When you save a video, your AI service watches it and writes a short summary you can search. Any
          OpenAI-compatible service works. Your key stays encrypted on this phone.
        </Text>

        <SectionLabel>Service</SectionLabel>
        <SheetField
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="https://…/v1"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <SheetField
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={current ? 'Saved key (leave empty to keep it)' : 'API key'}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          variant="ghost"
          className="h-12 rounded-2xl"
          style={{ backgroundColor: colors.chip }}
          disabled={busy || !baseUrl.trim() || !key}
          onPress={loadModels}>
          <Text className="font-semibold" style={{ color: colors.foreground }}>
            Load models
          </Text>
        </Button>

        {models.length > 0 && (
          <>
            <SectionLabel>Video model</SectionLabel>
            <ModelChoice models={models} value={videoModel} onChange={setVideoModel} />
            <SectionLabel>Transcription model (audio)</SectionLabel>
            <ModelChoice models={models} value={transcriptionModel} onChange={setTranscriptionModel} noneLabel="None" />
          </>
        )}

        <SectionLabel>Summary language</SectionLabel>
        <Segmented options={LANGUAGES} value={language} onChange={setLanguage} />

        {!!error && <Text className="text-sm text-destructive">{error}</Text>}

        <Button className="mt-1 h-12 rounded-2xl" disabled={busy || !videoModel} onPress={save}>
          {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text className="font-semibold">Save</Text>}
        </Button>
        {current && (
          <Pressable onPress={turnOff} disabled={busy} accessibilityRole="button" className="items-center py-2 active:opacity-60">
            <Text className="text-sm font-semibold text-destructive">Turn off AI summary</Text>
          </Pressable>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
