import { createSpeechSession } from '@core/tts-service';
import { createHttpResource } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import { createPlaybackController } from '@features/speech/playback-controller';
import { memoryFiles } from './local-files';
import { speechDriver, flushSpeech } from './speech-driver';
import { readerNovel, readerScope, readerQueryClient, jsonResponse } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

async function setup(chapters = [1, 2], offline = true) {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  for (const chapter of chapters) await storage.saveChapter(readerScope, chapter, `Texto do capítulo ${chapter}.`);
  const fake = speechDriver();
  const transport = jest.fn(async (_url: string, init: RequestInit) => { expect(init.method).toBe('PATCH'); return jsonResponse(readerNovel); });
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  const controller = createPlaybackController({ ...readerNovel, total_chapters: 2 }, { storage, request, client, driver: fake.driver, session: createSpeechSession(fake.driver), defaults: () => ({ rate: 1.5, voiceId: 'pt-default' }), offline: () => offline, downloaded: () => chapters });
  return { ...fake, memory, storage, client, transport, controller };
}

test('local playback uses initial settings, pauses/resumes, updates options and chains chapters only once', async () => {
  const data = await setup();
  try {
    await data.controller.start();
    expect(data.current()).toMatchObject({ text: 'Texto do capítulo 1.', options: { rate: 1.5, voice: 'pt-default' } });
    expect(data.controller.getSnapshot()).toMatchObject({ status: 'playing', chapter: 1, index: 0, total: 1 });
    await data.controller.toggle(); expect(data.controller.getSnapshot().status).toBe('paused');
    await data.controller.toggle(); expect(data.controller.getSnapshot().status).toBe('playing');
    await data.controller.setRate(2); await data.controller.setVoice('pt-chosen');
    expect(data.current().options).toMatchObject({ rate: 2, voice: 'pt-chosen' });
    const old = data.current().options;
    old.onDone(); old.onDone(); await flushSpeech();
    expect(data.current()).toMatchObject({ text: 'Texto do capítulo 2.', options: { rate: 2, voice: 'pt-chosen' } });
    data.current().options.onDone(); await flushSpeech();
    expect(data.controller.getSnapshot()).toMatchObject({ chapter: 2, status: 'idle', finished: true });
    expect(data.transport.mock.calls.every(([, init]) => init.method === 'PATCH')).toBe(true);
    expect(data.transport).toHaveBeenCalledTimes(2);
  } finally { await data.controller.destroy(); data.client.clear(); }
});

test('an unavailable next chapter offline does not start a network request or advance', async () => {
  const data = await setup([1]);
  try {
    await data.controller.start(); data.current().options.onDone(); await flushSpeech();
    expect(data.controller.getSnapshot()).toMatchObject({ chapter: 1, status: 'idle', log: 'Próximo capítulo não disponível.' });
    expect(data.utterances).toHaveLength(1);
    expect(data.transport).toHaveBeenCalledTimes(1);
  } finally { await data.controller.destroy(); data.client.clear(); }
});

test('failure to save progress does not stop native playback', async () => {
  const data = await setup();
  jest.mocked(data.transport).mockImplementation(async () => jsonResponse({}, 503));
  try {
    await data.controller.start(); await flushSpeech();
    expect(data.controller.getSnapshot()).toMatchObject({ status: 'playing', log: 'Texto disponível; não foi possível sincronizar o progresso.' });
    expect(data.utterances).toHaveLength(1);
  } finally { await data.controller.destroy(); data.client.clear(); }
});

test('destroy prevents stale callbacks from loading or speaking another chapter', async () => {
  const data = await setup();
  await data.controller.start(); const old = data.current().options;
  await data.controller.destroy(); old.onDone(); old.onError(new Error('Late native error')); await flushSpeech();
  await data.controller.start(2);
  expect(data.utterances).toHaveLength(1);
  data.client.clear();
});

test('an older fetch cannot replace the selected chapter or overwrite its progress', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient(); const fake = speechDriver();
  let release = () => {}; const pending = new Promise<void>(resolve => { release = resolve; });
  const progress: number[] = [];
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (url, init) => {
    if (init.method === 'PATCH') { const value: unknown = JSON.parse(String(init.body)); if (typeof value === 'object' && value !== null && 'chapter' in value && typeof value.chapter === 'number') progress.push(value.chapter); return jsonResponse(readerNovel); }
    const chapter = Number(new URL(url).searchParams.get('chapter')); if (chapter === 1) await pending;
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Capítulo ${chapter}.` });
  } });
  const controller = createPlaybackController(readerNovel, { storage, request, client, driver: fake.driver, session: createSpeechSession(fake.driver), defaults: () => ({ rate: 1, voiceId: null }), offline: () => false, downloaded: () => [] });
  try {
    const first = controller.start(1); await flushSpeech();
    await controller.start(2); release(); await first; await flushSpeech();
    expect(fake.utterances.map(value => value.text)).toEqual(['Capítulo 2.']);
    expect(progress).toEqual([2]);
  } finally { release(); await controller.destroy(); client.clear(); }
});
