import { createChapterPrefetcher } from '@features/reader/chapter-prefetch';
import { createHttpResource } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import { keys } from '@core/keys';
import { memoryFiles } from './local-files';
import { jsonResponse, readerNovel, readerQueryClient, readerScope } from './reader-fixture';

test('prefetches exactly three chapters sequentially, without progress mutations or downloads', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  const chapters: number[] = []; let active = 0; let maximum = 0;
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    expect(init.method).toBe('GET');
    const chapter = Number(new URL(url).searchParams.get('chapter'));
    active += 1; maximum = Math.max(maximum, active); chapters.push(chapter);
    await Promise.resolve(); active -= 1;
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: `Synthetic ${chapter}` });
  });
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  try {
    const prefetch = createChapterPrefetcher(client, readerNovel, { storage, request });
    const first = prefetch.activate(1);
    await Promise.all([first, prefetch.scroll(1, 0.81), prefetch.scroll(1, 0.96), prefetch.scroll(1, 1)]);
    expect(chapters).toEqual([2, 3, 4]);
    expect(maximum).toBe(1);
    expect(memory.files.write).not.toHaveBeenCalled();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(client.getQueryData(keys.chapter(readerScope, 'https://example.org/chapter-3', 3))).toMatchObject({ text: 'Synthetic 3' });
    prefetch.dispose();
  } finally { client.clear(); }
});

test('scroll thresholds are strict and do not exceed the known last chapter', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  const chapters: number[] = [];
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async url => {
    const chapter = Number(new URL(url).searchParams.get('chapter')); chapters.push(chapter);
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: 'Synthetic' });
  } });
  try {
    const prefetch = createChapterPrefetcher(client, readerNovel, { storage, request });
    await prefetch.scroll(2, 0.8); expect(chapters).toEqual([]);
    await prefetch.scroll(2, 0.95); expect(chapters).toEqual([3]);
    await prefetch.scroll(2, 0.951); expect(chapters).toEqual([3, 4, 5]);
    await prefetch.activate(5); expect(chapters).toEqual([3, 4, 5]);
    prefetch.dispose();
  } finally { client.clear(); }
});

test('failures remain silent and are not retried on every scroll frame', async () => {
  const memory = memoryFiles(); const client = readerQueryClient();
  const transport = jest.fn(async () => jsonResponse({}, 503));
  try {
    const prefetch = createChapterPrefetcher(client, readerNovel, { storage: createLocalStorage(memory.files), request: createHttpResource({ baseUrl: () => 'https://api.example', transport }) });
    await expect(prefetch.activate(1)).resolves.toBeUndefined();
    await prefetch.scroll(1, 0.96); await prefetch.scroll(1, 1);
    expect(transport).toHaveBeenCalledTimes(3);
    expect(memory.files.write).not.toHaveBeenCalled();
    prefetch.dispose();
  } finally { client.clear(); }
});

test('dispose drops pending work while preserving a shared request already in flight', async () => {
  const memory = memoryFiles(); const client = readerQueryClient();
  let release = () => {}; const pending = new Promise<void>(resolve => { release = resolve; });
  const transport = jest.fn(async (url: string) => {
    await pending; const chapter = Number(new URL(url).searchParams.get('chapter'));
    return jsonResponse({ url: `https://example.org/chapter-${chapter}`, chapter, text: 'Synthetic' });
  });
  try {
    const prefetch = createChapterPrefetcher(client, readerNovel, { storage: createLocalStorage(memory.files), request: createHttpResource({ baseUrl: () => 'https://api.example', transport }) });
    const ready = prefetch.activate(1);
    prefetch.dispose(); release(); await ready;
    expect(transport.mock.calls.length).toBeLessThanOrEqual(1);
    await prefetch.activate(2);
    expect(transport.mock.calls.length).toBeLessThanOrEqual(1);
  } finally { release(); client.clear(); }
});

test('offline prefetch uses downloaded text and never requests missing chapters', async () => {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  await storage.saveChapter(readerScope, 2, 'Segundo local.');
  const transport = jest.fn(async () => { throw new Error('Must not access the network'); });
  try {
    const prefetch = createChapterPrefetcher(client, readerNovel, { storage, request: createHttpResource({ baseUrl: () => 'https://api.example', transport }) }, () => false);
    await prefetch.activate(1);
    expect(transport).not.toHaveBeenCalled();
    expect(client.getQueryData(keys.chapter(readerScope, 'https://example.org/chapter-2', 2))).toMatchObject({ text: 'Segundo local.' });
    prefetch.dispose();
  } finally { client.clear(); }
});
