import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aiSettingsSummary,
  buildSpeechCheckRequest,
  buildSummaryRequest,
  cleanTranscript,
  httpErrorMessage,
  parseModelIds,
  readIsSpeech,
  readSummary,
  validateAiSettings,
  type AiSettings,
} from './ai-summary.ts';

const settings: AiSettings = {
  baseUrl: 'https://ai.example.com/v1',
  apiKey: 'sk-test',
  videoModel: 'Qwen/Qwen3.5-35B-A3B',
  transcriptionModel: 'openai/whisper-large-v3',
  language: 'fr',
};

test('validateAiSettings normalise et refuse http, clé ou modèle vides', () => {
  assert.deepEqual(
    validateAiSettings({ ...settings, baseUrl: ' https://ai.example.com/v1// ', transcriptionModel: '  ' }),
    { ...settings, transcriptionModel: null }
  );
  assert.throws(() => validateAiSettings({ ...settings, baseUrl: 'http://ai.example.com/v1' }), /https/);
  assert.throws(() => validateAiSettings({ ...settings, apiKey: ' ' }), /API key/);
  assert.throws(() => validateAiSettings({ ...settings, videoModel: '' }), /vision model/);
});

test('aiSettingsSummary : hôte, ou Off', () => {
  assert.equal(aiSettingsSummary(settings), 'ai.example.com');
  assert.equal(aiSettingsSummary(null), 'Off');
});

test('parseModelIds trie les identifiants et refuse une réponse sans liste', () => {
  assert.deepEqual(parseModelIds({ data: [{ id: 'b' }, { id: 'a' }, { nope: 1 }] }), ['a', 'b']);
  assert.throws(() => parseModelIds({ detail: 'Not Found' }), /model list/);
});

test('cleanTranscript ignore la musique seule et un mot isolé', () => {
  assert.equal(cleanTranscript(' ♪ ♪'), null);
  assert.equal(cleanTranscript(' 🎵  ♪♪ ♪♪  ♪  you'), null);
  assert.equal(cleanTranscript(null), null);
  assert.equal(cleanTranscript(" Aujourd'hui, je vous montre ♪ le parc."), "Aujourd'hui, je vous montre le parc.");
  assert.equal(cleanTranscript(' Outro Music'), null);
  assert.equal(cleanTranscript('[Music] Thank you for watching!'), null);
  assert.equal(cleanTranscript("Sous-titres réalisés par la communauté d'Amara.org"), null);
  assert.equal(cleanTranscript('Add some music to the dough.'), 'Add some music to the dough.');
  assert.equal(cleanTranscript('それから肉を漬け込む'), 'それから肉を漬け込む');
});

test('buildSummaryRequest : langue, contexte, vidéo en base64 et raisonnement coupé', () => {
  const body = buildSummaryRequest(settings, {
    videoBase64: 'AAAA',
    images: [],
    transcript: 'On y trouve des chênes centenaires.',
    caption: 'The Moon understood the assignment',
    note: '  ',
    collections: [],
  });
  assert.equal(body.model, 'Qwen/Qwen3.5-35B-A3B');
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  assert.match(body.messages[0].content as string, /in French/);
  const [text, video] = body.messages[1].content as { type: string; text?: string; video_url?: { url: string } }[];
  assert.equal(
    text.text,
    'Post caption: The Moon understood the assignment\nTranscript of the audio: On y trouve des chênes centenaires.\nWrite the summary in French.'
  );
  assert.equal(video.video_url?.url, 'data:video/mp4;base64,AAAA');
});

test('buildSummaryRequest : images seules, collections dans le contexte', () => {
  const body = buildSummaryRequest(settings, {
    videoBase64: null,
    images: ['data:image/jpeg;base64,AA', 'data:image/png;base64,BB'],
    transcript: null,
    caption: null,
    note: null,
    collections: ['Dessins à refaire', 'Encre'],
  });
  const content = body.messages[1].content as { type: string; text?: string; image_url?: { url: string } }[];
  assert.equal(content[0].text, 'Saved in the collections: Dessins à refaire, Encre\nWrite the summary in French.');
  assert.deepEqual(
    content.slice(1).map((c) => [c.type, c.image_url?.url]),
    [
      ['image_url', 'data:image/jpeg;base64,AA'],
      ['image_url', 'data:image/png;base64,BB'],
    ]
  );
});

test('readSummary renvoie le texte et refuse une réponse vide', () => {
  assert.equal(readSummary({ choices: [{ message: { content: '  Une fusée.  ' } }] }), 'Une fusée.');
  assert.equal(readSummary({ choices: [{ message: { content: 'Sans point final' } }] }), 'Sans point final');
  assert.throws(() => readSummary({ choices: [{ message: { content: null } }] }), /empty/);
});

test('readSummary garde au plus 4 phrases', () => {
  const long = 'Un. Deux ! Trois ? Quatre… Cinq. Six.';
  assert.equal(readSummary({ choices: [{ message: { content: long } }] }), 'Un. Deux ! Trois ? Quatre…');
  assert.equal(
    readSummary({ choices: [{ message: { content: 'Version 2.5 du logiciel.\nIl est sorti.' } }] }),
    'Version 2.5 du logiciel. Il est sorti.'
  );
});

test('httpErrorMessage : clé refusée, 404, détail tronqué', () => {
  assert.match(httpErrorMessage(401, ''), /API key/);
  assert.match(httpErrorMessage(404, ''), /\/v1/);
  assert.equal(httpErrorMessage(500, 'boom'), 'The AI service answered 500: boom.');
});

test('buildSpeechCheckRequest / readIsSpeech : seul LYRICS écarte la transcription', () => {
  const body = buildSpeechCheckRequest(settings, 'I ain\'t never felt this way');
  assert.equal(body.temperature, 0);
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  assert.equal(body.messages[1].content, 'I ain\'t never felt this way');
  const reply = (content: unknown) => ({ choices: [{ message: { content } }] });
  assert.equal(readIsSpeech(reply('LYRICS')), false);
  assert.equal(readIsSpeech(reply(' lyrics.')), false);
  assert.equal(readIsSpeech(reply('SPEECH')), true);
  assert.equal(readIsSpeech(reply(null)), true);
});
