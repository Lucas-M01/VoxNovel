import { createLocalStorage } from '@core/local-storage';
import { createHttpResource } from '@core/http-resource';
import { apiQueries, createQueryClient } from '@core/queries';
import { keys } from '@core/keys';
import { memoryFiles } from './local-files';

const a = { novelId: 'synthetic-book', sourceId: 'source-a' };
const b = { novelId: 'synthetic-book', sourceId: 'source-b' };
const other = { novelId: 'other-book', sourceId: 'source-a' };
const url = 'https://example.org/chapter-3';

function setup() {
  const memory = memoryFiles();
  return { ...memory, storage: createLocalStorage(memory.files) };
}

test('keeps the same chapter independent across sources and novels', async () => {
  const { storage, contents } = setup();
  await storage.saveChapter(a, 3, 'Texto A.');
  await storage.saveChapter(b, 3, 'Texto B.');
  await storage.saveChapter(other, 3, 'Outro livro.');
  await expect(storage.readChapter(a, 3)).resolves.toMatchObject({ text: 'Texto A.' });
  await expect(storage.readChapter(b, 3)).resolves.toMatchObject({ text: 'Texto B.' });
  await expect(storage.readChapter(other, 3)).resolves.toMatchObject({ text: 'Outro livro.' });
  expect(contents.size).toBe(3);
  await storage.removeChapter(a, 3);
  await expect(storage.listChapters(a)).resolves.toEqual([]);
  await expect(storage.listChapters(b)).resolves.toEqual([3]);
});

test('memory query identity includes source and novel even when chapter URL is identical', async () => {
  const { storage } = setup();
  await storage.saveChapter(a, 3, 'Texto A.');
  await storage.saveChapter(b, 3, 'Texto B.');
  await storage.saveChapter(other, 3, 'Outro livro.');
  const transport = jest.fn(async () => { throw new Error('Must stay offline'); });
  const queries = apiQueries(createHttpResource({ baseUrl: () => 'http://api.example', transport }), storage);
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, staleTime: Infinity } });
  try {
    await expect(client.fetchQuery(queries.chapter(a, url, 3))).resolves.toMatchObject({ text: 'Texto A.' });
    await expect(client.fetchQuery(queries.chapter(b, url, 3))).resolves.toMatchObject({ text: 'Texto B.' });
    await expect(client.fetchQuery(queries.chapter(other, url, 3))).resolves.toMatchObject({ text: 'Outro livro.' });
    await expect(client.fetchQuery(queries.chapter(a, url, 3))).resolves.toMatchObject({ text: 'Texto A.' });
    expect(client.getQueryCache().getAll()).toHaveLength(3);
    expect(keys.chapter(a, url, 3)).not.toEqual(keys.chapter(b, url, 3));
    expect(transport).not.toHaveBeenCalled();
  } finally { client.clear(); }
});

test('a cache miss for one source never borrows another source or unidentified legacy text', async () => {
  const { storage, contents } = setup();
  await storage.saveChapter(a, 3, 'Texto A.');
  const legacyPath = `file://documents/downloads/${a.novelId}/cap_3.json`;
  const legacy = JSON.stringify({ cap: 3, texto: 'Origem não comprovada.' });
  contents.set(legacyPath, legacy);
  await expect(storage.readChapter(b, 3)).resolves.toBeNull();
  await expect(storage.hasChapter(b, 3)).resolves.toBe(false);
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport: async () => { throw new Error('Synthetic offline'); } });
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  try { await expect(client.fetchQuery(apiQueries(request, storage).chapter(b, url, 3))).rejects.toMatchObject({ kind: 'network' }); }
  finally { client.clear(); }
  expect(contents.get(legacyPath)).toBe(legacy);
});

test('the namespace transition is reversible and never consumes or rewrites old files', async () => {
  const { storage, contents } = setup();
  const legacyPath = `file://documents/downloads/${a.novelId}/cap_3.json`;
  const legacy = JSON.stringify({ cap: 3, texto: 'Backup sintético sem fonte.' });
  const library = JSON.stringify({ obras: [], salvoEm: 1234 });
  contents.set(legacyPath, legacy);
  contents.set('file://documents/cache_obras.json', library);
  const snapshot = new Map(contents);
  await expect(storage.readChapter(a, 3)).resolves.toBeNull();
  await expect(storage.listChapters(a)).resolves.toEqual([]);
  await expect(storage.removeNovel(a.novelId)).resolves.toBe(false);
  await storage.saveChapter(a, 3, 'Texto novo A.');
  await storage.saveChapter(b, 3, 'Texto novo B.');
  expect(contents.get(legacyPath)).toBe(legacy);
  await expect(storage.removeNovel(a.novelId)).resolves.toBe(true);
  expect(contents).toEqual(snapshot);
  expect(JSON.parse(contents.get(legacyPath) ?? '')).toEqual({ cap: 3, texto: 'Backup sintético sem fonte.' });
});

test('validates both path components before writing and keeps listings source specific', async () => {
  const { storage, files } = setup();
  await expect(storage.saveChapter({ novelId: a.novelId, sourceId: '../other' }, 3, 'Texto.')).rejects.toThrow();
  expect(files.write).not.toHaveBeenCalled();
  await storage.saveChapter(a, 3, 'Texto A.');
  await storage.saveChapter(b, 4, 'Texto B.');
  await expect(storage.countChapters([a])).resolves.toEqual({ [a.novelId]: 1 });
  await expect(storage.listChapters(b)).resolves.toEqual([4]);
});
