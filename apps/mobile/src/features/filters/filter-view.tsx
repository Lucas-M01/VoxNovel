import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FilterKind } from '@core/api/schemas';
import { httpResource, type HttpResource } from '@core/http-resource';
import { apiQueries, apiMutations } from '@core/queries';
import { filterInputSchema } from '@features/filters/filter-input';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';

const types: { kind: FilterKind; label: string; placeholder: string }[] = [
  { kind: 'words', label: 'Palavra', placeholder: 'Adicionar palavra...' },
  { kind: 'phrases', label: 'Frase', placeholder: 'Adicionar frase...' },
  { kind: 'regex', label: 'Regex', placeholder: 'Adicionar expressão regular...' },
];
export function FilterView({ request = httpResource }: { request?: HttpResource | undefined }) {
  const client = useQueryClient();
  const query = useQuery({ ...apiQueries(request).filters(), networkMode: 'always' });
  const operations = apiMutations(client, request);
  const add = useMutation(operations.addFilter());
  const remove = useMutation(operations.removeFilter());
  const clear = useMutation(operations.clearFilters());
  const [kind, setKind] = useState<FilterKind>('words');
  const [value, setValue] = useState('');
  const [validation, setValidation] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const type = types.find(type => type.kind === kind);
  const rows = types.flatMap(type => (query.data?.[type.kind] ?? []).map(value => ({ ...type, value })));
  const pending = add.isPending || remove.isPending || clear.isPending;
  const operationError = add.error ?? remove.error ?? clear.error;
  function submit() {
    if (pending) return;
    const parsed = filterInputSchema.safeParse({ kind, value });
    if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? 'Confira o filtro.'); return; }
    setValidation('');
    add.mutate(parsed.data, { onSuccess: () => setValue('') });
  }
  return <View style={{ flex: 1, backgroundColor: '#0F0F1A', padding: 24, gap: 12 }}>
    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 18 }}>Filtros</Text>
    <Text style={{ color: '#CCCCCC' }}>Filtros globais de palavra, frase e regex.</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>{types.map(type => <Button key={type.kind} title={type.label} selected={kind === type.kind} disabled={pending} onPress={() => { setKind(type.kind); setValidation(''); add.reset(); }} />)}</View>
    <TextInput accessibilityLabel="Novo filtro" placeholder={type?.placeholder} placeholderTextColor="#888888" value={value} editable={!pending} autoCapitalize="none" autoCorrect={kind !== 'regex'} onChangeText={value => { setValue(value); setValidation(''); add.reset(); }} onSubmitEditing={submit} style={{ color: '#FFFFFF', padding: 12, borderWidth: 1, borderColor: '#888888' }} />
    <Button title="Adicionar filtro" busy={add.isPending} disabled={pending && !add.isPending} onPress={submit} />
    {validation ? <ErrorMessage message={validation} /> : null}
    {operationError ? <ErrorMessage message={operationError.message} /> : null}
    {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando filtros" /> : null}
    {query.isError ? <ErrorMessage message={query.error.message} onRetry={() => { void query.refetch(); }} /> : null}
    <FlatList data={rows} keyExtractor={row => `${row.kind}:${row.value}`} renderItem={({ item }) => <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text style={{ color: '#CCCCCC' }}>{item.label}: {item.value}</Text>
      <Button title={`Remover ${item.label.toLowerCase()}: ${item.value}`} disabled={pending} onPress={() => remove.mutate({ kind: item.kind, value: item.value })} />
    </View>} ListEmptyComponent={!query.isPending && !query.isError ? <Text style={{ color: '#CCCCCC' }}>Nenhum filtro configurado.</Text> : undefined} />
    <Button title="Limpar todos" disabled={pending || query.isPending} onPress={() => { clear.reset(); setConfirmation(true); }} />
    <Dialog title="Limpar filtros" closeTitle="Cancelar" visible={confirmation} onClose={() => setConfirmation(false)}>
      <Text style={{ color: '#CCCCCC' }}>Deseja remover todos os filtros?</Text>
      <Button title="Limpar" busy={clear.isPending} onPress={() => clear.mutate(undefined, { onSuccess: () => setConfirmation(false) })} />
    </Dialog>
  </View>;
}
