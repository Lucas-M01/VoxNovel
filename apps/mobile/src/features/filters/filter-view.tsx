import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FilterKind } from '@core/api/schemas';
import { httpResource, type HttpResource } from '@core/http-resource';
import { apiQueries, apiMutations } from '@core/queries';
import { filterInputSchema } from '@features/filters/filter-input';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { colors, presentation } from '@ui/presentation';

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
  return <View style={[presentation.page, styles.content]}>
    <Text accessibilityRole="header" style={presentation.title}>🚫 Filtros</Text>
    <Text style={presentation.subtitle}>Linhas que correspondem aos filtros serão ignoradas na leitura.</Text>
    <View style={styles.tabs}>{types.map(type => <Button key={type.kind} title={type.label} style={styles.flex} selected={kind === type.kind} disabled={pending} onPress={() => { setKind(type.kind); setValidation(''); add.reset(); }} />)}</View>
    <View style={styles.addRow}>
      <TextInput accessibilityLabel="Novo filtro" placeholder={type?.placeholder} placeholderTextColor={colors.muted} value={value} editable={!pending} autoCapitalize="none" autoCorrect={kind !== 'regex'} onChangeText={value => { setValue(value); setValidation(''); add.reset(); }} onSubmitEditing={submit} style={[presentation.input, styles.flex]} />
      <Button title="Adicionar filtro" caption="+" variant="primary" labelStyle={styles.addLabel} busy={add.isPending} disabled={pending && !add.isPending} onPress={submit} />
    </View>
    {validation ? <ErrorMessage message={validation} /> : null}
    {operationError ? <ErrorMessage message={operationError.message} /> : null}
    {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando filtros" /> : null}
    {query.isError ? <ErrorMessage message={query.error.message} onRetry={() => { void query.refetch(); }} /> : null}
    <FlatList data={rows} keyboardShouldPersistTaps="handled" keyExtractor={row => `${row.kind}:${row.value}`} renderItem={({ item }) => <View style={styles.item}>
      <View style={styles.flex}><Text style={styles.kind}>{item.label}</Text><Text style={presentation.text}>{item.value}</Text></View>
      <Button title={`Remover ${item.label.toLowerCase()}: ${item.value}`} caption="×" variant="quiet" labelStyle={styles.removeLabel} disabled={pending} onPress={() => remove.mutate({ kind: item.kind, value: item.value })} />
    </View>} ListEmptyComponent={!query.isPending && !query.isError ? <Text style={styles.empty}>Nenhum filtro configurado.</Text> : undefined} />
    <Button title="Limpar todos" variant="danger" disabled={pending || query.isPending} onPress={() => { clear.reset(); setConfirmation(true); }} />
    <Dialog title="Limpar filtros" closeTitle="Cancelar" visible={confirmation} onClose={() => setConfirmation(false)}
      confirm={{ title: 'Limpar', variant: 'danger', busy: clear.isPending, onPress: () => clear.mutate(undefined, { onSuccess: () => setConfirmation(false) }) }}>
      <Text style={{ color: '#CCCCCC' }}>Deseja remover todos os filtros?</Text>
    </Dialog>
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  addLabel: { fontSize: 24, lineHeight: 26, minWidth: 26 },
  item: { backgroundColor: colors.surface, borderRadius: 10, paddingLeft: 14, paddingVertical: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  kind: { color: '#A9A3FF', fontSize: 11, textTransform: 'uppercase' },
  removeLabel: { color: '#FF7777', fontSize: 20 },
  empty: { color: colors.muted, marginTop: 40, textAlign: 'center' },
});
