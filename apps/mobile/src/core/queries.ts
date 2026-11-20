import { QueryClient, mutationOptions, queryOptions } from '@tanstack/react-query';
import { chapterResources } from '@core/api/chapters';
import { downloadResources } from '@core/api/downloads';
import { filterResources } from '@core/api/filters';
import { novelResources } from '@core/api/novels';
import { settingsResources } from '@core/api/settings';
import { sourceResources } from '@core/api/sources';
import { systemResources } from '@core/api/system';
import type { Filters, FilterKind, NovelInput, SourceInput } from '@core/api/schemas';
import { httpResource, type HttpResource } from '@core/http-resource';
import { keys } from '@core/keys';

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function apiQueries(request: HttpResource = httpResource) {
  const novels = novelResources(request);
  const sources = sourceResources(request);
  const chapters = chapterResources(request);
  const downloads = downloadResources(request);
  const filters = filterResources(request);
  const settings = settingsResources(request);
  const system = systemResources(request);
  return {
    novels: () => queryOptions({ queryKey: keys.novels(), queryFn: ({ signal }) => novels.list(signal) }),
    novel: (id: string) => queryOptions({ queryKey: keys.novel(id), queryFn: ({ signal }) => novels.get(id, signal) }),
    search: (name: string) => queryOptions({ queryKey: keys.sourceSearch(name), queryFn: ({ signal }) => sources.search(name, signal) }),
    identify: (url: string) => queryOptions({ queryKey: keys.sourceMetadata(url), queryFn: ({ signal }) => sources.identify(url, signal) }),
    chapter: (url: string, chapter: number) => queryOptions({ queryKey: keys.chapter(url, chapter), queryFn: ({ signal }) => chapters.text(url, chapter, signal) }),
    downloads: (id: string) => queryOptions({ queryKey: keys.downloads(id), queryFn: ({ signal }) => downloads.list(id, signal) }),
    downloadedText: (id: string, chapter: number) => queryOptions({ queryKey: keys.downloadedText(id, chapter), queryFn: ({ signal }) => downloads.text(id, chapter, signal) }),
    filters: () => queryOptions({ queryKey: keys.filters(), queryFn: ({ signal }) => filters.get(signal) }),
    settings: () => queryOptions({ queryKey: keys.settings(), queryFn: ({ signal }) => settings.get(signal) }),
    status: () => queryOptions({ queryKey: keys.status(), queryFn: ({ signal }) => system.status(signal) }),
    logs: () => queryOptions({ queryKey: keys.logs(), queryFn: ({ signal }) => system.logs(signal) }),
  };
}

export function apiMutations(client: QueryClient, request: HttpResource = httpResource) {
  const novels = novelResources(request);
  const downloads = downloadResources(request);
  const filters = filterResources(request);
  const settings = settingsResources(request);
  function mutation<T, R>(mutationFn: (input: T) => Promise<R>, affected: (input: T) => (string | number)[][]) {
    return mutationOptions({
      mutationFn,
      onSuccess: async (_data, input) => {
        await Promise.all(affected(input).map(queryKey => client.invalidateQueries({ queryKey })));
      },
    });
  }
  const libraryKeys = () => [keys.novels(), keys.logs()];
  const filterKeys = () => [keys.filters(), ['chapters'], keys.logs()];
  const downloadKeys = (input: { id: string }) => [keys.downloads(input.id), keys.logs()];
  return {
    createNovel: () => mutation((input: NovelInput) => novels.create(input), libraryKeys),
    deleteNovel: () => mutation((id: string) => novels.remove(id), id => [...libraryKeys(), keys.downloads(id)]),
    progress: () => mutation((input: { id: string; chapter: number }) => novels.progress(input.id, input.chapter), libraryKeys),
    addSource: () => mutation((input: { id: string; source: SourceInput }) => novels.addSource(input.id, input.source), libraryKeys),
    activateSource: () => mutation((input: { id: string; sourceId: string }) => novels.activateSource(input.id, input.sourceId), libraryKeys),
    removeSource: () => mutation((input: { id: string; sourceId: string }) => novels.removeSource(input.id, input.sourceId), libraryKeys),
    replaceFilters: () => mutation((input: Filters) => filters.replace(input), filterKeys),
    clearFilters: () => mutation(() => filters.clear(), filterKeys),
    addFilter: () => mutation((input: { kind: FilterKind; value: string }) => filters.add(input.kind, input.value), filterKeys),
    removeFilter: () => mutation((input: { kind: FilterKind; value: string }) => filters.remove(input.kind, input.value), filterKeys),
    saveSpeed: () => mutation((speed: number) => settings.save(speed), () => [keys.settings()]),
    generateDownload: () => mutation((input: { id: string; chapter: number }) => downloads.generate(input.id, input.chapter), downloadKeys),
    removeChapterDownload: () => mutation((input: { id: string; chapter: number }) => downloads.removeChapter(input.id, input.chapter), downloadKeys),
    removeNovelDownloads: () => mutation((input: { id: string }) => downloads.removeNovel(input.id), downloadKeys),
  };
}
