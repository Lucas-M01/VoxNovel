import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, View } from 'react-native';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { chapterSchema, type Novel } from '@core/api/schemas';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { localChaptersOptions } from '@core/local-queries';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { createDownloadService } from '@features/downloads/download-service';
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
  const mutationKey = ['download-one', novel.id, service.scope.sourceId];
  const pending = useMutationState({ filters: { mutationKey, status: 'pending' }, select: mutation => mutation.state.variables });
  const pendingChapters = new Set(pending.flatMap(value => { const parsed = chapterSchema.safeParse(value); return parsed.success ? [parsed.data] : []; }));
  const download = useMutation({
    mutationKey, mutationFn: (chapter: number) => service.download(chapter),
    onSuccess: (_result, chapter) => setErrors(previous => { const next = { ...previous }; delete next[chapter]; return next; }),
    onError: (error, chapter) => setErrors(previous => ({ ...previous, [chapter]: error.message })),
  });
  const remove = useMutation({ mutationFn: (chapter: number) => service.remove(chapter), onError: (error, chapter) => setErrors(previous => ({ ...previous, [chapter]: error.message })) });
  const chapters = query.data ?? [];
  const current = initialSpeechChapter(novel);
  const suggestions = service.maximum === null ? [] : Array.from({ length: Math.max(0, Math.min(10, service.maximum - current + 1)) }, (_, index) => current + index).filter(chapter => !chapters.includes(chapter));
  return <View style={{ flex: 1, backgroundColor: '#0F0F1A', padding: 24, gap: 12 }}>
    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 18 }}>{novel.title}</Text>
    <Text style={{ color: '#CCCCCC' }}>{chapters.length} offline · Atual {current} · Total {service.maximum ?? '--'}</Text>
    {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando downloads" /> : null}
    {query.isError ? <ErrorMessage message={query.error.message} onRetry={() => { void query.refetch(); }} /> : null}
    {suggestions.length ? <View style={{ gap: 8 }}><Text style={{ color: '#FFFFFF' }}>Próximos capítulos</Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>{suggestions.map(chapter => <View key={chapter}>
        <Button title={`Baixar cap. ${chapter}`} busy={pendingChapters.has(chapter)} onPress={() => { if (!pendingChapters.has(chapter)) download.mutate(chapter); }} />
        {errors[chapter] ? <ErrorMessage message={errors[chapter] ?? ''} /> : null}
      </View>)}</ScrollView>
    </View> : null}
    <Text accessibilityRole="header" style={{ color: '#FFFFFF' }}>Capítulos offline</Text>
    <FlatList data={chapters} keyExtractor={String} renderItem={({ item }) => <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text style={{ color: '#CCCCCC' }}>Capítulo {item}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={`Ler cap. ${item}`} onPress={() => onRead(item)} />
        <Button title={`Ouvir cap. ${item}`} onPress={() => onListen(item)} />
        <Button title={`Remover cap. ${item}`} disabled={pendingChapters.has(item) || remove.isPending} onPress={() => { remove.reset(); setDeleting(item); }} />
      </View>
      {errors[item] ? <ErrorMessage message={errors[item] ?? ''} /> : null}
    </View>} ListEmptyComponent={!query.isPending ? <Text style={{ color: '#CCCCCC' }}>Nenhum capítulo baixado.</Text> : undefined} />
    <Dialog title="Remover capítulo" closeTitle="Cancelar" visible={deleting !== null} onClose={() => setDeleting(null)}>
      <Text style={{ color: '#CCCCCC' }}>O arquivo offline será apagado. Pode ser baixado novamente depois.</Text>
      {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
      <Button title="Remover" busy={remove.isPending} onPress={() => { if (deleting !== null) remove.mutate(deleting, { onSuccess: () => setDeleting(null) }); }} />
    </Dialog>
  </View>;
}
