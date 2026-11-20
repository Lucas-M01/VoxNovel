import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { novelResources } from '@core/api/novels';
import type { Novel } from '@core/api/schemas';
import { getConnectivity } from '@core/connectivity';
import { keys } from '@core/keys';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';

const writes = new WeakMap<ReaderServices['storage'], Promise<boolean>>();
export async function saveLibrarySnapshot(services: ReaderServices, novels: Novel[], signal?: AbortSignal) {
  const pending = (writes.get(services.storage) ?? Promise.resolve(true)).then(() => signal?.aborted ? false : services.storage.saveLibrary(novels));
  writes.set(services.storage, pending); await pending;
}
export type LibraryData = { novels: Novel[]; offline: boolean };
export function libraryOptions(services = readerServices) {
  return queryOptions({ queryKey: keys.library(), networkMode: 'always', queryFn: async ({ signal }): Promise<LibraryData> => {
    try {
      if (getConnectivity() === 'offline') throw new Error('Sem conexão.');
      const novels = await novelResources(services.request).list(signal);
      if (signal.aborted) throw new Error('Solicitação cancelada.');
      await saveLibrarySnapshot(services, novels, signal);
      if (signal.aborted) throw new Error('Solicitação cancelada.');
      return { novels, offline: false };
    } catch (error) {
      if (signal.aborted) throw error;
      const cached = await services.storage.readLibrary();
      if (cached === null) throw error;
      return { novels: cached, offline: true };
    }
  } });
}
export async function deleteLibraryNovel(client: QueryClient, novel: Novel, services: ReaderServices) {
  if (getConnectivity() === 'offline' || client.getQueryData<LibraryData>(keys.library())?.offline) throw new Error('Conecte-se à internet para remover a obra.');
  await client.cancelQueries({ queryKey: keys.library() });
  await novelResources(services.request).remove(novel.id);
  const previous = client.getQueryData<LibraryData>(keys.library());
  if (previous) {
    const next = { ...previous, novels: previous.novels.filter(item => item.id !== novel.id) };
    client.setQueryData(keys.library(), next); await saveLibrarySnapshot(services, next.novels);
  }
  client.removeQueries({ queryKey: keys.novel(novel.id), exact: true });
  await client.invalidateQueries({ queryKey: keys.novels() });
}
