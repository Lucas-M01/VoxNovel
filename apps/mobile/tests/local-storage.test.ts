import { onlineManager } from '@tanstack/react-query';
import { createLocalStorage, LocalStorageError } from '@core/local-storage';
import { createHttpResource } from '@core/http-resource';
import { apiQueries, createQueryClient } from '@core/queries';
import { memoryFiles } from './local-files';

const novelId = '11111111-1111-4111-8111-111111111111';
const scope = { novelId, sourceId: 'source-a' };
const otherScope = { novelId: 'other', sourceId: 'source-a' };
const novel = { id: novelId, title: 'Synthetic', slug: 'synthetic', current_chapter: 1, image_url: null, total_chapters: null, active_source_id: null, sources: [], updated_at: '2026-11-20T12:00:00Z' };
const target = `file://documents/downloads/${novelId}/sources/source-a/cap_3.json`;

function setup() {
  const memory = memoryFiles();
  return { ...memory, storage: createLocalStorage(memory.files, () => 1234) };
}

test('stores the observed library envelope and reads the validated snapshot', async () => {
  const { storage, contents } = setup();
  await expect(storage.saveLibrary([novel])).resolves.toBe(true);
  expect(JSON.parse(contents.get('file://documents/cache_obras.json') ?? '')).toEqual({ obras: [novel], salvoEm: 1234 });
  await expect(storage.readLibrary()).resolves.toEqual([novel]);
});

test('returns null for missing cache and preserves corrupt cache untouched', async () => {
  const { storage, contents } = setup();
  await expect(storage.readLibrary()).resolves.toBeNull();
  for (const text of ['broken-json', '{"obras":[{"unexpected":true}],"salvoEm":1}', '{"obras":[],"salvoEm":"invalid"}']) {
    contents.set('file://documents/cache_obras.json', text);
    await expect(storage.readLibrary()).resolves.toBeNull();
    expect(contents.get('file://documents/cache_obras.json')).toBe(text);
  }
});

test('stores only text in persistent documents using the observed chapter format', async () => {
  const { storage, contents } = setup();
  await expect(storage.saveChapter(scope, 3, 'Texto sintético.')).resolves.toBe(target);
  expect(contents.get(target)).toBe(JSON.stringify({ cap: 3, texto: 'Texto sintético.' }));
  await expect(storage.hasChapter(scope, 3)).resolves.toBe(true);
  await expect(storage.readChapter(scope, 3)).resolves.toEqual({ chapter: 3, text: 'Texto sintético.' });
});

test.each(['broken-json', '{"cap":3,"texto":42}', '{"cap":4,"texto":"Outra frase."}', '{"cap":3,"texto":""}'])('preserves an unreadable chapter without overwriting it: %s', async text => {
  const { storage, contents } = setup();
  contents.set(target, text);
  await expect(storage.readChapter(scope, 3)).resolves.toBeNull();
  expect(contents.get(target)).toBe(text);
});

test('returns missing chapter states without creating directories', async () => {
  const { storage, files } = setup();
  await expect(storage.readChapter(scope, 3)).resolves.toBeNull();
  await expect(storage.hasChapter(scope, 3)).resolves.toBe(false);
  await expect(storage.listChapters(scope)).resolves.toEqual([]);
  await expect(storage.removeChapter(scope, 3)).resolves.toEqual([]);
  await expect(storage.removeNovel(novelId)).resolves.toBe(false);
  expect(files.mkdir).not.toHaveBeenCalled();
});

test('lists chapter numbers in numeric order and ignores unrelated names', async () => {
  const { storage, contents } = setup();
  await storage.saveChapter(scope, 10, 'Dez.');
  await storage.saveChapter(scope, 2, 'Dois.');
  for (const name of ['cap_0.json', 'cap_2.json.bak', 'cap_3oops.json', 'cap_9007199254740992.json', 'audio.wav']) {
    contents.set(`file://documents/downloads/${novelId}/sources/source-a/${name}`, 'Synthetic');
  }
  await expect(storage.listChapters(scope)).resolves.toEqual([2, 10]);
  await expect(storage.countChapters([scope, otherScope])).resolves.toEqual({ [novelId]: 2, other: 0 });
});

test('removes only the requested chapter or novel and reports remaining text bytes', async () => {
  const { storage, contents } = setup();
  await storage.saveChapter(scope, 3, 'Três.');
  await storage.saveChapter(scope, 4, 'Quatro.');
  await storage.saveChapter(otherScope, 3, 'Outra.');
  await expect(storage.usedBytes(scope)).resolves.toBe((contents.get(target)?.length ?? 0) + (contents.get(target.replace('cap_3', 'cap_4'))?.length ?? 0));
  await expect(storage.removeChapter(scope, 3)).resolves.toEqual([target]);
  await expect(storage.listChapters(scope)).resolves.toEqual([4]);
  await expect(storage.removeNovel(novelId)).resolves.toBe(true);
  await expect(storage.listChapters(scope)).resolves.toEqual([]);
  await expect(storage.readChapter(otherScope, 3)).resolves.toMatchObject({ text: 'Outra.' });
});

