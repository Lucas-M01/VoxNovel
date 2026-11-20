import { downloadChapterRange, planDownloadRange, rangeInputSchema, type RangeProgress } from '@features/downloads/download-range';

test('validates interval, known end and 50-chapter maximum before any work', () => {
  expect(() => planDownloadRange(0, 2, null, new Set())).toThrow('Intervalo inválido.');
  expect(() => planDownloadRange(3, 2, null, new Set())).toThrow('Intervalo inválido.');
  expect(() => planDownloadRange(1, 51, null, new Set())).toThrow('Máximo de 50');
  expect(() => planDownloadRange(1, 11, 10, new Set())).toThrow('Máximo disponível: 10.');
  expect(planDownloadRange(1, 50, null, new Set([1, 3]))).toHaveLength(48);
  expect(rangeInputSchema.safeParse({ start: '1x', end: '2' }).success).toBe(false);
});

test('runs bounded groups of five in chapter order, counts failed attempts and skips existing files', async () => {
  let active = 0; let maximum = 0;
  const starts: number[] = [];
  const progress: RangeProgress[] = [];
  const result = await downloadChapterRange({
    start: 1, end: 13, maximum: 20, existing: new Set([2, 9]),
    download: async chapter => {
      starts.push(chapter); active += 1; maximum = Math.max(maximum, active);
      await Promise.resolve(); active -= 1;
      if (chapter === 5 || chapter === 12) throw new Error(`Synthetic failure ${chapter}`);
    },
    onProgress: value => progress.push(value),
  });
  expect(starts).toEqual([1, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13]);
  expect(maximum).toBe(5);
  expect(progress.filter(value => value.pending.length).map(value => value.pending)).toEqual([[1, 3, 4, 5, 6], [7, 8, 10, 11, 12], [13]]);
  expect(progress.at(-1)).toEqual({ done: 11, total: 11, pending: [] });
  expect(result).toEqual({ attempted: 11, skipped: 2, errors: { 5: 'Synthetic failure 5', 12: 'Synthetic failure 12' } });
});

test('does not start a later group before all jobs from the current group settle', async () => {
  let release = () => {}; const pending = new Promise<void>(resolve => { release = resolve; });
  const started: number[] = [];
  const result = downloadChapterRange({ start: 1, end: 6, maximum: null, existing: new Set(), download: async chapter => {
    started.push(chapter); if (chapter === 1) await pending;
  }, onProgress: () => {} });
  await Promise.resolve(); await Promise.resolve();
  expect(started).toEqual([1, 2, 3, 4, 5]);
  release(); await result;
  expect(started).toEqual([1, 2, 3, 4, 5, 6]);
});

test('a fully downloaded range produces explicit feedback without starting jobs', async () => {
  const download = jest.fn(async () => {});
  await expect(downloadChapterRange({ start: 1, end: 2, maximum: null, existing: new Set([1, 2]), download, onProgress: () => {} })).rejects.toThrow('Todos os capítulos');
  expect(download).not.toHaveBeenCalled();
});
