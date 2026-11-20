import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { novelResources } from '@core/api/novels';
import { activeSource } from '@core/chapter-source';
import { initialSpeechChapter } from '@core/initial-speech-chapter';
import { useConnectivity } from '@core/connectivity';
import type { Novel } from '@core/api/schemas';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { startingChapterSchema } from '@features/search/search-service';
import { detailOptions, rememberNovel } from '@features/detail/detail-data';
import { deleteLibraryNovel } from '@features/library/library-data';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { ProgressBar } from '@ui/progress-bar';
import { presentation as styles } from '@ui/presentation';

type Destination = 'reading' | 'speech' | 'downloads';
type Props = { id: string; services?: ReaderServices; onNavigate: (destination: Destination, novel: Novel) => void; onAddSource: (novel: Novel) => void; onDeleted: () => void };
type Change = { kind: 'progress'; chapter: number } | { kind: 'activate' | 'remove'; sourceId: string };
export function DetailView({ id, services = readerServices, onNavigate, onAddSource, onDeleted }: Props) {
  const client = useQueryClient(); const connectivity = useConnectivity();
  const query = useQuery(detailOptions(id, services));
  const [chapter, setChapter] = useState<string | null>(null);
  const [inputError, setInputError] = useState('');
  const [confirmation, setConfirmation] = useState<{ sourceId: string; provider: string } | 'novel' | null>(null);
  const resources = novelResources(services.request);
  const change = useMutation({ mutationFn: async (input: Change) => {
    if (connectivity === 'offline') throw new Error('Conecte-se à internet para alterar a obra.');
    if (input.kind === 'progress') return resources.progress(id, input.chapter);
    if (input.kind === 'activate') return resources.activateSource(id, input.sourceId);
    if ((query.data?.sources.length ?? 0) <= 1) throw new Error('A última fonte não pode ser removida.');
    return resources.removeSource(id, input.sourceId);
  }, onSuccess: async novel => { await rememberNovel(client, novel, services); setChapter(null); setConfirmation(null); } });
  const remove = useMutation({ mutationFn: async () => { if (query.data) await deleteLibraryNovel(client, query.data, services); }, onSuccess: onDeleted });
  if (query.isPending) return <View style={styles.page}><ActivityIndicator accessibilityLabel="Carregando obra" /></View>;
  if (!query.data) return <View style={[styles.page, styles.content]}><ErrorMessage message={query.error?.message ?? 'Obra não encontrada.'} onRetry={() => { void query.refetch(); }} /></View>;
  const novel = query.data; const source = activeSource(novel); const current = initialSpeechChapter(novel);
  const maximum = novel.total_chapters ?? source?.total_chapters ?? source?.chapter_ids?.length ?? null;
  const offline = connectivity === 'offline'; const busy = change.isPending || remove.isPending;
  const saveProgress = () => {
    const parsed = startingChapterSchema.safeParse(chapter);
    if (!parsed.success || (maximum !== null && parsed.data > maximum)) { setInputError(maximum ? `Informe um capítulo entre 1 e ${maximum}.` : 'Capítulo inválido.'); return; }
    setInputError(''); change.mutate({ kind: 'progress', chapter: parsed.data });
  };
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.row}>{novel.image_url ? <Image source={{ uri: novel.image_url }} style={[styles.cover, { width: 112, height: 156 }]} accessibilityLabel={`Capa de ${novel.title}`} /> : null}
      <View style={{ flex: 1, gap: 12 }}><Text style={styles.subtitle}>{source?.provider ?? 'Sem fonte'}</Text><Text accessibilityRole="header" style={styles.title}>{novel.title}</Text><Text style={styles.text}>Capítulo {current}{maximum ? ` de ${maximum}` : ''}</Text></View>
    </View>
    {maximum ? <ProgressBar label="Progresso da obra" current={current} total={maximum} /> : null}
    {offline ? <Text style={styles.subtitle}>Offline · leitura disponível para capítulos baixados.</Text> : null}
    <View style={styles.row}><Button title="Continuar leitura" onPress={() => onNavigate('reading', novel)} /><Button title="Ouvir obra" onPress={() => onNavigate('speech', novel)} /><Button title="Downloads" onPress={() => onNavigate('downloads', novel)} /></View>
    <View style={styles.card}><Text style={styles.heading}>Seu progresso</Text>
      {chapter === null ? <Button title="Editar capítulo" disabled={offline || busy} onPress={() => { setChapter(String(current)); setInputError(''); change.reset(); }} /> : <>
        <TextInput accessibilityLabel="Novo capítulo" keyboardType="number-pad" style={styles.input} value={chapter} onChangeText={setChapter} editable={!busy} />
        <Button title="Salvar capítulo" busy={change.isPending} disabled={offline || busy} onPress={saveProgress} /><Button title="Cancelar edição" disabled={busy} onPress={() => setChapter(null)} />
        {inputError ? <ErrorMessage message={inputError} /> : null}
      </>}
    </View>
    <View style={{ gap: 12 }}><Text accessibilityRole="header" style={styles.heading}>Fontes da obra</Text>
      {novel.sources.map(item => <View key={item.id} style={styles.card}><Text style={styles.heading}>{item.provider}{item.id === source?.id ? ' · Ativa' : ''}</Text><Text style={styles.subtitle}>Capítulo {item.current_chapter}{item.total_chapters ? ` de ${item.total_chapters}` : ''}</Text>
        <View style={styles.row}><Button title={`Usar ${item.provider}`} selected={item.id === source?.id} disabled={offline || busy || item.id === source?.id} onPress={() => { change.reset(); change.mutate({ kind: 'activate', sourceId: item.id }); }} />
          <Button title={`Remover fonte ${item.provider}`} disabled={offline || busy || novel.sources.length <= 1} onPress={() => { change.reset(); setConfirmation({ sourceId: item.id, provider: item.provider }); }} /></View>
      </View>)}
      <Button title="Adicionar fonte" disabled={offline || busy} onPress={() => onAddSource(novel)} />
    </View>
    {change.error ? <ErrorMessage message={change.error.message} /> : null}
    <Button title="Remover obra" disabled={offline || busy} onPress={() => { remove.reset(); setConfirmation('novel'); }} />
    <Dialog title={confirmation === 'novel' ? 'Remover obra' : 'Remover fonte'} visible={confirmation !== null} closeTitle="Cancelar" onClose={() => { if (!busy) setConfirmation(null); }}>
      <Text style={styles.text}>{confirmation === 'novel' ? 'As fontes e o progresso desta obra serão apagados.' : `Remover ${confirmation?.provider}? O progresso desta fonte será perdido.`}</Text>
      {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
      {change.error ? <ErrorMessage message={change.error.message} /> : null}
      <Button title="Confirmar remoção" busy={busy} disabled={offline} onPress={() => { if (confirmation === 'novel') remove.mutate(); else if (confirmation) change.mutate({ kind: 'remove', sourceId: confirmation.sourceId }); }} />
    </Dialog>
  </ScrollView>;
}
