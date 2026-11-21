import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectivity } from '@core/connectivity';
import { keys } from '@core/keys';
import NovelEntryScreen from '@screens/novel-entry-screen';
import SearchScreen from '@screens/search-screen';
import { ErrorMessage } from '@ui/error-message';

export default function SearchRoute() {
  const params = useLocalSearchParams(); const router = useRouter(); const client = useQueryClient(); const connectivity = useConnectivity();
  if (connectivity === 'offline') return <ErrorMessage message="Conecte-se à internet para buscar e adicionar obras." />;
  if (params.id !== undefined) return <NovelEntryScreen destination="source" />;
  return <SearchScreen onOpen={novel => { client.setQueryData(keys.novel(novel.id), novel); router.replace({ pathname: '/speech', params: { id: novel.id } }); }} />;
}
