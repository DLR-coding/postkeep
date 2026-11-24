/**
 * Résumé IA des vidéos (ARCHITECTURE.md §13) : réglages, requêtes et messages d'erreur.
 * Logique pure, sans I/O, testée par `ai-summary.test.ts`. Les appels réseau sont dans
 * `ai-client.ts`, le stockage des réglages dans `ai-settings.ts`.
 */

export type SummaryLanguage = 'en' | 'fr';

/** Réglages du service IA. `baseUrl` inclut `/v1` (ex. https://ai.example.com/v1).
 *  `transcriptionModel` vide = pas de transcription : l'audio est ignoré. */
export type AiSettings = {
  baseUrl: string;
  apiKey: string;
  videoModel: string;
  transcriptionModel: string | null;
  language: SummaryLanguage;
};

/** Valide et normalise les réglages (espaces et slash final retirés). Lève une erreur
 *  lisible sinon. */
export function validateAiSettings(s: AiSettings): AiSettings {
  const baseUrl = s.baseUrl.trim().replace(/\/+$/, '');
  const apiKey = s.apiKey.trim();
  const videoModel = s.videoModel.trim();
  // http refusé : la clé API circulerait en clair.
  if (!/^https:\/\/[^/\s]+/i.test(baseUrl)) throw new Error('The URL must start with https://');
  if (!apiKey) throw new Error('Enter the API key.');
  if (!videoModel) throw new Error('Choose the video model.');
  return {
    baseUrl,
    apiKey,
    videoModel,
    transcriptionModel: s.transcriptionModel?.trim() || null,
    language: s.language === 'fr' ? 'fr' : 'en',
  };
}

/** Sous-titre de la ligne des paramètres : « ai.example.com · Qwen/… » ou « Off ». */
export const aiSettingsSummary = (s: AiSettings | null) =>
  s ? `${s.baseUrl.replace(/^https?:\/\//i, '').split('/')[0]} · ${s.videoModel}` : 'Off';

/** Identifiants de `GET /models`, triés. Lève une erreur si la réponse n'en a pas. */
export function parseModelIds(body: unknown): string[] {
  const data = (body as { data?: { id?: unknown }[] } | null)?.data;
  if (!Array.isArray(data)) throw new Error('The service did not return a model list.');
  return data
    .map((m) => m?.id)
    .filter((id): id is string => typeof id === 'string')
    .sort((a, b) => a.localeCompare(b));
}

/** Transcription utile, ou null. Whisper rend « ♪ » sur une musique seule, et parfois un
 *  mot isolé inventé (« you ») : moins de deux mots n'apporte rien au résumé. */
export function cleanTranscript(text: string | null | undefined): string | null {
  const cleaned = (text ?? '').replace(/[♪♫🎵🎶]/gu, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.split(' ').filter(Boolean).length >= 2 ? cleaned : null;
}

const LANGUAGE_NAME: Record<SummaryLanguage, string> = { en: 'English', fr: 'French' };

export type SummaryInput = {
  videoBase64: string;
  transcript: string | null;
  caption: string | null;
  note: string | null;
};

/** Corps de `POST /chat/completions`. `enable_thinking: false` est indispensable avec
 *  Qwen3.5 (vLLM) : sinon tous les tokens partent en raisonnement et la réponse est vide. */
export function buildSummaryRequest(settings: AiSettings, input: SummaryInput) {
  const context = [
    input.caption?.trim() && `Post caption: ${input.caption.trim()}`,
    input.note?.trim() && `User's note: ${input.note.trim()}`,
    input.transcript && `Transcript of the audio: ${input.transcript}`,
  ].filter(Boolean);
  return {
    model: settings.videoModel,
    max_tokens: 400,
    chat_template_kwargs: { enable_thinking: false },
    messages: [
      {
        role: 'system',
        content:
          'You describe videos saved from social media so the user can find them later by searching. ' +
          `Write 2 to 4 sentences in ${LANGUAGE_NAME[settings.language]}: what the video is about and what it ` +
          'shows (people, places, objects, steps, products, text on screen). Use the transcript for what is ' +
          'said. Plain text only: no preamble, no markdown, no remark about missing audio.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: context.length ? context.join('\n') : 'Describe this video.' },
          { type: 'video_url', video_url: { url: `data:video/mp4;base64,${input.videoBase64}` } },
        ],
      },
    ],
  };
}

/** Texte du résumé dans une réponse `chat/completions`. Une réponse vide est une erreur. */
export function readSummary(body: unknown): string {
  const content = (body as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message
    ?.content;
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) throw new Error('The AI returned an empty summary.');
  return text;
}

/** Message lisible pour une réponse HTTP en échec du service IA. */
export function httpErrorMessage(status: number, detail: string): string {
  if (status === 401 || status === 403) return 'The AI service rejected the API key.';
  if (status === 404) return 'URL or model not found (404). The URL usually ends with /v1.';
  if (status === 413) return 'The video is too large for the AI service.';
  const short = detail.trim().slice(0, 160);
  return `The AI service answered ${status}${short ? `: ${short}` : ''}.`;
}