test('handles IO failure without claiming successful persistence or deletion', async () => {
  const { storage, fail } = setup();
  fail();
  await expect(storage.saveLibrary([novel])).resolves.toBe(false);
  await expect(storage.saveChapter(scope, 3, 'Texto.')).rejects.toBeInstanceOf(LocalStorageError);
  await expect(storage.readLibrary()).resolves.toBeNull();
  await expect(storage.readChapter(scope, 3)).resolves.toBeNull();
  await expect(storage.listChapters(scope)).resolves.toEqual([]);
  await expect(storage.hasChapter(scope, 3)).resolves.toBe(false);
  await expect(storage.removeChapter(scope, 3)).resolves.toEqual([]);
  await expect(storage.removeNovel(novelId)).resolves.toBe(false);
  await expect(storage.usedBytes(scope)).resolves.toBe(0);
});

test('rejects unsafe identifiers and chapter values before writing any files', async () => {
  const { storage, files } = setup();
  for (const id of ['../outside', 'book/source', '', '%2e%2e', 'a\\b']) {
    await expect(storage.saveChapter({ novelId: id, sourceId: 'source-a' }, 1, 'Texto.')).rejects.toThrow();
  }
  await expect(storage.saveChapter(scope, 0, 'Texto.')).rejects.toThrow();
  await expect(storage.saveChapter(scope, 1, '')).rejects.toThrow();
  expect(files.write).not.toHaveBeenCalled();
});

test('library queries save online snapshots and use them during connection failure', async () => {
  const { storage } = setup();
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  let offline = false;
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport: async () => {
    if (offline) throw new Error('Synthetic offline');
    return { ok: true, status: 200, text: async () => JSON.stringify([novel]) };
  } });
  try {
    await expect(client.fetchQuery(apiQueries(request, storage).novels())).resolves.toEqual([novel]);
    await expect(storage.readLibrary()).resolves.toEqual([novel]);
    offline = true;
    onlineManager.setOnline(false);
    await expect(client.fetchQuery(apiQueries(request, storage).novels())).resolves.toEqual([novel]);
  } finally { onlineManager.setOnline(true); client.clear(); }
});

test('a library cache write failure does not hide valid online results', async () => {
  const { storage, fail } = setup();
  fail();
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport: async () => ({ ok: true, status: 200, text: async () => JSON.stringify([novel]) }) });
  const options = apiQueries(request, storage).novels();
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  try { await expect(client.fetchQuery(options)).resolves.toEqual([novel]); }
  finally { client.clear(); }
});

test('chapter queries use downloaded text offline and never auto-download online text', async () => {
  const { storage } = setup();
  await storage.saveChapter(scope, 3, 'Texto offline.');
  const transport = jest.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ chapter: 4, text: 'Texto online.', url: 'https://example.org/chapter-4' }) }));
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport });
  const queries = apiQueries(request, storage);
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  try {
    onlineManager.setOnline(false);
    await expect(client.fetchQuery(queries.chapter(scope, 'https://example.org/chapter-3', 3))).resolves.toMatchObject({ text: 'Texto offline.' });
    expect(transport).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    await expect(client.fetchQuery(queries.chapter(scope, 'https://example.org/chapter-4', 4))).resolves.toMatchObject({ text: 'Texto online.' });
    await expect(storage.readChapter(scope, 4)).resolves.toBeNull();
  } finally { onlineManager.setOnline(true); client.clear(); }
});

test('a missing offline snapshot preserves the connection error instead of inventing an empty library', async () => {
  const { storage } = setup();
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport: async () => { throw new Error('Synthetic offline'); } });
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  try { await expect(client.fetchQuery(apiQueries(request, storage).novels())).rejects.toMatchObject({ kind: 'network' }); }
  finally { client.clear(); }
});

test('cancelling a library request does not load an offline snapshot as a successful result', async () => {
  const { storage, files } = setup();
  await storage.saveLibrary([novel]);
  const request = createHttpResource({ baseUrl: () => 'http://api.example', transport: async (_url, init) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new Error('Synthetic abort')), { once: true });
  }) });
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  try {
    const pending = client.fetchQuery(apiQueries(request, storage).novels());
    const assertion = expect(pending).rejects.toBeDefined();
    await client.cancelQueries();
    await assertion;
    expect(files.read).not.toHaveBeenCalled();
  } finally { client.clear(); }
});
