import { z } from 'zod';
import { chapterSchema, chapterTextSchema, novelSchema, type Novel } from '@core/api/schemas';
import { devicePreferencesSchema, type DevicePreferences } from '@core/device-preferences';
import { deviceFiles, type LocalFiles } from '@core/local-files';

const segment = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const storedChapter = z.object({ cap: chapterSchema, texto: z.string().min(1) });
const storedLibrary = z.object({ obras: z.array(novelSchema), salvoEm: z.number().nonnegative() });
export type ChapterScope = { novelId: string; sourceId: string };
export type ChapterText = z.infer<typeof chapterTextSchema>;

export class LocalStorageError extends Error {
  constructor() { super('Não foi possível salvar o texto no aparelho.'); this.name = 'LocalStorageError'; }
}

export function createLocalStorage(files: LocalFiles = deviceFiles, now: () => number = Date.now) {
  const root = () => files.documentDirectory().replace(/\/+$/, '');
  const preferencesPath = () => `${root()}/preferences.json`;
  const libraryPath = () => `${root()}/cache_obras.json`;
  const sourceRoot = (novelId: string) => `${root()}/downloads/${segment.parse(novelId)}/sources`;
  const directory = (scope: ChapterScope) => `${sourceRoot(scope.novelId)}/${segment.parse(scope.sourceId)}`;
  const path = (scope: ChapterScope, chapter: number) => `${directory(scope)}/cap_${chapterSchema.parse(chapter)}.json`;
  async function readChapter(scope: ChapterScope, chapter: number): Promise<ChapterText | null> {
    const target = path(scope, chapter);
    try {
      if (!await files.exists(target)) return null;
      const data = storedChapter.safeParse(JSON.parse(await files.read(target)));
      if (!data.success || data.data.cap !== chapter) return null;
      return { chapter: data.data.cap, text: data.data.texto };
    } catch { return null; }
  }
  async function listChapters(scope: ChapterScope): Promise<number[]> {
    const target = directory(scope);
    try {
      if (!await files.exists(target)) return [];
      const chapters = (await files.list(target)).flatMap(name => {
        const match = /^cap_([1-9]\d*)\.json$/.exec(name);
        const result = chapterSchema.safeParse(Number(match?.[1]));
        return match && result.success ? [result.data] : [];
      });
      return [...new Set(chapters)].sort((a, b) => a - b);
    } catch { return []; }
  }
  return {
    async readPreferences(): Promise<DevicePreferences> {
      try {
        const target = preferencesPath();
        if (!await files.exists(target)) return {};
        const data = devicePreferencesSchema.safeParse(JSON.parse(await files.read(target)));
        return data.success ? data.data : {};
      } catch { return {}; }
    },
    async savePreferences(preferences: DevicePreferences): Promise<void> {
      await files.write(preferencesPath(), JSON.stringify(devicePreferencesSchema.parse(preferences)));
    },
    async saveLibrary(novels: Novel[]): Promise<boolean> {
      const data = storedLibrary.parse({ obras: novels, salvoEm: now() });
      try { await files.write(libraryPath(), JSON.stringify(data)); return true; }
      catch { return false; }
    },
    async readLibrary(): Promise<Novel[] | null> {
      try {
        const target = libraryPath();
        if (!await files.exists(target)) return null;
        const data = storedLibrary.safeParse(JSON.parse(await files.read(target)));
        return data.success ? data.data.obras : null;
      } catch { return null; }
    },
    readChapter,
    listChapters,
    async hasChapter(scope: ChapterScope, chapter: number): Promise<boolean> {
      const target = path(scope, chapter);
      try { return await files.exists(target); } catch { return false; }
    },
    async saveChapter(scope: ChapterScope, chapter: number, text: string): Promise<string> {
      const target = path(scope, chapter);
      const data = storedChapter.parse({ cap: chapter, texto: text });
      try {
        await files.mkdir(directory(scope));
        await files.write(target, JSON.stringify(data));
        return target;
      } catch { throw new LocalStorageError(); }
    },
    async removeChapter(scope: ChapterScope, chapter: number): Promise<string[]> {
      const target = path(scope, chapter);
      try {
        if (!await files.exists(target)) return [];
        await files.remove(target);
        return [target];
      } catch { return []; }
    },
    async removeNovel(novelId: string): Promise<boolean> {
      const target = sourceRoot(novelId);
      try {
        if (!await files.exists(target)) return false;
        await files.remove(target);
        return true;
      } catch { return false; }
    },
    async countChapters(scopes: ChapterScope[]): Promise<Record<string, number>> {
      const counts: Record<string, number> = {};
      for (const scope of scopes) counts[scope.novelId] = (await listChapters(scope)).length;
      return counts;
    },
    async usedBytes(scope: ChapterScope): Promise<number> {
      const target = directory(scope);
      try {
        if (!await files.exists(target)) return 0;
        let bytes = 0;
        for (const name of await files.list(target)) {
          if (/^cap_[1-9]\d*\.json$/.test(name)) bytes += await files.size(`${target}/${name}`);
        }
        return bytes;
      } catch { return 0; }
    },
  };
}

export type LocalStorage = ReturnType<typeof createLocalStorage>;
export const localStorage = createLocalStorage();
