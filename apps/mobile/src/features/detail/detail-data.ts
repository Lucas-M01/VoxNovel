import type { QueryClient } from '@tanstack/react-query';
import { novelResources } from '@core/api/novels';
import type { Novel } from '@core/api/schemas';
import { keys } from '@core/keys';
import { getConnectivity } from '@core/connectivity';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { saveLibrarySnapshot, type LibraryData } from '@features/library/library-data';

export function detailOptions(id: string, services = readerServices) {
  return { queryKey: keys.novel(id), networkMode: 'always', queryFn: async ({ signal }: { signal: AbortSignal }) => {
    try {
      if (getConnectivity() === 'offline') throw new Error('Sem conexão.');
      return await novelResources(services.request).get(id, signal);
    }
    catch (error) {
      if (signal.aborted) throw error;
      const cached = (await services.storage.readLibrary())?.find(novel => novel.id === id);
      if (!cached) throw error;
      return cached;
    }
  } } satisfies Parameters<QueryClient['fetchQuery']>[0];
}
export async function rememberNovel(client: QueryClient, novel: Novel, services: ReaderServices) {
  await Promise.all([client.cancelQueries({ queryKey: keys.novel(novel.id), exact: true }), client.cancelQueries({ queryKey: keys.library() })]);
  client.setQueryData(keys.novel(novel.id), novel);
  const library = client.getQueryData<LibraryData>(keys.library());
  const cached = library?.novels ?? await services.storage.readLibrary();
  if (cached) {
    const novels = cached.map(item => item.id === novel.id ? novel : item);
    client.setQueryData(keys.library(), { novels, offline: library?.offline ?? false });
    await saveLibrarySnapshot(services, novels);
  }
  await client.invalidateQueries({ queryKey: keys.localChapterLists() });
}
