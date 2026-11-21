import { keys } from '@core/keys';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { useConnectivity } from '@core/connectivity';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { deleteLibraryNovel, libraryOptions } from '@features/library/library-data';
import { LibraryPreferences } from '@features/library/library-preferences';
import { Icon } from '@ui/icon';
import { NovelCard } from '@features/library/novel-card';
import { Button } from '@ui/button';
import { LoadingMessage } from '@ui/loading-message';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { colors, presentation } from '@ui/presentation';

type Props = { services?: ReaderServices; onOpen: (novel: Novel) => void; onSearch: () => void; onFilters: () => void };
export function LibraryView({ services = readerServices, onOpen, onSearch, onFilters }: Props) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const columns = landscape ? 1 : 2;
  const client = useQueryClient(); const connectivity = useConnectivity();
  const query = useQuery(libraryOptions(services));
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [deleting, setDeleting] = useState<Novel | null>(null);
  const remove = useMutation({ mutationFn: (novel: Novel) => deleteLibraryNovel(client, novel, services), onSuccess: () => setDeleting(null) });
  const offline = connectivity === 'offline' || query.data?.offline === true;
  const novels = [...(query.data?.novels ?? [])].sort((a, b) => b.current_chapter - a.current_chapter);
  const first = novels[0];
  function refresh() {
    void query.refetch();
    void client.invalidateQueries({ queryKey: keys.localChapterLists() });
  }
  if (query.isPending) return <LoadingMessage message="Carregando obras…" />;
  return <View style={styles.page}>
    <View style={[styles.header, landscape && styles.landscapeHeader]}>
      <Text accessibilityRole="header" style={styles.title}>📚 Obras</Text>
      <Text style={styles.count}>{novels.length} {novels.length === 1 ? 'obra' : 'obras'}</Text>
      <Button title="Filtros" style={styles.filter} onPress={onFilters} />
      <Button title="Preferências" icon="cog-outline" iconOnly variant="quiet" onPress={() => setPreferencesVisible(true)} />
    </View>
    {offline ? <View style={styles.offline}>
      <Text style={[styles.offlineText, { flex: 1 }]}>Offline · exibindo a biblioteca salva no aparelho.</Text>
      <Pressable accessibilityRole="button" onPress={refresh}><Text style={styles.offlineText}>Atualizar</Text></Pressable>
    </View> : null}
    {query.error ? <ErrorMessage message={query.error.message} onRetry={refresh} /> : null}
    {first ? <Pressable accessibilityRole="button" accessibilityLabel={`Continuar leitura de ${first.title}`} style={[styles.continueCard, landscape && styles.landscapeContinue]} onPress={() => onOpen(first)}>
      <Icon name="book-open-variant" size={24} />
      <View style={styles.continueInfo}>
        <Text style={styles.continueLabel}>Continuar leitura</Text>
        <Text numberOfLines={1} style={styles.continueTitle}>{first.title}</Text>
      </View>
      <Icon name="chevron-right" size={22} />
    </Pressable> : null}
    <FlatList key={columns} data={novels} numColumns={columns} keyExtractor={novel => novel.id} style={styles.list} contentContainerStyle={styles.listContent}
      columnWrapperStyle={landscape ? undefined : styles.columns} refreshing={query.isRefetching} onRefresh={refresh}
      renderItem={({ item }) => <NovelCard novel={item} landscape={landscape} services={services} offline={offline} onOpen={() => onOpen(item)} onRemove={() => { remove.reset(); setDeleting(item); }} />}
      ListEmptyComponent={!query.isError ? <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>Nenhuma obra ainda</Text>
        <Text style={styles.count}>Toque em “Nova Obra” para começar</Text>
      </View> : undefined} />
    <Button title="Adicionar obra" caption="+ Nova Obra" variant="primary" style={[styles.add, landscape && styles.landscapeAdd]} labelStyle={styles.addText} onPress={onSearch} />
    <LibraryPreferences storage={services.storage} visible={preferencesVisible} onClose={() => setPreferencesVisible(false)} />
    <Dialog title="Remover obra" visible={deleting !== null} closeTitle="Cancelar" onClose={() => setDeleting(null)}
      confirm={{ title: 'Confirmar remoção', variant: 'danger', busy: remove.isPending, disabled: offline, onPress: () => { if (deleting) remove.mutate(deleting); } }}>
      <Text style={presentation.text}>Remover {deleting?.title}? As fontes e o progresso serão apagados.</Text>
      {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
    </Dialog>
  </View>;
}

const styles = StyleSheet.create({
  page: { ...presentation.page, paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 16 },
  landscapeHeader: { marginTop: 4, marginBottom: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: 'bold', flex: 1 },
  count: { color: colors.muted, fontSize: 13 },
  filter: { backgroundColor: 'transparent', minHeight: 44, padding: 8 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#251F1A', padding: 10, borderRadius: 8, marginBottom: 12 },
  offlineText: { color: '#FFB74D', fontSize: 12 },
  continueCard: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  landscapeContinue: { paddingVertical: 8, marginBottom: 8 },
  continueInfo: { flex: 1 },
  continueLabel: { color: '#EAE8FF', fontSize: 12 },
  continueTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  list: { marginHorizontal: -6 },
  listContent: { paddingBottom: 4 },
  columns: { marginBottom: 12 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { color: colors.muted, fontSize: 16, fontWeight: 'bold' },
  add: { padding: 16, borderRadius: 12, marginTop: 4 },
  landscapeAdd: { paddingVertical: 8 },
  addText: { fontSize: 16, fontWeight: 'bold' },
});
