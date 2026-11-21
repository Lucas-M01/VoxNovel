import { queryOptions } from '@tanstack/react-query';
import { keys } from '@core/keys';
import { localStorage, type ChapterScope, type LocalStorage } from '@core/local-storage';

export function localChaptersOptions(scope: ChapterScope, storage: LocalStorage = localStorage) {
  return queryOptions({ queryKey: keys.localChapters(scope), networkMode: 'always', queryFn: () => storage.listChapters(scope) });
}

export function devicePreferencesOptions(storage: LocalStorage = localStorage) {
  return queryOptions({
    queryKey: ['device-preferences'],
    networkMode: 'always',
    staleTime: Infinity,
    queryFn: () => storage.readPreferences(),
  });
}
