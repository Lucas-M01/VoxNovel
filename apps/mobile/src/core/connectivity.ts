import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { z } from 'zod';

type Connectivity = 'unknown' | 'online' | 'offline';
const reachabilitySchema = z.object({ isInternetReachable: z.boolean().nullable() });
export function connectivityStatus(value: unknown): Connectivity {
  const parsed = reachabilitySchema.safeParse(value);
  if (!parsed.success || parsed.data.isInternetReachable === null) return 'unknown';
  return parsed.data.isInternetReachable ? 'online' : 'offline';
}
let status: Connectivity = 'unknown';
const listeners = new Set<() => void>();
let unsubscribe: (() => void) | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!unsubscribe) {
    unsubscribe = NetInfo.addEventListener(value => {
      const next = connectivityStatus(value);
      onlineManager.setOnline(next !== 'offline');
      if (status !== next) { status = next; for (const notify of listeners) notify(); }
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribe?.(); unsubscribe = undefined; status = 'unknown'; onlineManager.setOnline(true);
    }
  };
}
export function getConnectivity(): Connectivity { return status; }
export function useConnectivity(): Connectivity {
  return useSyncExternalStore<Connectivity>(subscribe, getConnectivity, () => 'unknown');
}
export function chapterAvailable(offline: boolean, downloaded: ReadonlySet<number>, chapter: number): boolean {
  return Number.isSafeInteger(chapter) && chapter > 0 && (!offline || downloaded.has(chapter));
}
