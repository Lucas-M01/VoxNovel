import type { ChapterScope } from '@core/local-storage';

export const keys = {
  library: () => ['library'],
  novels: () => ['novels'],
  novel: (id: string) => ['novels', id],
  sourceSearch: (name: string) => ['sources', 'search', name],
  sourceMetadata: (url: string) => ['sources', 'identify', url],
  chapter: (scope: ChapterScope, url: string, chapter: number) => ['chapters', scope.novelId, scope.sourceId, url, chapter],
  downloads: (id: string) => ['downloads', id],
  downloadedText: (id: string, chapter: number) => ['downloads', id, chapter],
  localChapters: (scope: ChapterScope) => ['local-chapters', scope.novelId, scope.sourceId],
  filters: () => ['filters'],
  settings: () => ['settings'],
  status: () => ['status'],
  logs: () => ['logs'],
};
