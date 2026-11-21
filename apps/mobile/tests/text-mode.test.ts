import { createHttpResource } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import { apiQueries } from '@core/queries';
import { keys } from '@core/keys';
import { novelRouteSchema } from '@core/navigation';
import { createSpeechSession } from '@core/tts-service';
import { createPlaybackController } from '@features/speech/playback-controller';
import { createChapterPrefetcher } from '@features/reader/chapter-prefetch';
import { memoryFiles } from './local-files';
import { readerNovel, readerScope, readerQueryClient, jsonResponse } from './reader-fixture';
import { speechDriver, flushSpeech } from './speech-driver';

function setup() {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    if (init.method === 'PATCH') return jsonResponse(readerNovel);
    const input = new URL(url); const chapter = Number(input.searchParams.get('chapter'));
    return jsonResponse({ chapter, url: `https://example.org/chapter-${chapter}`, text: input.searchParams.get('translate') === 'false' ? 'Original English.' : 'Texto em português.' });
  });
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  return { storage, client, transport, request };
}

test('original bypasses translated files and has a separate memory cache without changing downloads', async () => {
  const data = setup(); const url = 'https://example.org/chapter-1';
  await data.storage.saveChapter(readerScope, 1, 'Português salvo.');
  try {
    const queries = apiQueries(data.request, data.storage);
    expect((await data.client.fetchQuery(queries.chapter(readerScope, url, 1, 'original'))).text).toBe('Original English.');
    expect((await data.client.fetchQuery(queries.chapter(readerScope, url, 1))).text).toBe('Português salvo.');
    expect(data.transport).toHaveBeenCalledTimes(1);
    expect(new URL(data.transport.mock.calls[0]?.[0] ?? '').searchParams.get('translate')).toBe('false');
    expect(await data.storage.readChapter(readerScope, 1)).toEqual({ chapter: 1, text: 'Português salvo.' });
    expect(data.client.getQueryData(keys.chapter(readerScope, url, 1, 'original'))).not.toEqual(data.client.getQueryData(keys.chapter(readerScope, url, 1)));
  } finally { data.client.clear(); }
});

test('original prefetch never fills translated cache or writes offline files', async () => {
  const data = setup(); const prefetch = createChapterPrefetcher(data.client, readerNovel, data, () => true, 'original');
  try {
    await prefetch.activate(1);
    expect(data.transport).toHaveBeenCalledTimes(3);
    expect(data.transport.mock.calls.every(([url]) => new URL(url).searchParams.get('translate') === 'false')).toBe(true);
    expect(data.client.getQueryData(keys.chapter(readerScope, 'https://example.org/chapter-2', 2))).toBeUndefined();
    expect(await data.storage.listChapters(readerScope)).toEqual([]);
  } finally { prefetch.dispose(); data.client.clear(); }
});

test('voice mode switch stops the old session and ignores its completion callback', async () => {
  const data = setup(); const fake = speechDriver();
  const controller = createPlaybackController(readerNovel, { ...data, driver: fake.driver, session: createSpeechSession(fake.driver), defaults: () => ({ rate: 1, voiceId: null }), offline: () => false, downloaded: () => [] });
  try {
    await controller.start();
    const previous = fake.current();
    expect(previous.text).toBe('Texto em português.');
    await controller.setMode('original');
    expect(controller.getSnapshot()).toMatchObject({ mode: 'original', status: 'idle', chapter: 1 });
    previous.options.onDone(); await flushSpeech();
    expect(controller.getSnapshot().chapter).toBe(1);
    await controller.start();
    expect(fake.current().text).toBe('Original English.');
    expect(data.transport.mock.calls.filter(([url, init]) => init.method !== 'PATCH' && new URL(url).searchParams.get('chapter') === '2')).toHaveLength(0);
  } finally { await controller.destroy(); data.client.clear(); }
});

test('translated offline files do not make original voice available offline', async () => {
  const data = setup(); const fake = speechDriver();
  await data.storage.saveChapter(readerScope, 1, 'Português salvo.');
  const controller = createPlaybackController(readerNovel, { ...data, driver: fake.driver, session: createSpeechSession(fake.driver), defaults: () => ({ rate: 1, voiceId: null }), offline: () => true, downloaded: () => [1] }, 1, 'original');
  try {
    expect(controller.available(1)).toBe(false);
    await controller.start();
    expect(fake.driver.speak).not.toHaveBeenCalled();
    await controller.setMode('translated'); await controller.start();
    expect(fake.current().text).toBe('Português salvo.');
    expect(data.transport.mock.calls.some(([url]) => url.includes('/chapters/text'))).toBe(false);
  } finally { await controller.destroy(); data.client.clear(); }
});

test('route mode accepts original and rejects unknown values', () => {
  expect(novelRouteSchema.parse({ id: readerNovel.id, mode: 'original' }).mode).toBe('original');
  expect(novelRouteSchema.safeParse({ id: readerNovel.id, mode: 'unknown' }).success).toBe(false);
});
