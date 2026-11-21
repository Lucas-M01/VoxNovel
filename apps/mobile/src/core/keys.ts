import type { ChapterScope } from '@core/local-storage';
import type { TextMode } from '@core/text-mode';

export const keys = {
  library: () => ['library'],
  novels: () => ['novels'],
  novel: (id: string) => ['novels', id],
  sourceSearch: (name: string) => ['sources', 'search', name],
  sourceMetadata: (url: string) => ['sources', 'identify', url],
  chapter: (scope: ChapterScope, url: string, chapter: number, mode: TextMode = 'translated') => ['chapters', scope.novelId, scope.sourceId, url, chapter, ...(mode === 'original' ? [mode] : [])],
  downloads: (id: string) => ['downloads', id],
  downloadedText: (id: string, chapter: number) => ['downloads', id, chapter],
  localChapterLists: () => ['local-chapters'],
  localChapters: (scope: ChapterScope) => ['local-chapters', scope.novelId, scope.sourceId],
  filters: () => ['filters'],
  settings: () => ['settings'],
  status: () => ['status'],
  logs: () => ['logs'],
};
