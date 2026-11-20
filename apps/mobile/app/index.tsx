import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { keys } from '@core/keys';
import LibraryScreen from '@screens/library-screen';

export default function HomeRoute() {
  const router = useRouter(); const client = useQueryClient();
  useFocusEffect(useCallback(() => {
    void client.invalidateQueries({ queryKey: keys.library() });
    void client.invalidateQueries({ queryKey: ['library-offline'] });
  }, [client]));
  return <LibraryScreen onOpen={novel => { client.setQueryData(keys.novel(novel.id), novel); router.push({ pathname: '/detail', params: { id: novel.id } }); }} onSearch={() => router.push('/search')} onFilters={() => router.push('/filters')} />;
}
