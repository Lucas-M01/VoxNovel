import { useEffect, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { getConnectivity } from '@core/connectivity';
import { createChapterPrefetcher } from '@features/reader/chapter-prefetch';
import type { ReaderServices } from '@features/reader/reader-data';

export function useChapterPrefetch(client: QueryClient, novel: Novel, services: ReaderServices) {
  const [prefetch] = useState(() => createChapterPrefetcher(client, novel, services, () => getConnectivity() !== 'offline'));
  useEffect(() => { prefetch.open(); return () => prefetch.dispose(); }, [prefetch]);
  return prefetch;
}
