import { useEffect } from 'react';
import type { createPlaybackController } from '@features/speech/playback-controller';

export function usePlaybackLifecycle(controller: ReturnType<typeof createPlaybackController>) {
  useEffect(() => {
    controller.open();
    return () => { void controller.destroy().catch(() => {}); };
  }, [controller]);
}
