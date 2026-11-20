export const keys = {
  novels: () => ['novels'],
  novel: (id: string) => ['novels', id],
  sourceSearch: (name: string) => ['sources', 'search', name],
  sourceMetadata: (url: string) => ['sources', 'identify', url],
  chapter: (url: string, chapter: number) => ['chapters', url, chapter],
  downloads: (id: string) => ['downloads', id],
  downloadedText: (id: string, chapter: number) => ['downloads', id, chapter],
  filters: () => ['filters'],
  settings: () => ['settings'],
  status: () => ['status'],
  logs: () => ['logs'],
};
