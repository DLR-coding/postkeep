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
  if (!videoModel) throw new Error('Choose the vision model.');
  return {
    baseUrl,
    apiKey,
    videoModel,
    transcriptionModel: s.transcriptionModel?.trim() || null,
    language: s.language === 'fr' ? 'fr' : 'en',
  };
}

/** Sous-titre de la ligne des paramètres : l'hôte du service (« ai.example.com ») ou « Off ». */
export const aiSettingsSummary = (s: AiSettings | null) =>
  s ? s.baseUrl.replace(/^https?:\/\//i, '').split('/')[0] : 'Off';

/** Identifiants de `GET /models`, triés. Lève une erreur si la réponse n'en a pas. */
export function parseModelIds(body: unknown): string[] {
  const data = (body as { data?: { id?: unknown }[] } | null)?.data;
  if (!Array.isArray(data)) throw new Error('The service did not return a model list.');
  return data
    .map((m) => m?.id)
    .filter((id): id is string => typeof id === 'string')
    .sort((a, b) => a.localeCompare(b));
}

/** Phrases que Whisper invente sur une musique sans parole (vues le 24 novembre 2026 :
 *  « Outro Music » sur un reel muet), et les annotations entre crochets ou parenthèses. */
const WHISPER_NOISE =
  /\[[^\]]*\]|\([^)]*\)|\b(?:(?:intro|outro|background|upbeat|soft|dramatic)\s+)?music\b|thanks? (?:you )?for watching!?|please subscribe!?|(?:sous-titres|subtitles)[^.]*amara\.org[^.]*\.?|merci d'avoir regardé[^.]*\.?/giu;

/** Transcription utile, ou null. Whisper rend « ♪ » ou une phrase inventée sur une
 *  musique seule, et parfois un mot isolé (« you ») : s'il reste moins de 6 lettres sans ce
 *  bruit, rien n'est dit. Des lettres et pas des mots : le japonais n'a pas d'espaces.
 *  Sinon le texte est gardé tel quel (« music » peut être dit). */
export function cleanTranscript(text: string | null | undefined): string | null {
  const cleaned = (text ?? '').replace(/[♪♫🎵🎶]/gu, ' ').replace(/\s+/g, ' ').trim();
  const letters = cleaned.replace(WHISPER_NOISE, ' ').match(/\p{L}/gu)?.length ?? 0;
  return letters >= 6 ? cleaned : null;
}

const LANGUAGE_NAME: Record<SummaryLanguage, string> = { en: 'English', fr: 'French' };

export type SummaryInput = {
  videoBase64: string | null;
  /** Images en data URL (`data:image/jpeg;base64,…`). */
  images: string[];
  transcript: string | null;
  caption: string | null;
  note: string | null;
  /** Noms des collections du post : l'intention de l'utilisateur (« Dessins à refaire »). */
  collections: string[];
};

/** Corps de `POST /chat/completions`. `enable_thinking: false` est indispensable avec
 *  Qwen3.5 (vLLM) : sinon tous les tokens partent en raisonnement et la réponse est vide. */
export function buildSummaryRequest(settings: AiSettings, input: SummaryInput) {
  const language = LANGUAGE_NAME[settings.language];
  const context = [
    input.caption?.trim() && `Post caption: ${input.caption.trim()}`,
    input.collections.length && `Saved in the collections: ${input.collections.join(', ')}`,
    input.note?.trim() && `User's note: ${input.note.trim()}`,
    input.transcript && `Transcript of the audio: ${input.transcript}`,
  ].filter(Boolean);
  return {
    model: settings.videoModel,
    max_tokens: 400,
    temperature: 0.2,
    chat_template_kwargs: { enable_thinking: false },
    messages: [
      {
        role: 'system',
        content:
          'The user saved this social media post to find it again and use it later. Write the note they would ' +
          `want next to it, in ${language}, in at most 4 short sentences and 70 words: what it is about, what ` +
          'is notable (style, technique, colors, composition, what is said) and what it is useful for. The ' +
          'collection names say why it was saved: use them to judge what matters and what it is useful for ' +
          '(a drawings collection: redraw it; a recipes one: cook it), but never write them. The transcript ' +
          'is automatic: when it is someone talking (a voice-over, an explanation), lead with what they say, ' +
          'it is usually the point of the post even over unrelated footage; when it is song lyrics or only ' +
          'music, ignore it. Keep the key words someone would search for; skip the scene by scene narration. ' +
          'Plain text only: start with the content itself, no label like "Post:", no markdown, no remark ' +
          'about missing audio or images.',
      },
      {
        role: 'user',
        content: [
          // Langue répétée à la fin : sinon une légende en anglais l'emporte sur la consigne.
          { type: 'text', text: [...context, `Write the summary in ${language}.`].join('\n') },
          ...input.images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ...(input.videoBase64
            ? [{ type: 'video_url', video_url: { url: `data:video/mp4;base64,${input.videoBase64}` } }]
            : []),
        ],
      },
    ],
  };
}

/** Question à part, sur le texte seul : paroles de chanson ou quelqu'un qui parle ?
 *  Whisper ne fait pas la différence, et dans le prompt du résumé le modèle prenait une
 *  fois sur deux des paroles pour un narrateur ; seul, il classe juste (12 sur 12 le
 *  24 novembre 2026, ARCHITECTURE.md §13). */
export function buildSpeechCheckRequest(settings: AiSettings, transcript: string) {
  return {
    model: settings.videoModel,
    max_tokens: 5,
    temperature: 0,
    chat_template_kwargs: { enable_thinking: false },
    messages: [
      {
        role: 'system',
        content:
          'This is an automatic transcript of the audio of a short social media video. Is it song lyrics ' +
          '(singing, rap, music) or someone talking (voice-over, explanation, dialogue)? Answer with one ' +
          'word: LYRICS or SPEECH.',
      },
      { role: 'user', content: transcript },
    ],
  };
}

/** Faux seulement sur une réponse LYRICS : dans le doute, la transcription est gardée. */
export function readIsSpeech(body: unknown): boolean {
  const content = (body as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message
    ?.content;
  return !(typeof content === 'string' && /lyrics/i.test(content));
}

/** Nombre de phrases gardées : le modèle ignore parfois la consigne (10 phrases vues sur
 *  un S23, le 24 novembre 2026), et un long texte pousse la note hors de l'écran. */
export const MAX_SENTENCES = 4;

/** Texte du résumé dans une réponse `chat/completions`, coupé à `MAX_SENTENCES` phrases.
 *  Une réponse vide est une erreur. */
export function readSummary(body: unknown): string {
  const content = (body as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message
    ?.content;
  const text = typeof content === 'string' ? content.replace(/\s+/g, ' ').trim() : '';
  if (!text) throw new Error('The AI returned an empty summary.');
  // Une phrase finit par . ! ? ou … suivi d'une espace ; « Aug. 12 » coupe trop tôt, sans gravité.
  return text.split(/(?<=[.!?…])\s+/).slice(0, MAX_SENTENCES).join(' ');
}

/** Message lisible pour une réponse HTTP en échec du service IA. */
export function httpErrorMessage(status: number, detail: string): string {
  if (status === 401 || status === 403) return 'The AI service rejected the API key.';
  if (status === 404) return 'URL or model not found (404). The URL usually ends with /v1.';
  if (status === 413) return 'The post is too large for the AI service.';
  const short = detail.trim().slice(0, 160);
  return `The AI service answered ${status}${short ? `: ${short}` : ''}.`;
}
