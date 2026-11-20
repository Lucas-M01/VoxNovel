import { useEffect, type RefObject } from 'react';

type ScrollTarget = { scrollTo: (options: { y: number; animated: boolean }) => void };
export function useAutoScroll(enabled: boolean, speed: number, target: RefObject<ScrollTarget | null>, offset: RefObject<number>) {
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (!target.current) return;
      offset.current += speed;
      target.current.scrollTo({ y: offset.current, animated: false });
    }, 16);
    return () => clearInterval(interval);
  }, [enabled, speed, target, offset]);
}
