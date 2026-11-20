import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { chapterSchema, type Novel } from '@core/api/schemas';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { localChaptersOptions } from '@core/local-queries';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { createDownloadService } from '@features/downloads/download-service';
import { downloadChapterRange, planDownloadRange, rangeInputSchema, type RangeProgress } from '@features/downloads/download-range';
import { ProgressBar } from '@ui/progress-bar';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';

type Props = { novel: Novel; services?: ReaderServices | undefined; onRead: (chapter: number) => void; onListen: (chapter: number) => void };
export function DownloadsView({ novel, services = readerServices, onRead, onListen }: Props) {
  const client = useQueryClient();
  const [service] = useState(() => createDownloadService(client, novel, services));
  const query = useQuery(localChaptersOptions(service.scope, services.storage));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [progress, setProgress] = useState<RangeProgress | null>(null);
  const mutationKey = ['download-one', novel.id, service.scope.sourceId];
  const pending = useMutationState({ filters: { mutationKey, status: 'pending' }, select: mutation => mutation.state.variables });
  const pendingChapters = new Set(pending.flatMap(value => { const parsed = chapterSchema.safeParse(value); return parsed.success ? [parsed.data] : []; }));
  for (const chapter of progress?.pending ?? []) pendingChapters.add(chapter);
  const download = useMutation({
    mutationKey, mutationFn: (chapter: number) => service.download(chapter),
    onSuccess: (_result, chapter) => setErrors(previous => { const next = { ...previous }; delete next[chapter]; return next; }),
    onError: (error, chapter) => setErrors(previous => ({ ...previous, [chapter]: error.message })),
  });
  const remove = useMutation({ mutationFn: (chapter: number) => service.remove(chapter), onError: (error, chapter) => setErrors(previous => ({ ...previous, [chapter]: error.message })) });
  const range = useMutation({
    mutationFn: async ({ start, end }: { start: number; end: number }) => downloadChapterRange({
      start, end, maximum: service.maximum, existing: new Set(await services.storage.listChapters(service.scope)),
      download: service.download, onProgress: setProgress,
      onChapterError: (chapter, message) => setErrors(previous => ({ ...previous, [chapter]: message })),
    }),
    onSuccess: result => setErrors(previous => ({ ...previous, ...result.errors })),
    onError: error => setRangeError(error.message),
    onSettled: () => setProgress(null),
  });
  const chapters = query.data ?? [];
  const current = initialSpeechChapter(novel);
  const suggestions = service.maximum === null ? [] : Array.from({ length: Math.max(0, Math.min(10, service.maximum - current + 1)) }, (_, index) => current + index).filter(chapter => !chapters.includes(chapter));
  const openRange = () => {
    setRangeStart(String(current)); setRangeEnd(String(service.maximum === null ? current + 9 : Math.min(current + 9, service.maximum)));
    setRangeError(''); setRangeVisible(true);
  };
  const submitRange = () => {
    if (range.isPending) return;
    const parsed = rangeInputSchema.safeParse({ start: rangeStart, end: rangeEnd });
    if (!parsed.success) { setRangeError('Intervalo inválido.'); return; }
    try {
      const planned = planDownloadRange(parsed.data.start, parsed.data.end, service.maximum, new Set(chapters));
      if (!planned.length) throw new Error('Todos os capítulos desse intervalo já estão offline.');
      setErrors(previous => Object.fromEntries(Object.entries(previous).filter(([chapter]) => Number(chapter) < parsed.data.start || Number(chapter) > parsed.data.end)));
      setRangeError(''); setRangeVisible(false); range.mutate(parsed.data);
    } catch (error) { setRangeError(error instanceof Error ? error.message : 'Intervalo inválido.'); }
  };
  const otherErrors = Object.entries(errors).filter(([chapter]) => !chapters.includes(Number(chapter)) && !suggestions.includes(Number(chapter)));
  return <View style={{ flex: 1, backgroundColor: '#0F0F1A', padding: 24, gap: 12 }}>
    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 18 }}>{novel.title}</Text>
    <Text style={{ color: '#CCCCCC' }}>{chapters.length} offline · Atual {current} · Total {service.maximum ?? '--'}</Text>
    {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando downloads" /> : null}
    {query.isError ? <ErrorMessage message={query.error.message} onRetry={() => { void query.refetch(); }} /> : null}
    <Button title="Baixar intervalo" disabled={range.isPending || pending.length > 0 || remove.isPending || query.isPending} onPress={openRange} />
    {rangeError && !rangeVisible ? <ErrorMessage message={rangeError} /> : null}
    {progress ? <View style={{ gap: 8 }}>
      <Text style={{ color: '#CCCCCC' }}>Baixando {progress.done}/{progress.total}</Text>
      <ProgressBar current={progress.done} total={progress.total} label="Progresso dos downloads" />
    </View> : null}
    {suggestions.length ? <View style={{ gap: 8 }}><Text style={{ color: '#FFFFFF' }}>Próximos capítulos</Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>{suggestions.map(chapter => <View key={chapter}>
        <Button title={`Baixar cap. ${chapter}`} busy={pendingChapters.has(chapter)} disabled={range.isPending} onPress={() => { if (!pendingChapters.has(chapter)) download.mutate(chapter); }} />
        {errors[chapter] ? <ErrorMessage message={errors[chapter] ?? ''} /> : null}
      </View>)}</ScrollView>
    </View> : null}
    <Text accessibilityRole="header" style={{ color: '#FFFFFF' }}>Capítulos offline</Text>
    <FlatList data={chapters} keyExtractor={String} renderItem={({ item }) => <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text style={{ color: '#CCCCCC' }}>Capítulo {item}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={`Ler cap. ${item}`} onPress={() => onRead(item)} />
        <Button title={`Ouvir cap. ${item}`} onPress={() => onListen(item)} />
        <Button title={`Remover cap. ${item}`} disabled={pendingChapters.has(item) || remove.isPending || range.isPending} onPress={() => { remove.reset(); setDeleting(item); }} />
      </View>
      {errors[item] ? <ErrorMessage message={errors[item] ?? ''} /> : null}
    </View>} ListFooterComponent={<View style={{ gap: 8 }}>{otherErrors.map(([chapter, message]) => <ErrorMessage key={chapter} message={`Capítulo ${chapter}: ${message}`} />)}</View>} ListEmptyComponent={!query.isPending ? <Text style={{ color: '#CCCCCC' }}>Nenhum capítulo baixado.</Text> : undefined} />
    <Dialog title="Baixar intervalo" closeTitle="Cancelar" visible={rangeVisible} onClose={() => setRangeVisible(false)}>
      <TextInput accessibilityLabel="Capítulo inicial" keyboardType="number-pad" selectTextOnFocus value={rangeStart}
        onChangeText={value => { setRangeError(''); setRangeStart(value.replace(/[^0-9]/g, '')); }} style={{ color: '#FFFFFF', minHeight: 44 }} />
      <Text style={{ color: '#CCCCCC' }}>até</Text>
      <TextInput accessibilityLabel="Capítulo final" keyboardType="number-pad" selectTextOnFocus value={rangeEnd}
        onChangeText={value => { setRangeError(''); setRangeEnd(value.replace(/[^0-9]/g, '')); }} style={{ color: '#FFFFFF', minHeight: 44 }} />
      {rangeError ? <ErrorMessage message={rangeError} /> : null}
      <Text style={{ color: '#CCCCCC' }}>Máximo de 50 capítulos por vez.</Text>
      <Button title="Baixar" onPress={submitRange} />
    </Dialog>
    <Dialog title="Remover capítulo" closeTitle="Cancelar" visible={deleting !== null} onClose={() => setDeleting(null)}>
      <Text style={{ color: '#CCCCCC' }}>O arquivo offline será apagado. Pode ser baixado novamente depois.</Text>
      {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
      <Button title="Remover" busy={remove.isPending} onPress={() => { if (deleting !== null) remove.mutate(deleting, { onSuccess: () => setDeleting(null) }); }} />
    </Dialog>
  </View>;
}
