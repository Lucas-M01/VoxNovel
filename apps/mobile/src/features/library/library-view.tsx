import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novel } from '@core/api/schemas';
import { useConnectivity } from '@core/connectivity';
import { readerServices, type ReaderServices } from '@features/reader/reader-data';
import { deleteLibraryNovel, libraryOptions } from '@features/library/library-data';
import { NovelCard } from '@features/library/novel-card';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { presentation as styles } from '@ui/presentation';

type Props = { services?: ReaderServices; onOpen: (novel: Novel) => void; onSearch: () => void; onFilters: () => void };
export function LibraryView({ services = readerServices, onOpen, onSearch, onFilters }: Props) {
  const client = useQueryClient(); const connectivity = useConnectivity();
  const query = useQuery(libraryOptions(services));
  const [deleting, setDeleting] = useState<Novel | null>(null);
  const remove = useMutation({ mutationFn: (novel: Novel) => deleteLibraryNovel(client, novel, services), onSuccess: () => setDeleting(null) });
  const offline = connectivity === 'offline' || query.data?.offline === true;
  const novels = [...(query.data?.novels ?? [])].sort((a, b) => b.current_chapter - a.current_chapter);
  return <View style={styles.page}>
    <FlatList data={novels} keyExtractor={novel => novel.id} contentContainerStyle={styles.content} refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); void client.invalidateQueries({ queryKey: ['library-offline'] }); }}
      ListHeaderComponent={<View style={{ gap: 16, marginBottom: 20 }}>
        <Text style={styles.subtitle}>VOXNOVEL</Text><Text accessibilityRole="header" style={styles.title}>Sua biblioteca</Text>
        <Text style={styles.subtitle}>Suas histórias, no seu ritmo.</Text>
        <View style={styles.row}><Button title="Adicionar obra" onPress={onSearch} /><Button title="Filtros" onPress={onFilters} /></View>
        {offline ? <Text style={styles.subtitle}>Offline · exibindo a biblioteca salva no aparelho.</Text> : null}
        {query.isPending ? <ActivityIndicator accessibilityLabel="Carregando biblioteca" /> : null}
        {query.error ? <ErrorMessage message={query.error.message} onRetry={() => { void query.refetch(); }} /> : null}
      </View>}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      renderItem={({ item }) => <NovelCard novel={item} services={services} offline={offline} onOpen={() => onOpen(item)} onRemove={() => { remove.reset(); setDeleting(item); }} />}
      ListEmptyComponent={!query.isPending && !query.isError ? <View style={styles.card}><Text style={styles.heading}>Sua próxima história começa aqui</Text><Text style={styles.subtitle}>Adicione uma obra pelo nome ou pela URL para começar a ler e ouvir.</Text></View> : undefined} />
    <Dialog title="Remover obra" visible={deleting !== null} closeTitle="Cancelar" onClose={() => setDeleting(null)}>
      <Text style={styles.text}>Remover {deleting?.title}? As fontes e o progresso serão apagados.</Text>
      {remove.error ? <ErrorMessage message={remove.error.message} /> : null}
      <Button title="Confirmar remoção" busy={remove.isPending} disabled={offline} onPress={() => { if (deleting) remove.mutate(deleting); }} />
    </Dialog>
  </View>;
}
