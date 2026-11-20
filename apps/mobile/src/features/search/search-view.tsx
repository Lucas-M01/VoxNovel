import { useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { novelResources } from '@core/api/novels';
import { apiQueries } from '@core/queries';
import { httpResource, type HttpResource } from '@core/http-resource';
import { keys } from '@core/keys';
import type { Novel } from '@core/api/schemas';
import { findDuplicate, initialMetadataChapter, saveSearchSelection, startingChapterSchema, type Metadata } from '@features/search/search-service';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { colors, presentation as styles } from '@ui/presentation';

type Draft = { selected: Metadata[]; existing?: Novel };
type Props = { onOpen: (novel: Novel) => void; request?: HttpResource; existing?: Novel | undefined };
export function SearchView({ onOpen, request = httpResource, existing }: Props) {
  const client = useQueryClient();
  const [mode, setMode] = useState<'name' | 'url'>('name');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Metadata[] | null>(null);
  const [selected, setSelected] = useState<Metadata[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [duplicate, setDuplicate] = useState<{ novel: Novel; selected: Metadata[] } | null>(null);
  const [chapter, setChapter] = useState('1');
  const [error, setError] = useState('');
  const search = useMutation({ mutationFn: async () => {
    const value = input.trim(); if (!value) throw new Error(mode === 'name' ? 'Digite o nome da obra antes de continuar.' : 'Cole a URL da novel antes de continuar.');
    if (mode === 'url' && !z.httpUrl().safeParse(value).success) throw new Error('Confira a URL informada.');
    const queries = apiQueries(request);
    return mode === 'name' ? (await client.fetchQuery({ ...queries.search(value), staleTime: 0 })).results : [await client.fetchQuery({ ...queries.identify(value), staleTime: 0 })];
  }, onSuccess: data => { setResults(data); setSelected([]); }, onError: failure => setError(failure.message) });
  const inspect = useMutation({ mutationFn: async () => {
    const first = selected[0]; if (!first) throw new Error('Selecione ao menos uma fonte.');
    const initialChapter = mode === 'url' ? initialMetadataChapter(first, input) : 1;
    return { found: existing ?? findDuplicate(await novelResources(request).list(), first), initialChapter };
  }, onSuccess: ({ found, initialChapter }) => {
    if (found && !existing) setDuplicate({ novel: found, selected });
    else { setDraft(found ? { selected, existing: found } : { selected }); setChapter(String(found?.current_chapter ?? initialChapter)); }
  }, onError: failure => setError(failure.message) });
  const save = useMutation({ mutationFn: async () => {
    if (!draft) throw new Error('Selecione uma fonte.');
    const parsed = startingChapterSchema.safeParse(chapter);
    if (!parsed.success) throw new Error('Capítulo inválido.');
    return saveSearchSelection(request, draft.selected, parsed.data, draft.existing);
  }, onSuccess: async result => {
    client.setQueryData(keys.novel(result.novel.id), result.novel);
    await Promise.all([client.invalidateQueries({ queryKey: keys.novels() }), client.invalidateQueries({ queryKey: keys.library() })]);
    if (!result.failedProviders.length) onOpen(result.novel);
  }, onError: failure => setError(failure.message) });
  const busy = search.isPending || inspect.isPending || save.isPending;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>{existing ? 'Adicionar fonte' : 'Nova obra'}</Text>
    <Text style={styles.subtitle}>Encontre sua próxima leitura pelo nome ou pelo endereço da obra.</Text>
    {!draft ? <>
      <View style={styles.row}><Button title="Por nome" selected={mode === 'name'} disabled={busy} onPress={() => { setMode('name'); setResults(null); setSelected([]); setError(''); }} /><Button title="Por URL" selected={mode === 'url'} disabled={busy} onPress={() => { setMode('url'); setResults(null); setSelected([]); setError(''); }} /></View>
      <TextInput accessibilityLabel={mode === 'name' ? 'Nome da obra' : 'URL da obra'} placeholder={mode === 'name' ? 'Nome da obra' : 'https://…'} placeholderTextColor={colors.muted} style={styles.input} value={input} onChangeText={setInput} autoCapitalize="none" editable={!busy} keyboardType={mode === 'url' ? 'url' : 'default'} onSubmitEditing={() => { if (!busy) { setError(''); search.mutate(); } }} />
      <Button title="Buscar" busy={search.isPending} disabled={busy} onPress={() => { setResults(null); setSelected([]); setError(''); search.mutate(); }} />
      {results?.length === 0 ? <Text style={styles.subtitle}>Nenhuma fonte encontrada.</Text> : null}
      {results?.map(meta => <View key={`${meta.provider}:${meta.url_base}`} style={styles.card}>
        <View style={styles.row}>{meta.image_url ? <Image source={{ uri: meta.image_url }} style={styles.cover} accessibilityLabel={`Capa de ${meta.title}`} /> : null}<View style={{ flex: 1 }}><Text style={styles.heading}>{meta.title}</Text><Text style={styles.subtitle}>{meta.provider} · {meta.total_chapters ?? '--'} capítulos</Text></View></View>
        {meta.authors.length ? <Text style={styles.subtitle}>{meta.authors.join(', ')}</Text> : null}
        {meta.rating ? <Text style={styles.subtitle}>Avaliação: {meta.rating}</Text> : null}
        {meta.genres.length ? <Text style={styles.subtitle}>{meta.genres.join(' · ')}</Text> : null}
        <Button title={`Selecionar ${meta.provider}`} selected={selected.includes(meta)} disabled={busy} onPress={() => setSelected(previous => previous.includes(meta) ? previous.filter(item => item !== meta) : [...previous, meta])} />
      </View>)}
      {results?.length ? <Button title="Continuar" busy={inspect.isPending} disabled={!selected.length || busy} onPress={() => { setError(''); inspect.mutate(); }} /> : null}
    </> : <View style={styles.card}>
      <Text style={styles.heading}>{draft.selected[0]?.title}</Text>
      <Text style={styles.subtitle}>{draft.selected.map(meta => meta.provider).join(' · ')}</Text>
      <Text style={styles.text}>Capítulo inicial</Text>
      <TextInput accessibilityLabel="Capítulo inicial" value={chapter} onChangeText={setChapter} keyboardType="number-pad" style={styles.input} editable={!busy && !save.isSuccess} />
      {!save.isSuccess ? <><Button title="Iniciar leitura" busy={save.isPending} disabled={busy} onPress={() => { setError(''); save.mutate(); }} /><Button title="Voltar à busca" disabled={busy} onPress={() => { setDraft(null); setError(''); save.reset(); }} /></> : null}
    </View>}
    {save.data?.failedProviders.length ? <View style={styles.card}><ErrorMessage message={`Obra salva. Não foi possível adicionar: ${save.data.failedProviders.join(', ')}.`} /><Button title="Abrir obra salva" onPress={() => { if (save.data) onOpen(save.data.novel); }} /></View> : null}
    {error ? <ErrorMessage message={error} /> : null}
    <Dialog title="Obra já adicionada" visible={duplicate !== null} onClose={() => setDuplicate(null)}>
      <Text style={styles.text}>{duplicate?.novel.title} já está na biblioteca.</Text>
      <Button title="Abrir obra existente" onPress={() => { if (duplicate) onOpen(duplicate.novel); }} />
      <Button title="Adicionar fonte à obra" disabled={duplicate?.novel.sources.some(source => source.provider === duplicate.selected[0]?.provider) ?? true} onPress={() => { if (duplicate) { setDraft({ selected: duplicate.selected, existing: duplicate.novel }); setChapter(String(duplicate.novel.current_chapter)); setDuplicate(null); } }} />
    </Dialog>
  </ScrollView>;
}
