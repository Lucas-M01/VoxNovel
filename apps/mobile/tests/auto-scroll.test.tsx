import { useRef } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useAutoScroll } from '@features/reader/use-auto-scroll';

function useTestScroll(enabled: boolean, speed: number, scrollTo: (options: { y: number; animated: boolean }) => void) {
  const target = useRef({ scrollTo });
  const offset = useRef(0);
  useAutoScroll(enabled, speed, target, offset);
  return offset;
}

test('autoscroll follows its own timer, restarts on speed change and stops on pause/unmount', async () => {
  jest.useFakeTimers();
  try {
    const intervals = jest.spyOn(globalThis, 'setInterval');
    const cleared = jest.spyOn(globalThis, 'clearInterval');
    const scrollTo = jest.fn();
    const hook = await renderHook<ReturnType<typeof useTestScroll>, { enabled: boolean; speed: number }>(({ enabled, speed }) => useTestScroll(enabled, speed, scrollTo), { initialProps: { enabled: true, speed: 0.5 } });
    await act(async () => { jest.advanceTimersByTime(48); });
    expect(scrollTo.mock.calls.map(([position]) => position.y)).toEqual([0.5, 1, 1.5]);
    await hook.rerender({ enabled: true, speed: 1.8 });
    await act(async () => { jest.advanceTimersByTime(16); });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 3.3, animated: false });
    await hook.rerender({ enabled: false, speed: 1.8 });
    await act(async () => { jest.advanceTimersByTime(160); });
    expect(scrollTo).toHaveBeenCalledTimes(4);
    await hook.rerender({ enabled: true, speed: 1 });
    await hook.unmount();
    await act(async () => { jest.advanceTimersByTime(160); });
    expect(scrollTo).toHaveBeenCalledTimes(4);
    expect(intervals).toHaveBeenCalledTimes(3);
    for (const result of intervals.mock.results) {
      expect(cleared.mock.calls.some(([id]) => id === result.value)).toBe(true);
    }
    intervals.mockRestore(); cleared.mockRestore();
  } finally { jest.useRealTimers(); }
});
