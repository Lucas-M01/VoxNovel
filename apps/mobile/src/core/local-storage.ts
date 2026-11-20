import { z } from 'zod';
import { chapterSchema, chapterTextSchema, novelSchema, type Novel } from '@core/api/schemas';
import { deviceFiles, type LocalFiles } from '@core/local-files';

const segment = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const storedChapter = z.object({ cap: chapterSchema, texto: z.string().min(1) });
const storedLibrary = z.object({ obras: z.array(novelSchema), salvoEm: z.number().nonnegative() });
export type ChapterText = z.infer<typeof chapterTextSchema>;

export class LocalStorageError extends Error {
  constructor() { super('Não foi possível salvar o texto no aparelho.'); this.name = 'LocalStorageError'; }
}

export function createLocalStorage(files: LocalFiles = deviceFiles, now: () => number = Date.now) {
  const root = () => files.documentDirectory().replace(/\/+$/, '');
  const libraryPath = () => `${root()}/cache_obras.json`;
  const directory = (novelId: string) => `${root()}/downloads/${segment.parse(novelId)}`;
  const path = (novelId: string, chapter: number) => `${directory(novelId)}/cap_${chapterSchema.parse(chapter)}.json`;
  async function readChapter(novelId: string, chapter: number): Promise<ChapterText | null> {
    const target = path(novelId, chapter);
    try {
      if (!await files.exists(target)) return null;
      const data = storedChapter.safeParse(JSON.parse(await files.read(target)));
      if (!data.success || data.data.cap !== chapter) return null;
      return { chapter: data.data.cap, text: data.data.texto };
    } catch { return null; }
  }
  async function listChapters(novelId: string): Promise<number[]> {
    const target = directory(novelId);
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
    async hasChapter(novelId: string, chapter: number): Promise<boolean> {
      const target = path(novelId, chapter);
      try { return await files.exists(target); } catch { return false; }
    },
    async saveChapter(novelId: string, chapter: number, text: string): Promise<string> {
      const target = path(novelId, chapter);
      const data = storedChapter.parse({ cap: chapter, texto: text });
      try {
        await files.mkdir(directory(novelId));
        await files.write(target, JSON.stringify(data));
        return target;
      } catch { throw new LocalStorageError(); }
    },
    async removeChapter(novelId: string, chapter: number): Promise<string[]> {
      const target = path(novelId, chapter);
      try {
        if (!await files.exists(target)) return [];
        await files.remove(target);
        return [target];
      } catch { return []; }
    },
    async removeNovel(novelId: string): Promise<boolean> {
      const target = directory(novelId);
      try {
        if (!await files.exists(target)) return false;
        await files.remove(target);
        return true;
      } catch { return false; }
    },
    async countChapters(novelIds: string[]): Promise<Record<string, number>> {
      const counts: Record<string, number> = {};
      for (const id of novelIds) counts[id] = (await listChapters(id)).length;
      return counts;
    },
    async usedBytes(novelId: string): Promise<number> {
      const target = directory(novelId);
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
