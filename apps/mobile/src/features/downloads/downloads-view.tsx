import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { colors, presentation } from '@ui/presentation';

type Props = { novel: Novel; services?: ReaderServices | undefined; onRead: (chapter: number) => void; onListen: (chapter: number) => void; onBack?: (() => void) | undefined };
export function DownloadsView({ novel, services = readerServices, onRead, onListen, onBack }: Props) {
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
  return <View style={[presentation.page, styles.content]}>
    <View style={styles.header}>
      {onBack ? <Button title="Voltar" icon="arrow-left" iconOnly variant="quiet" onPress={onBack} /> : null}
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>{novel.title}</Text>
        <Text style={presentation.subtitle}>Downloads · {novel.sources.find(source => source.id === service.scope.sourceId)?.provider}</Text>
      </View>
      <Button title="Baixar intervalo" caption="Faixa" icon="download-multiple" iconSize={16} iconColor="#81C784" labelStyle={styles.green} disabled={range.isPending || pending.length > 0 || remove.isPending || query.isPending} onPress={openRange} />
    </View>
    <FlatList data={chapters} numColumns={3} style={styles.list} columnWrapperStyle={styles.columns} keyExtractor={String}
      ListHeaderComponent={<View style={styles.listHeader}>
        <View style={styles.summary}>
          {[{ label: 'Offline', value: chapters.length }, { label: 'Atual', value: current }, { label: 'Total', value: service.maximum ?? '--' }].map(({ label, value }) => <View key={label} style={styles.summaryItem}>
            <Text style={styles.number}>{value}</Text><Text style={presentation.subtitle}>{label}</Text>
          </View>)}
        </View>
        {query.isPending ? <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando downloads" /> : null}
        {query.isError ? <ErrorMessage message={query.error.message} onRetry={() => { void query.refetch(); }} /> : null}
        {rangeError && !rangeVisible ? <ErrorMessage message={rangeError} /> : null}
        {progress ? <View style={{ gap: 8 }}>
          <Text style={{ color: '#CCCCCC' }}>Baixando {progress.done}/{progress.total}</Text>
          <ProgressBar current={progress.done} total={progress.total} label="Progresso dos downloads" />
        </View> : null}
        {suggestions.length ? <View style={{ gap: 8 }}><Text style={styles.section}>Próximos capítulos</Text>
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>{suggestions.map(chapter => <View key={chapter}>
            <Button title={`Baixar cap. ${chapter}`} caption={`Cap. ${chapter}`} icon="download-outline" iconSize={14} iconColor="#81C784" labelStyle={styles.green} busy={pendingChapters.has(chapter)} disabled={range.isPending} onPress={() => { if (!pendingChapters.has(chapter)) download.mutate(chapter); }} />
            {errors[chapter] ? <ErrorMessage message={errors[chapter] ?? ''} /> : null}
          </View>)}</ScrollView>
        </View> : null}
        <Text accessibilityRole="header" style={styles.section}>Capítulos offline</Text>
      </View>} renderItem={({ item }) => <View style={styles.cell}><View style={[styles.chapter, item === current && styles.current]}>
      <Text style={styles.chapterLabel}>Capítulo</Text>
      <Text style={styles.number}>{item}</Text>
      <View style={styles.chapterActions}>
        <Button title={`Ler cap. ${item}`} icon="book-open-outline" iconSize={16} iconColor="#4FC3F7" iconOnly variant="quiet" style={styles.action} onPress={() => onRead(item)} />
        <Button title={`Ouvir cap. ${item}`} icon="headphones" iconSize={16} iconColor="#A9A3FF" iconOnly variant="quiet" style={styles.action} onPress={() => onListen(item)} />
        <Button title={`Remover cap. ${item}`} icon="trash-can-outline" iconSize={16} iconColor="#FF7777" iconOnly variant="quiet" style={styles.action} disabled={pendingChapters.has(item) || remove.isPending || range.isPending} onPress={() => { remove.reset(); setDeleting(item); }} />
      </View>
      {errors[item] ? <ErrorMessage message={errors[item] ?? ''} /> : null}
    </View></View>} ListFooterComponent={<View style={{ gap: 8 }}>{otherErrors.map(([chapter, message]) => <ErrorMessage key={chapter} message={`Capítulo ${chapter}: ${message}`} />)}</View>} ListEmptyComponent={!query.isPending ? <Text style={styles.empty}>Nenhum capítulo baixado.</Text> : undefined} />
    <Dialog title="Baixar intervalo" closeTitle="Cancelar" visible={rangeVisible} onClose={() => setRangeVisible(false)}
      confirm={{ title: 'Baixar', variant: 'primary', onPress: submitRange }}>
      <TextInput accessibilityLabel="Capítulo inicial" keyboardType="number-pad" selectTextOnFocus value={rangeStart}
        onChangeText={value => { setRangeError(''); setRangeStart(value.replace(/[^0-9]/g, '')); }} style={presentation.input} />
      <Text style={{ color: '#CCCCCC' }}>até</Text>
      <TextInput accessibilityLabel="Capítulo final" keyboardType="number-pad" selectTextOnFocus value={rangeEnd}
        onChangeText={value => { setRangeError(''); setRangeEnd(value.replace(/[^0-9]/g, '')); }} style={presentation.input} />
      {rangeError ? <ErrorMessage message={rangeError} /> : null}
      <Text style={{ color: '#CCCCCC' }}>Máximo de 50 capítulos por vez.</Text>
    </Dialog>
    <Dialog title="Remover capítulo" closeTitle="Cancelar" visible={deleting !== null} onClose={() => setDeleting(null)}
      confirm={{ title: 'Remover', variant: 'danger', busy: remove.isPending, onPress: () => { if (deleting !== null) remove.mutate(deleting, { onSuccess: () => setDeleting(null) }); } }}>
      <Text style={{ color: '#CCCCCC' }}>O arquivo offline será apagado. Pode ser baixado novamente depois.</Text>
      {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
    </Dialog>
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  green: { color: '#81C784' },
  summary: { flexDirection: 'row', paddingVertical: 12, backgroundColor: colors.surface, borderRadius: 12 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  number: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  section: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  listHeader: { gap: 12, paddingBottom: 10, paddingHorizontal: 4 },
  list: { marginHorizontal: -4 },
  columns: { marginBottom: 8 },
  cell: { width: '33.333%', paddingHorizontal: 4 },
  chapter: { flex: 1, minHeight: 110, borderRadius: 10, backgroundColor: '#16162A', padding: 8, borderWidth: 1, borderColor: colors.border },
  current: { backgroundColor: '#191936', borderColor: '#6C63FF66' },
  chapterLabel: { color: colors.muted, fontSize: 10, textTransform: 'uppercase' },
  chapterActions: { flexDirection: 'row', marginTop: 'auto' },
  action: { flex: 1, minWidth: 0, paddingHorizontal: 0 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30 },
});
