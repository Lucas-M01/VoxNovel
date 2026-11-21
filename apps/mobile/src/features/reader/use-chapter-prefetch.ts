import { useEffect, useMemo } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { getConnectivity } from '@core/connectivity';
import type { TextMode } from '@core/text-mode';
import { createChapterPrefetcher } from '@features/reader/chapter-prefetch';
import type { ReaderServices } from '@features/reader/reader-data';

export function useChapterPrefetch(client: QueryClient, novel: Novel, services: ReaderServices, mode: TextMode = 'translated') {
  const prefetch = useMemo(() => createChapterPrefetcher(client, novel, services, () => getConnectivity() !== 'offline', mode), [client, novel, services, mode]);
  useEffect(() => { prefetch.open(); return () => prefetch.dispose(); }, [prefetch]);
  return prefetch;
}
